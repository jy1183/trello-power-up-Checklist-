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
        const boardId = searchParams.get('boardId');

        if (boardId) {
            // Get lists of the board
            const url = `https://api.trello.com/1/boards/${boardId}/lists?key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}&fields=id,name`;
            const res = await axios.get(url);
            return NextResponse.json({ lists: res.data });
        } else {
            // Get boards of the workspace
            if (!TRELLO_WORKSPACE_ID) {
                return NextResponse.json({ error: 'Trello workspace ID not configured' }, { status: 500 });
            }
            const url = `https://api.trello.com/1/organizations/${TRELLO_WORKSPACE_ID}/boards?key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}&fields=id,name,url`;
            const res = await axios.get(url);
            return NextResponse.json({ boards: res.data });
        }
    } catch (error: any) {
        console.error('Error fetching Trello boards/lists:', error);
        return NextResponse.json({ 
            error: 'Failed to fetch Trello boards or lists', 
            details: error.response?.data || error.message 
        }, { status: 500 });
    }
}
