---
name: LLM Council AI SDK UX Upgrade
overview: ""
todos:
  - id: 9d4fc13b-90dc-4186-8750-f98fa3a221a3
    content: Create Next.js 15 app with Tailwind CSS dark mode in frontend-next/
    status: pending
  - id: aa8b00ee-3673-4a3c-a461-753dd3d4995d
    content: Install AI Elements (conversation, message, prompt-input) via CLI
    status: pending
  - id: d7405981-37f1-47ca-9ad5-8ef00354612a
    content: Configure @openrouter/ai-sdk-provider with existing API key
    status: pending
  - id: f332a524-1ad6-48a0-a7af-7e32a8529403
    content: Create /api/council route to proxy SSE from Python backend
    status: pending
  - id: a8ad1c19-e32c-477c-900b-f38fdb7eaaef
    content: Port Stage1, Stage2, Stage3 components to Next.js with AI Elements styling
    status: pending
  - id: 3da8cbfa-b298-42bc-bb24-3185f298bcfc
    content: Implement file upload with PromptInputAttachments component
    status: pending
  - id: 81af9c93-ca7c-4069-8a5c-e166fb375d5a
    content: Add Exa web search tool via AI SDK tool calling
    status: pending
  - id: df1b8827-3c75-47ad-8bd4-e5c20aad0e9a
    content: Add image generation tool with DALL-E 3 or Flux
    status: pending
  - id: fb5206a9-70c7-44e8-8e25-8f8e44b923f3
    content: Apply dark mode theme with CSS variables and theme toggle
    status: pending
  - id: 0757784a-8506-4cc0-90b8-1632ef011364
    content: Test all features and remove old frontend/ when ready
    status: pending
---

# LLM Council AI SDK UX Upgrade

## Architecture Overview

**Hybrid approach**: Keep Python FastAPI backend for council logic, add Next.js frontend with AI SDK for enhanced features.

```
User Interface (Next.js + AI Elements)
         |
    +----+----+
    |         |
    v         v
Next.js API   Python FastAPI
(AI SDK)      (Council Logic)
    |              |
    v              v
OpenRouter    OpenRouter
(tools, img)  (council models)
```

## Key Dependencies

- `next` (App Router)
- `ai` + `@ai-sdk/react` (AI SDK Core + UI)
- `@openrouter/ai-sdk-provider` (OpenRouter integration)
- AI Elements via `npx ai-elements@latest`
- `tailwindcss` with dark mode
- `zod` for tool schemas

## Phase 1: Next.js Frontend Setup

Create new Next.js app in `frontend-next/` alongside existing frontend:

```22:26:frontend/package.json
    "@vitejs/plugin-react": "^5.1.1",
    "eslint": "^9.39.1",
    "eslint-plugin-react-hooks": "^7.0.1",
```

New stack:

- Next.js 15 with App Router
- Tailwind CSS 4 with dark mode (`class` strategy)
- AI Elements components via shadcn registry
- `@openrouter/ai-sdk-provider` for model calls

## Phase 2: AI Elements Component Integration

Install core AI Elements:

- `conversation` - Chat container with auto-scroll
- `message` - Message display with actions
- `prompt-input` - Input with file attachments, model selector

Key components from docs:

```tsx
<Conversation className="dark:bg-zinc-900">
  <ConversationContent>
    {messages.map(m => (
      <Message from={m.role} key={m.id}>
        <MessageContent>
          <MessageResponse>{m.content}</MessageResponse>
        </MessageContent>
      </Message>
    ))}
  </ConversationContent>
  <ConversationScrollButton />
</Conversation>
```

## Phase 3: Council Integration Layer

Create Next.js API route that proxies to Python backend:

[`app/api/council/route.ts`](app/api/council/route.ts) - Streams SSE from Python backend

- Maintains exact 3-stage council flow
- Returns stage events: `stage1_start`, `stage1_complete`, etc.
- No changes to Python [`backend/council.py`](backend/council.py)

## Phase 4: File Upload Support

Use AI Elements `PromptInput` with attachments:

```tsx
<PromptInput
  accept="image/*,application/pdf"
  multiple
  maxFiles={5}
  onSubmit={async (message) => {
    // Convert files to data URLs
    // Send to council with multimodal context
  }}
>
  <PromptInputAttachments>
    {(attachment) => <PromptInputAttachment data={attachment} />}
  </PromptInputAttachments>
  <PromptInputTextarea />
</PromptInput>
```

Python backend will receive base64 file data in message content.

## Phase 5: Tool Calling and Generative UI

Add Next.js API route with AI SDK tools:

```tsx
// app/api/tools/route.ts
const result = streamText({
  model: openrouter('openai/gpt-4o'),
  tools: {
    webSearch: exaWebSearch,
    generateImage: imageGenerationTool,
    codeExecution: sandboxTool,
  },
  stopWhen: stepCountIs(5),
});
```

**Tools to implement:**

1. **Web Search** - Exa or OpenAI web search preview
2. **Image Generation** - Nano Banana Pro via OpenRouter
3. **Code Sandbox** - Optional mini-app for code execution

## Phase 6: Web Search Integration

Using Exa (recommended for research quality):

```tsx
import Exa from 'exa-js';

export const webSearch = tool({
  description: 'Search the web for current information',
  inputSchema: z.object({
    query: z.string().describe('Search query'),
  }),
  execute: async ({ query }) => {
    const { results } = await exa.searchAndContents(query, {
      livecrawl: 'always',
      numResults: 5,
    });
    return results.map(r => ({
      title: r.title,
      url: r.url,
      content: r.text.slice(0, 1500),
    }));
  },
});
```

## Phase 7: Image Generation

Add image generation tool:

```tsx
import { experimental_generateImage as generateImage } from 'ai';

export const imageGeneration = tool({
  description: 'Generate images from text descriptions',
  inputSchema: z.object({
    prompt: z.string().describe('Image description'),
  }),
  execute: async ({ prompt }) => {
    const { image } = await generateImage({
      model: openai.image('dall-e-3'),
      prompt,
      size: '1024x1024',
    });
    return { imageUrl: image.base64 };
  },
});
```

## Phase 8: Dark Mode Theming

Tailwind config with dark mode:

```js
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
      },
    },
  },
};
```

CSS variables for dark theme:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
}

.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
}
```

## Phase 9: Council-Specific UI Components

Preserve and enhance existing Stage components:

1. **Stage1Panel** - Tab view of model responses (keep existing logic)
2. **Stage2Panel** - Peer rankings with de-anonymization (keep existing)
3. **Stage3Panel** - Chairman synthesis with green accent

Wrap in AI Elements `Message` components for consistent styling.

## File Structure

```
frontend-next/
├── app/
│   ├── layout.tsx          # Dark mode provider
│   ├── page.tsx            # Main chat interface
│   ├── api/
│   │   ├── council/route.ts    # Proxy to Python backend
│   │   └── tools/route.ts      # AI SDK tools endpoint
│   └── globals.css
├── components/
│   ├── ai-elements/        # shadcn AI Elements
│   ├── council/
│   │   ├── Stage1Panel.tsx
│   │   ├── Stage2Panel.tsx
│   │   └── Stage3Panel.tsx
│   └── theme-toggle.tsx
└── lib/
    ├── tools/
    │   ├── web-search.ts
    │   └── image-gen.ts
    └── council-client.ts   # Python backend client
```

## Migration Path

1. Create `frontend-next/` with Next.js
2. Install AI Elements and dependencies
3. Port existing Stage components
4. Add council API proxy
5. Implement file upload
6. Add tools (web search, image gen)
7. Apply dark theme
8. Test all features
9. Remove old `frontend/` when ready

## Environment Variables

```env
# .env.local
OPENROUTER_API_KEY=sk-or-v1-...
EXA_API_KEY=...              # For web search
PYTHON_BACKEND_URL=http://localhost:8001
```