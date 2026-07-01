import { NextResponse } from 'next/server';
import axios from 'axios';

const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
const TRELLO_API_TOKEN = process.env.TRELLO_API_TOKEN;
const TRELLO_WORKSPACE_ID = process.env.TRELLO_WORKSPACE_ID;

export async function GET(request: Request) {
    if (!TRELLO_API_KEY || !TRELLO_API_TOKEN || !TRELLO_WORKSPACE_ID) {
        return NextResponse.json({ error: 'Trello API credentials not configured' }, { status: 500 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const rangeDays = parseInt(searchParams.get('days') || '3', 10);
        const includeOverdue = searchParams.get('overdue') === 'true';

        const now = new Date();
        const kstOffset = 9 * 60 * 60 * 1000;
        const kstNow = new Date(now.getTime() + kstOffset);
        const today = new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate()));

        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() + rangeDays + 1);

        // For overdue: look back up to 30 days
        const overdueStart = new Date(today);
        overdueStart.setDate(overdueStart.getDate() - 30);

        const boardsRes = await axios.get(
            'https://api.trello.com/1/organizations/' + TRELLO_WORKSPACE_ID + '/boards?key=' + TRELLO_API_KEY + '&token=' + TRELLO_API_TOKEN + '&fields=id,name'
        );
        const boards = boardsRes.data;

        // 워크스페이스 전체 멤버 목록 조회 및 매핑
        const membersRes = await axios.get(
            'https://api.trello.com/1/organizations/' + TRELLO_WORKSPACE_ID + '/members?key=' + TRELLO_API_KEY + '&token=' + TRELLO_API_TOKEN + '&fields=id,fullName,avatarUrl,username'
        ).catch(e => {
            console.error('Error fetching workspace members: ' + e.message);
            return { data: [] };
        });
        const workspaceMembers = membersRes.data || [];
        const membersMap = new Map<string, any>();
        workspaceMembers.forEach((m: any) => {
            membersMap.set(m.id, m);
        });

        const promises = boards.map((b: any) =>
            axios.get('https://api.trello.com/1/boards/' + b.id + '/cards?checklists=all&fields=id,name,shortUrl,idMembers&members=true&member_fields=fullName,avatarUrl,username&key=' + TRELLO_API_KEY + '&token=' + TRELLO_API_TOKEN)
                .catch(e => { console.error('Error on board ' + b.name + ': ' + e.message); return { data: [] }; })
        );

        const results = await Promise.all(promises);
        const allItems: any[] = [];
        const overdueItems: any[] = [];

        results.forEach(res => {
            res.data.forEach((card: any) => {
                if (card.checklists) {
                    card.checklists.forEach((cl: any) => {
                        cl.checkItems.forEach((item: any) => {
                             if (item.due) {
                                const dueDate = new Date(item.due);
                                const kstDue = new Date(dueDate.getTime() + kstOffset);
                                const dueKstOnly = new Date(Date.UTC(kstDue.getUTCFullYear(), kstDue.getUTCMonth(), kstDue.getUTCDate()));

                                // 체크리스트 담당자 (idMember) 식별 및 매핑
                                const itemMember = item.idMember ? membersMap.get(item.idMember) : null;
                                const itemMembers = itemMember ? [{
                                    id: itemMember.id,
                                    fullName: itemMember.fullName,
                                    avatarUrl: itemMember.avatarUrl,
                                    username: itemMember.username
                                }] : [];

                                // Future items (today ~ endDate)
                                if (dueKstOnly >= today && dueKstOnly < endDate) {
                                    const diffTime = dueKstOnly.getTime() - today.getTime();
                                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                                    allItems.push({
                                        id: item.id, cardId: card.id, title: item.name,
                                        cardName: card.name, cardUrl: card.shortUrl,
                                        listName: cl.name, due: dueDate,
                                        state: item.state, dayIndex: diffDays,
                                        members: itemMembers
                                    });
                                }
                                // Overdue items (past, incomplete only)
                                if (includeOverdue && dueKstOnly < today && dueKstOnly >= overdueStart && item.state !== 'complete') {
                                    overdueItems.push({
                                        id: item.id, cardId: card.id, title: item.name,
                                        cardName: card.name, cardUrl: card.shortUrl,
                                        listName: cl.name, due: dueDate,
                                        state: item.state, dayIndex: -1,
                                        members: itemMembers
                                    });
                                }
                            }
                        });
                    });
                }
            });
        });

        allItems.sort((a, b) => a.due.getTime() - b.due.getTime());
        overdueItems.sort((a, b) => b.due.getTime() - a.due.getTime()); // newest overdue first

        return NextResponse.json({
            date: today.toISOString().split('T')[0],
            tasks: allItems,
            overdueTasks: overdueItems
        });

    } catch (error: any) {
        console.error('Error fetching Trello Checklists:', error);
        // 클라이언트(브라우저)에서 정확한 에러 원인을 파악하기 위해 상세 에러 메시지 반환
        const errorMessage = error.response?.data || error.message || 'Unknown error';
        return NextResponse.json({ 
            error: 'Failed to fetch Trello tasks', 
            details: errorMessage 
        }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    if (!TRELLO_API_KEY || !TRELLO_API_TOKEN) {
        return NextResponse.json({ error: 'Trello API credentials not configured' }, { status: 500 });
    }
    try {
        const body = await request.json();
        const { cardId, itemId, state, dueDate } = body;
        if (!cardId || !itemId) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }
        let url = 'https://api.trello.com/1/cards/' + cardId + '/checkItem/' + itemId + '?key=' + TRELLO_API_KEY + '&token=' + TRELLO_API_TOKEN;
        if (state) url += '&state=' + state;
        if (dueDate) url += '&due=' + encodeURIComponent(dueDate);
        const res = await axios.put(url);
        return NextResponse.json({ success: true, item: res.data });
    } catch (error) {
        console.error('Error updating Trello Checklist Item:', error);
        return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
    }
}
