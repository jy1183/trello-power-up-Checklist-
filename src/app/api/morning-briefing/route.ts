import { NextResponse } from 'next/server';
import axios from 'axios';
import { GoogleGenAI } from '@google/genai';

const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
const TRELLO_API_TOKEN = process.env.TRELLO_API_TOKEN;
const TRELLO_WORKSPACE_ID = process.env.TRELLO_WORKSPACE_ID;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const TEAMS_WEBHOOK_URL = process.env.TEAMS_WEBHOOK_URL;

// Gemini API instance
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Helpers to calculate dates in KST
function getKSTDate(offsetDays = 0) {
    const date = new Date();
    // Convert to KST (UTC+9)
    date.setHours(date.getHours() + 9);
    date.setDate(date.getDate() + offsetDays);
    // Reset time to 00:00:00.000
    date.setUTCHours(0, 0, 0, 0);
    return date;
}

export async function GET(request: Request) {
    if (!TRELLO_API_KEY || !TRELLO_API_TOKEN || !TRELLO_WORKSPACE_ID || !GEMINI_API_KEY || !TEAMS_WEBHOOK_URL) {
        return NextResponse.json({ error: 'Missing environment variables' }, { status: 500 });
    }

    try {
        const todayKST = getKSTDate(0);
        const yesterdayKST = getKSTDate(-1);
        const tomorrowKST = getKSTDate(1);
        const dayAfterTomorrowKST = getKSTDate(2);

        // 1. Fetch Boards and Workspace Members
        const [boardsRes, membersRes] = await Promise.all([
            axios.get(`https://api.trello.com/1/organizations/${TRELLO_WORKSPACE_ID}/boards?key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}&fields=id,name`),
            axios.get(`https://api.trello.com/1/organizations/${TRELLO_WORKSPACE_ID}/members?key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}&fields=id,fullName,username`)
        ]);

        const boards = boardsRes.data;
        const workspaceMembers = membersRes.data || [];
        const membersMap = new Map<string, any>();
        workspaceMembers.forEach((m: any) => {
            membersMap.set(m.id, m);
        });

        // 2. Fetch Checklists and Actions for all boards
        // Actions: since yesterday KST
        const sinceISO = yesterdayKST.toISOString();
        const promises = boards.map((b: any) => Promise.all([
            axios.get(`https://api.trello.com/1/boards/${b.id}/cards?checklists=all&fields=id,name,shortUrl&key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}`),
            axios.get(`https://api.trello.com/1/boards/${b.id}/actions?filter=commentCard,updateCheckItemStateOnCard&since=${sinceISO}&key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}`)
        ]).catch(e => {
            console.error(`Error fetching data for board ${b.name}:`, e.message);
            return [{ data: [] }, { data: [] }];
        }));

        const results = await Promise.all(promises);

        const todayTasksByMember = new Map<string, any[]>();
        const tomorrowTasks: any[] = [];
        const incompleteYesterdayTasks: any[] = [];

        // Initialize todayTasksByMember for all workspace members to identify those with no tasks
        workspaceMembers.forEach((m: any) => {
            todayTasksByMember.set(m.id, []);
        });
        const unassignedTodayTasks: any[] = []; // For items with no member assigned

        let commentsToSummarize: string[] = [];
        const completedYesterdayTasks: string[] = [];

        results.forEach(([cardsRes, actionsRes]) => {
            // Process Actions
            actionsRes.data.forEach((action: any) => {
                const actionDate = new Date(action.date);
                // Convert actionDate to KST for date comparison
                const actionKST = new Date(actionDate.getTime() + 9 * 60 * 60 * 1000);
                
                // Only consider actions from exactly "yesterday"
                if (actionKST >= yesterdayKST && actionKST < todayKST) {
                    if (action.type === 'commentCard') {
                        const memberName = membersMap.get(action.idMemberCreator)?.fullName || 'Unknown';
                        commentsToSummarize.push(`${memberName}: ${action.data.text}`);
                    } else if (action.type === 'updateCheckItemStateOnCard' && action.data.checkItem.state === 'complete') {
                        completedYesterdayTasks.push(`[${action.data.card.name}] ${action.data.checkItem.name}`);
                    }
                }
            });

            // Process Checklists
            cardsRes.data.forEach((card: any) => {
                if (card.checklists) {
                    card.checklists.forEach((cl: any) => {
                        cl.checkItems.forEach((item: any) => {
                            if (item.due) {
                                // Assume item.due is UTC. Convert to KST to check date boundary
                                const dueUTC = new Date(item.due);
                                const dueKST = new Date(dueUTC.getTime() + 9 * 60 * 60 * 1000);

                                const taskData = {
                                    cardName: card.name,
                                    cardUrl: card.shortUrl,
                                    name: item.name,
                                    state: item.state,
                                    memberId: item.idMember
                                };

                                if (dueKST >= todayKST && dueKST < tomorrowKST) {
                                    // Today's task
                                    if (item.idMember && todayTasksByMember.has(item.idMember)) {
                                        todayTasksByMember.get(item.idMember)!.push(taskData);
                                    } else {
                                        unassignedTodayTasks.push(taskData);
                                    }
                                } else if (dueKST >= tomorrowKST && dueKST < dayAfterTomorrowKST) {
                                    // Tomorrow's task
                                    tomorrowTasks.push(taskData);
                                } else if (dueKST >= yesterdayKST && dueKST < todayKST && item.state !== 'complete') {
                                    // Yesterday's incomplete task
                                    incompleteYesterdayTasks.push(taskData);
                                }
                            }
                        });
                    });
                }
            });
        });

        // 3. AI Summarization for comments
        let aiSummary = "어제 작성된 코멘트가 없습니다.";
        if (commentsToSummarize.length > 0) {
            try {
                const prompt = `다음은 트렐로에서 어제 작성된 댓글 내역들입니다. 이 내용을 바탕으로 어제 어떤 이슈나 논의가 있었는지 핵심만 3~4줄로 간결하게 요약해주세요:\n\n${commentsToSummarize.join('\n')}`;
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                });
                aiSummary = response.text || "요약 생성 실패";
            } catch (aiError) {
                console.error("AI Summarization error:", aiError);
                aiSummary = "AI 요약 중 오류가 발생했습니다.";
            }
        }

        // 4. Build Teams Message (Markdown format)
        let mdText = `# ☀️ 모닝 브리핑 (${todayKST.toISOString().split('T')[0]})\n\n`;

        // Section: 어제 진행 업무
        mdText += `## 🔙 어제 진행 업무\n`;
        mdText += `**💬 액티비티(댓글) 요약:**\n${aiSummary}\n\n`;
        
        mdText += `**✅ 완료된 과업:**\n`;
        if (completedYesterdayTasks.length > 0) {
            completedYesterdayTasks.forEach(t => mdText += `- ${t}\n`);
        } else {
            mdText += `- 어제 완료된 과업이 없습니다.\n`;
        }
        
        mdText += `\n**⚠️ 미완료 과업 (어제 마감):**\n`;
        if (incompleteYesterdayTasks.length > 0) {
            incompleteYesterdayTasks.forEach(t => mdText += `- [${t.cardName}] ${t.name}\n`);
        } else {
            mdText += `- 미완료된 과업이 없습니다.\n`;
        }

        // Section: 오늘 진행 업무
        mdText += `\n---\n## 🎯 오늘 진행 업무\n`;
        workspaceMembers.forEach((member: any) => {
            const tasks = todayTasksByMember.get(member.id) || [];
            mdText += `**👤 ${member.fullName}**\n`;
            if (tasks.length > 0) {
                tasks.forEach(t => mdText += `- [${t.cardName}] ${t.name}\n`);
            } else {
                mdText += `- 💡 *오늘의 진행할 업무를 계획해 주세요.*\n`;
            }
            mdText += `\n`;
        });
        
        if (unassignedTodayTasks.length > 0) {
            mdText += `**👤 미할당**\n`;
            unassignedTodayTasks.forEach(t => mdText += `- [${t.cardName}] ${t.name}\n`);
            mdText += `\n`;
        }

        // Section: 내일 진행 업무
        mdText += `---\n## 📅 내일 진행 업무\n`;
        if (tomorrowTasks.length > 0) {
            tomorrowTasks.forEach(t => {
                const memberName = t.memberId && membersMap.has(t.memberId) ? membersMap.get(t.memberId).fullName : '미할당';
                mdText += `- [${t.cardName}] ${t.name} (${memberName})\n`;
            });
        } else {
            mdText += `- 내일 마감 예정인 과업이 없습니다.\n`;
        }

        // 5. Send to Teams Webhook
        const payload = {
            type: "message",
            attachments: [
                {
                    contentType: "application/vnd.microsoft.card.adaptive",
                    contentUrl: null,
                    content: {
                        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                        "type": "AdaptiveCard",
                        "version": "1.2",
                        "msteams": {
                            "width": "Full"
                        },
                        "body": [
                            {
                                "type": "TextBlock",
                                "text": mdText,
                                "wrap": true
                            }
                        ]
                    }
                }
            ]
        };

        await axios.post(TEAMS_WEBHOOK_URL, payload);

        return NextResponse.json({ success: true, message: "Morning briefing sent successfully." });
    } catch (error: any) {
        console.error('Error generating morning briefing:', error);
        return NextResponse.json({ error: 'Failed to generate morning briefing', details: error.message }, { status: 500 });
    }
}
