import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // useChat sends { messages } by default.
    // We need conversation ID. It might be in the body if we passed it, or we can extract from headers/params.
    // For now, let's assume we pass it in the body as 'id' or 'chatId'.
    
    const { messages, id } = body;
    
    if (!id) {
       return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1];
    
    const backendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:8001';
    
    const response = await fetch(`${backendUrl}/api/conversations/${id}/message/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: lastMessage.content }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend error: ${response.status} ${errorText}`);
      return NextResponse.json({ error: `Backend error: ${response.status}` }, { status: response.status });
    }

    // Stream the response back
    return new NextResponse(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

