import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText } from 'ai';
import { webSearch } from '@/lib/tools/web-search';
import { imageGeneration } from '@/lib/tools/image-gen';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openrouter('openai/gpt-4o'),
    messages,
    tools: {
      webSearch,
      imageGeneration,
    },
  });

  return result.toTextStreamResponse();
}

