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
        const cardId = searchParams.get('cardId');

        if (!cardId) {
            return NextResponse.json({ error: 'cardId is required' }, { status: 400 });
        }

        const res = await axios.get(
            `https://api.trello.com/1/cards/${cardId}?key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}&fields=all&actions=commentCard&attachments=true&checklists=all&members=true`
        );

        return NextResponse.json(res.data);
    } catch (error: any) {
        console.error('Error fetching Trello Card:', error.response?.data || error.message);
        return NextResponse.json({ error: 'Failed to fetch Trello card data' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    if (!TRELLO_API_KEY || !TRELLO_API_TOKEN) {
        return NextResponse.json({ error: 'Trello API credentials not configured' }, { status: 500 });
    }

    try {
        const body = await request.json();
        const { idList, name, desc } = body;

        if (!idList || !name) {
            return NextResponse.json({ error: 'idList and name are required' }, { status: 400 });
        }

        const res = await axios.post(
            `https://api.trello.com/1/cards?key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}`,
            {
                idList,
                name,
                desc: desc || ''
            }
        );

        return NextResponse.json(res.data);
    } catch (error: any) {
        console.error('Error creating Trello Card:', error.response?.data || error.message);
        return NextResponse.json({ error: 'Failed to create Trello card' }, { status: 500 });
    }
}
