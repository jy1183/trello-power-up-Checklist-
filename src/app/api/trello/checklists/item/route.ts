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
        const { checklistId, name } = body;
        if (!checklistId || !name) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }
        const res = await axios.post(
            `https://api.trello.com/1/checklists/${checklistId}/checkItems?name=${encodeURIComponent(name)}&key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}`
        );
        return NextResponse.json({ success: true, item: res.data });
    } catch (error) {
        console.error('Error adding Trello Checklist Item:', error);
        return NextResponse.json({ error: 'Failed to add item' }, { status: 500 });
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
