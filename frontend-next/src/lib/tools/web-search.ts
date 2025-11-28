import { tool } from 'ai';
import { z } from 'zod';
import Exa from 'exa-js';

export const webSearch = tool({
  description: 'Search the web for current information',
  parameters: z.object({
    query: z.string().describe('Search query'),
  }),
  // @ts-ignore
  execute: async ({ query }: { query: string }) => {
    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) {
        return [{ title: 'Error', content: 'EXA_API_KEY not configured', url: '#' }];
    }
    
    const exa = new Exa(apiKey);
    
    try {
      const { results } = await exa.searchAndContents(query, {
        livecrawl: 'always',
        numResults: 5,
      });
      return results.map(r => ({
        title: r.title,
        url: r.url,
        content: (r as any).text?.slice(0, 1500) || "",
      }));
    } catch (e) {
      console.error('Exa search error', e);
      return [{ title: 'Error', content: 'Search failed', url: '#' }];
    }
  },
});

