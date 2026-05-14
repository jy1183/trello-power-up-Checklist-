import { NextResponse } from 'next/server';
import axios from 'axios';

const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
const TRELLO_API_TOKEN = process.env.TRELLO_API_TOKEN;
const TRELLO_WORKSPACE_ID = process.env.TRELLO_WORKSPACE_ID;

export async function GET(request: Request) {
    if (!TRELLO_API_KEY || !TRELLO_API_TOKEN) {
        return NextResponse.json({ error: 'Trello API credentials not configured' }, { status: 500 });
    }
    try {
        const { searchParams } = new URL(request.url);
        let boardId = searchParams.get('boardId');
        const limit = searchParams.get('limit') || '30';

        let targetBoardIds: string[] = [];
        if (boardId) {
            targetBoardIds = [boardId];
        } else if (TRELLO_WORKSPACE_ID) {
            const boardsRes = await axios.get(
                `https://api.trello.com/1/organizations/${TRELLO_WORKSPACE_ID}/boards?key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}&fields=id,name`
            );
            targetBoardIds = boardsRes.data.map((b: any) => b.id);
        } else {
            return NextResponse.json({ error: 'boardId or TRELLO_WORKSPACE_ID is required' }, { status: 400 });
        }

        const promises = targetBoardIds.map(id => 
            axios.get(`https://api.trello.com/1/boards/${id}/actions?key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}&limit=${limit}&fields=id,type,date,data,memberCreator&member_fields=fullName,username,avatarUrl&filter=all`)
                .catch(e => { console.error(`Error fetching activity for board ${id}:`, e.message); return { data: [] }; })
        );

        const results = await Promise.all(promises);
        const allActions: any[] = [];

        results.forEach(res => {
            if (res.data && Array.isArray(res.data)) {
                res.data.forEach((a: any) => {
                    allActions.push({
                        id: a.id,
                        type: a.type,
                        date: a.date,
                        memberName: a.memberCreator?.fullName || a.memberCreator?.username || '',
                        cardName: a.data?.card?.name || '',
                        cardUrl: a.data?.card?.shortLink ? `https://trello.com/c/${a.data.card.shortLink}` : '',
                        cardId: a.data?.card?.shortLink || a.data?.card?.id || '',
                        listName: a.data?.list?.name || '',
                        listBefore: a.data?.listBefore?.name || '',
                        listAfter: a.data?.listAfter?.name || '',
                        text: a.data?.text || '',
                        boardName: a.data?.board?.name || '',
                        checkItem: a.data?.checkItem?.name || '',
                        checkItemState: a.data?.checkItem?.state || '',
                    });
                });
            }
        });

        // Sort by date descending and limit
        const actions = allActions
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, parseInt(limit as string, 10));

        return NextResponse.json({ actions });
    } catch (error: any) {
        console.error('Error fetching Trello Activity:', error.response?.data || error.message);
        return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
    }
}
