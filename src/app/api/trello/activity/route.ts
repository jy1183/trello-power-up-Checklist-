import { NextResponse } from 'next/server';
import axios from 'axios';

const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
const TRELLO_API_TOKEN = process.env.TRELLO_API_TOKEN;

export async function GET(request: Request) {
    if (!TRELLO_API_KEY || !TRELLO_API_TOKEN) {
        return NextResponse.json({ error: 'Trello API credentials not configured' }, { status: 500 });
    }
    try {
        const { searchParams } = new URL(request.url);
        const boardId = searchParams.get('boardId');
        if (!boardId) {
            return NextResponse.json({ error: 'boardId is required' }, { status: 400 });
        }
        const limit = searchParams.get('limit') || '30';

        const res = await axios.get(
            'https://api.trello.com/1/boards/' + boardId + '/actions'
            + '?key=' + TRELLO_API_KEY + '&token=' + TRELLO_API_TOKEN
            + '&limit=' + limit
            + '&fields=id,type,date,data,memberCreator'
            + '&member_fields=fullName,username,avatarUrl'
            + '&filter=all'
        );

        const actions = res.data.map((a: any) => ({
            id: a.id,
            type: a.type,
            date: a.date,
            memberName: a.memberCreator?.fullName || a.memberCreator?.username || '',
            cardName: a.data?.card?.name || '',
            cardId: a.data?.card?.shortLink || a.data?.card?.id || '',
            listName: a.data?.list?.name || '',
            listBefore: a.data?.listBefore?.name || '',
            listAfter: a.data?.listAfter?.name || '',
            text: a.data?.text || '',
            boardName: a.data?.board?.name || '',
            checkItem: a.data?.checkItem?.name || '',
            checkItemState: a.data?.checkItem?.state || '',
        }));

        return NextResponse.json({ actions });
    } catch (error: any) {
        console.error('Error fetching Trello Activity:', error.response?.data || error.message);
        return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
    }
}
