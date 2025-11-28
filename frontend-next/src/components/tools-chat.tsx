"use client";

import { useChat } from "@ai-sdk/react";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { 
  PromptInput, 
  PromptInputAttachments, 
  PromptInputTextarea, 
  PromptInputSubmit, 
  PromptInputAttachment, 
  type PromptInputMessage,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionMenuItem,
  PromptInputFooter,
  PromptInputTools,
  PromptInputActionAddAttachments
} from "@/components/ai-elements/prompt-input";
import { GlobeIcon, ImageIcon } from "lucide-react";
import { useState, useRef } from "react";

export function ToolsChat() {
  const { messages, append, isLoading, setInput, input } = useChat({
    api: "/api/tools",
  } as any) as any;
  
  // Since useChat manages input state, we need to sync it or just use its setInput
  // However, PromptInput manages its own state locally if not controlled.
  // To modify input from actions, we might need a controlled input or a ref/callback.
  // The PromptInput component (as per previous read) has a textInput context if using PromptInputProvider,
  // or it manages it locally.
  // Let's wrap in PromptInputProvider or use the local state if possible.
  // Actually, PromptInputTextarea has a `value` and `onChange` prop if we want to control it.
  
  const [localInput, setLocalInput] = useState("");

  const handleSubmit = async (inputMessage: PromptInputMessage) => {
    if (!inputMessage.text.trim() && (!inputMessage.files || inputMessage.files.length === 0)) return;
    
    const attachments = inputMessage.files?.map(file => ({
        url: file.url,
        name: file.filename,
        contentType: file.mediaType,
    }));

    await append({
      role: "user",
      content: inputMessage.text,
      experimental_attachments: attachments,
    });
    setLocalInput("");
  };

  const handleAction = (action: string) => {
    if (action === "web_search") {
        setLocalInput(prev => prev + (prev ? " " : "") + "Search the web for ");
    } else if (action === "create_image") {
        setLocalInput(prev => prev + (prev ? " " : "") + "Generate an image of ");
    }
  };

  return (
    <div className="flex h-full flex-col">
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.map((msg: any) => (
            <Message key={msg.id} from={msg.role as "user" | "assistant"}>
              <MessageContent>
                <MessageResponse>{msg.content}</MessageResponse>
                {msg.toolInvocations?.map((toolInvocation: any) => (
                    <div key={toolInvocation.toolCallId} className="mt-2 p-2 bg-muted rounded text-xs font-mono">
                        <div className="font-bold">Tool: {toolInvocation.toolName}</div>
                        <div>Args: {JSON.stringify(toolInvocation.args)}</div>
                        {'result' in toolInvocation && (
                            <div className="mt-1 text-muted-foreground">
                                Result: {JSON.stringify(toolInvocation.result).slice(0, 200)}...
                            </div>
                        )}
                    </div>
                ))}
              </MessageContent>
            </Message>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="p-4 border-t bg-background">
        <PromptInput
          onSubmit={handleSubmit}
          maxFiles={5}
          accept="image/*,application/pdf"
          className="max-w-4xl mx-auto"
        >
          <PromptInputAttachments>
            {(file) => <PromptInputAttachment key={file.id} data={file} />}
          </PromptInputAttachments>
          
          <PromptInputTextarea 
            disabled={isLoading} 
            placeholder="Ask me anything or use tools..." 
            value={localInput}
            onChange={(e) => setLocalInput(e.target.value)}
          />
          
          <PromptInputFooter>
            <PromptInputTools>
                <PromptInputActionMenu>
                    <PromptInputActionMenuTrigger />
                    <PromptInputActionMenuContent>
                        <PromptInputActionAddAttachments />
                        <PromptInputActionMenuItem onSelect={() => handleAction("web_search")}>
                            <GlobeIcon className="mr-2 size-4" /> Web Search
                        </PromptInputActionMenuItem>
                        <PromptInputActionMenuItem onSelect={() => handleAction("create_image")}>
                            <ImageIcon className="mr-2 size-4" /> Create Image
                        </PromptInputActionMenuItem>
                    </PromptInputActionMenuContent>
                </PromptInputActionMenu>
            </PromptInputTools>
            <PromptInputSubmit status={isLoading ? "streaming" : "ready"} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
