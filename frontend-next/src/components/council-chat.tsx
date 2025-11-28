"use client";

import { useState, useEffect, useRef } from "react";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputAttachments, PromptInputTextarea, PromptInputSubmit, PromptInputAttachment, type PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { Stage1Panel } from "@/components/council/Stage1Panel";
import { Stage2Panel } from "@/components/council/Stage2Panel";
import { Stage3Panel } from "@/components/council/Stage3Panel";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";

interface CouncilMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  stage1?: any[];
  stage2?: any[];
  stage3?: any;
  metadata?: any;
  stages_status?: {
    stage1: "pending" | "loading" | "complete";
    stage2: "pending" | "loading" | "complete";
    stage3: "pending" | "loading" | "complete";
  };
}

interface CouncilChatProps {
  conversationId: string | null;
  onConversationUpdate: () => void;
}

export function CouncilChat({ conversationId, onConversationUpdate }: CouncilChatProps) {
  const [messages, setMessages] = useState<CouncilMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversation when ID changes
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    const fetchConversation = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/conversations/${conversationId}`);
        if (res.ok) {
          const data = await res.json();
          // Map backend messages to UI messages
          const mappedMessages = (data.messages || []).map((msg: any, index: number) => ({
            id: `${conversationId}-${index}`, // Generate stable ID based on index
            role: msg.role,
            content: msg.content || (msg.stage3 ? msg.stage3.response : ""), // Use stage3 response as content for assistant if not present
            stage1: msg.stage1,
            stage2: msg.stage2,
            stage3: msg.stage3,
            metadata: msg.metadata,
            stages_status: msg.role === 'assistant' ? {
              stage1: 'complete',
              stage2: 'complete',
              stage3: 'complete'
            } : undefined
          }));
          setMessages(mappedMessages);
        }
      } catch (error) {
        console.error("Failed to fetch conversation", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversation();
  }, [conversationId]);

  const handleSubmit = async (inputMessage: PromptInputMessage) => {
    if (!inputMessage.text.trim() || !conversationId) return;

    const userMsg: CouncilMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: inputMessage.text,
    };

    const assistantMsgId = `assistant-${Date.now()}`;
    const assistantMsg: CouncilMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      stages_status: {
        stage1: "loading",
        stage2: "pending",
        stage3: "pending",
      },
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsLoading(true);

    try {
      // We don't send the full history in the body for the council backend usually, 
      // as it persists state. But the /api/council/route.ts might expect just the ID 
      // and the last message content.
      // Checking route.ts: it expects { messages, id } and sends messages[last].content
      
      const response = await fetch("/api/council", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [userMsg], // Only need the new message really
          id: conversationId,
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch");
      if (!response.body) throw new Error("No body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        
        const lastPart = lines.pop();
        if (lines.length > 0) {
            for (const line of lines) {
                if (line.startsWith("data: ")) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        handleStreamData(data, assistantMsgId);
                    } catch (e) {
                        console.error("Error parsing stream data", e);
                    }
                }
            }
        }
        buffer = lastPart || "";
      }
      
      // Refresh conversation list (titles might update)
      onConversationUpdate();

    } catch (error) {
      console.error("Error:", error);
      setIsLoading(false);
    }
  };

  const handleStreamData = (data: any, assistantMsgId: string) => {
    setMessages((prev) => {
      const newMessages = [...prev];
      const msgIndex = newMessages.findIndex((m) => m.id === assistantMsgId);
      if (msgIndex === -1) return prev;

      const msg = { ...newMessages[msgIndex] };
      if (!msg.stages_status) msg.stages_status = { stage1: "pending", stage2: "pending", stage3: "pending" };

      switch (data.type) {
        case "stage1_start":
          msg.stages_status.stage1 = "loading";
          break;
        case "stage1_complete":
          msg.stage1 = data.data;
          msg.stages_status.stage1 = "complete";
          msg.stages_status.stage2 = "loading";
          break;
        case "stage2_start":
          msg.stages_status.stage2 = "loading";
          break;
        case "stage2_complete":
          msg.stage2 = data.data;
          msg.metadata = data.metadata;
          msg.stages_status.stage2 = "complete";
          msg.stages_status.stage3 = "loading";
          break;
        case "stage3_start":
          msg.stages_status.stage3 = "loading";
          break;
        case "stage3_complete":
          msg.stage3 = data.data;
          msg.stages_status.stage3 = "complete";
          msg.content = data.data.response;
          break;
        case "complete":
          setIsLoading(false);
          break;
        case "error":
          console.error("Stream error:", data.message);
          setIsLoading(false);
          break;
      }
      newMessages[msgIndex] = msg;
      return newMessages;
    });
  };

  if (!conversationId) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">Welcome to LLM Council</h2>
          <p>Select a conversation from the sidebar or start a new one.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.map((msg) => (
            <Message key={msg.id} from={msg.role}>
              <MessageContent className={msg.role === "assistant" ? "w-full max-w-4xl" : ""}>
                {msg.role === "user" ? (
                  <MessageResponse>{msg.content}</MessageResponse>
                ) : (
                  <div className="space-y-4 w-full">
                    {msg.stages_status?.stage1 === "loading" && (
                      <div className="text-sm text-muted-foreground animate-pulse">Gathering council responses...</div>
                    )}
                    
                    <Stage1Panel responses={msg.stage1 || []} />
                    
                    {msg.stages_status?.stage2 === "loading" && (
                      <div className="text-sm text-muted-foreground animate-pulse">Peer reviewing and ranking...</div>
                    )}
                    
                    <Stage2Panel 
                      rankings={msg.stage2 || []} 
                      labelToModel={msg.metadata?.label_to_model} 
                      aggregateRankings={msg.metadata?.aggregate_rankings} 
                    />
                    
                    {msg.stages_status?.stage3 === "loading" && (
                      <div className="text-sm text-muted-foreground animate-pulse">Synthesizing final answer...</div>
                    )}
                    
                    <Stage3Panel finalResponse={msg.stage3} />
                  </div>
                )}
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
          <PromptInputTextarea disabled={isLoading || !conversationId} />
          <PromptInputSubmit status={isLoading ? "streaming" : "ready"} disabled={!conversationId} />
        </PromptInput>
      </div>
    </div>
  );
}
