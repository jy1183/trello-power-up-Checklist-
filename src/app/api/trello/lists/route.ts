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
        const listId = searchParams.get('listId');

        if (!listId) {
            return NextResponse.json({ error: 'Missing listId parameter' }, { status: 400 });
        }

        const url = `https://api.trello.com/1/lists/${listId}/cards?key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}&fields=id,name`;
        const res = await axios.get(url);
        return NextResponse.json({ cards: res.data });
    } catch (error: any) {
        console.error('Error fetching Trello cards for list:', error);
        return NextResponse.json({ 
            error: 'Failed to fetch Trello cards', 
            details: error.response?.data || error.message 
        }, { status: 500 });
    }
}
