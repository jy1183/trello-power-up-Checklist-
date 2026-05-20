import { NextResponse } from 'next/server';
import axios from 'axios';

const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
const TRELLO_API_TOKEN = process.env.TRELLO_API_TOKEN;

export async function POST(request: Request) {
    if (!TRELLO_API_KEY || !TRELLO_API_TOKEN) {
        return NextResponse.json({ error: 'Trello API credentials not configured' }, { status: 500 });
    }
    try {
        const body = await request.json();
        const { checklistId, cardId, name, due } = body;
        
        if (!name) {
            return NextResponse.json({ error: 'Missing name parameter' }, { status: 400 });
        }

        let targetChecklistId = checklistId;

        // If cardId is provided, resolve or create the checklist automatically
        if (cardId) {
            const checklistsRes = await axios.get(
                `https://api.trello.com/1/cards/${cardId}/checklists?key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}`
            );
            const checklists = checklistsRes.data;
            if (checklists && checklists.length > 0) {
                targetChecklistId = checklists[0].id;
            } else {
                // Create a new checklist named "체크리스트"
                const createClRes = await axios.post(
                    `https://api.trello.com/1/cards/${cardId}/checklists?name=${encodeURIComponent('체크리스트')}&key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}`
                );
                targetChecklistId = createClRes.data.id;
            }
        }

        if (!targetChecklistId) {
            return NextResponse.json({ error: 'Missing checklistId or cardId parameter' }, { status: 400 });
        }

        // 1. Create the check item
        const res = await axios.post(
            `https://api.trello.com/1/checklists/${targetChecklistId}/checkItems?name=${encodeURIComponent(name)}&key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}`
        );
        const checkItem = res.data;

        // 2. If due date is provided, update the due date
        if (due && cardId) {
            const updateUrl = `https://api.trello.com/1/cards/${cardId}/checkItem/${checkItem.id}?due=${encodeURIComponent(due)}&key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}`;
            const updateRes = await axios.put(updateUrl);
            return NextResponse.json({ success: true, item: updateRes.data });
        }

        return NextResponse.json({ success: true, item: checkItem });
    } catch (error: any) {
        console.error('Error adding Trello Checklist Item:', error);
        return NextResponse.json({ 
            error: 'Failed to add item', 
            details: error.response?.data || error.message 
        }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    if (!TRELLO_API_KEY || !TRELLO_API_TOKEN) {
        return NextResponse.json({ error: 'Trello API credentials not configured' }, { status: 500 });
    }
    try {
        const { searchParams } = new URL(request.url);
        const checklistId = searchParams.get('checklistId');
        const itemId = searchParams.get('itemId');

        if (!checklistId || !itemId) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }
        const res = await axios.delete(
            `https://api.trello.com/1/checklists/${checklistId}/checkItems/${itemId}?key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}`
        );
        return NextResponse.json({ success: true, item: res.data });
    } catch (error) {
        console.error('Error deleting Trello Checklist Item:', error);
        return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
    }
}
