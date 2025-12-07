"use client";

import { useChat } from "@ai-sdk/react";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { MessageReasoning } from "@/components/ai-elements/message-reasoning";
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
import { useState } from "react";

export function ToolsChat() {
  const { messages, append, isLoading } = useChat({
    api: "/api/tools",
  } as any) as any;
  
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
                {msg.reasoning && (
                  <MessageReasoning 
                    reasoning={msg.reasoning} 
                    isLoading={isLoading && msg.id === messages[messages.length - 1].id && !msg.content} 
                  />
                )}
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
