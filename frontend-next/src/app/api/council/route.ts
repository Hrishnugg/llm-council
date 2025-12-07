import { NextResponse } from 'next/server';

interface Attachment {
  type: string;
  media_type: string;
  data: string;
  filename?: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, id, attachments } = body;
    
    if (!id) {
       return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1];
    
    const backendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:8001';
    
    // Build request body with content and optional attachments
    const requestBody: { content: string; attachments?: Attachment[] } = {
      content: lastMessage.content
    };
    
    if (attachments && attachments.length > 0) {
      requestBody.attachments = attachments;
    }
    
    const response = await fetch(`${backendUrl}/api/conversations/${id}/message/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
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
