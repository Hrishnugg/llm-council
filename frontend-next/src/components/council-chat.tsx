"use client";

import { useState, useEffect, useRef } from "react";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { MessageFileCards } from "@/components/ai-elements/message-file-card";
import { 
  PromptInput, 
  PromptInputTextarea, 
  PromptInputSubmit, 
  PromptInputFooter,
  PromptInputTools,
  PromptInputButton,
  usePromptInputAttachments,
  type PromptInputMessage 
} from "@/components/ai-elements/prompt-input";
import { FileCard, FileCardsContainer } from "@/components/ai-elements/file-card";
import { Stage1Panel } from "@/components/council/Stage1Panel";
import { Stage2Panel } from "@/components/council/Stage2Panel";
import { Stage3Panel } from "@/components/council/Stage3Panel";
import { PaperclipIcon } from "lucide-react";
import type { FileUIPart } from "ai";

interface StreamingModel {
  model: string;
  content: string;
  reasoning?: string;
  isStreaming: boolean;
  isComplete: boolean;
}

interface CouncilMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: FileUIPart[];
  stage1?: any[];
  stage2?: any[];
  stage3?: any;
  metadata?: any;
  stages_status?: {
    stage1: "pending" | "loading" | "complete";
    stage2: "pending" | "loading" | "complete";
    stage3: "pending" | "loading" | "complete";
  };
  // Streaming state for live updates
  stage1_streaming?: Record<string, StreamingModel>;
  stage2_streaming?: Record<string, StreamingModel>;
  stage3_streaming?: StreamingModel;
}

interface Attachment {
  type: string;
  media_type: string;
  data: string;
  filename?: string;
}

interface CouncilChatProps {
  conversationId: string | null;
  onConversationUpdate: () => void;
}

/**
 * Convert a blob URL or data URL to base64 data
 */
async function urlToBase64(url: string): Promise<{ data: string; mediaType: string }> {
  // If already a data URL, extract the base64 part
  if (url.startsWith('data:')) {
    const matches = url.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      return { data: matches[2], mediaType: matches[1] };
    }
  }
  
  // Fetch the blob and convert to base64
  const response = await fetch(url);
  const blob = await response.blob();
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        resolve({ data: matches[2], mediaType: matches[1] });
      } else {
        reject(new Error('Failed to convert to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Attachment display component that uses the context
 */
function AttachmentPreview() {
  const attachments = usePromptInputAttachments();
  
  if (!attachments.files.length) {
    return null;
  }

  return (
    <FileCardsContainer>
      {attachments.files.map((file) => (
        <FileCard key={file.id} data={file} />
      ))}
    </FileCardsContainer>
  );
}

/**
 * Attachment button that opens the file dialog
 */
function AttachmentButton() {
  const attachments = usePromptInputAttachments();
  
  return (
    <PromptInputButton
      onClick={() => attachments.openFileDialog()}
      aria-label="Attach files"
    >
      <PaperclipIcon className="size-4" />
    </PromptInputButton>
  );
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
            id: `${conversationId}-${index}`,
            role: msg.role,
            content: msg.content || (msg.stage3 ? msg.stage3.response : ""),
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

    // Convert files to base64 attachments for the backend
    let backendAttachments: Attachment[] = [];
    let uiAttachments: FileUIPart[] = [];
    
    if (inputMessage.files && inputMessage.files.length > 0) {
      for (const file of inputMessage.files) {
        try {
          const { data, mediaType } = await urlToBase64(file.url);
          const isImage = mediaType.startsWith('image/');
          
          backendAttachments.push({
            type: isImage ? 'image' : 'file',
            media_type: mediaType,
            data: data,
            filename: file.filename
          });
          
          uiAttachments.push(file);
        } catch (error) {
          console.error('Failed to convert file to base64:', error);
        }
      }
    }

    const userMsg: CouncilMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: inputMessage.text,
      attachments: uiAttachments.length > 0 ? uiAttachments : undefined,
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
      const response = await fetch("/api/council", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: inputMessage.text }],
          id: conversationId,
          attachments: backendAttachments.length > 0 ? backendAttachments : undefined,
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
        // Stage 1 events
        case "stage1_start":
          msg.stages_status.stage1 = "loading";
          msg.stage1_streaming = {};
          break;
          
        case "stage1_model_start":
          if (!msg.stage1_streaming) msg.stage1_streaming = {};
          msg.stage1_streaming[data.model] = {
            model: data.model,
            content: "",
            reasoning: "",
            isStreaming: true,
            isComplete: false
          };
          break;
          
        case "stage1_model_delta":
          if (msg.stage1_streaming?.[data.model]) {
            msg.stage1_streaming[data.model] = {
              ...msg.stage1_streaming[data.model],
              content: msg.stage1_streaming[data.model].content + data.content
            };
          }
          break;
          
        case "stage1_model_reasoning":
          if (msg.stage1_streaming?.[data.model]) {
            msg.stage1_streaming[data.model] = {
              ...msg.stage1_streaming[data.model],
              reasoning: (msg.stage1_streaming[data.model].reasoning || "") + data.content
            };
          }
          break;
          
        case "stage1_model_done":
          if (msg.stage1_streaming?.[data.model]) {
            msg.stage1_streaming[data.model] = {
              ...msg.stage1_streaming[data.model],
              content: data.response,
              reasoning: data.reasoning || "",
              isStreaming: false,
              isComplete: true
            };
          }
          break;
          
        case "stage1_complete":
          msg.stage1 = data.data;
          msg.stages_status.stage1 = "complete";
          msg.stages_status.stage2 = "loading";
          msg.stage1_streaming = undefined; // Clear streaming state
          break;

        // Stage 2 events  
        case "stage2_start":
          msg.stages_status.stage2 = "loading";
          msg.stage2_streaming = {};
          break;
          
        case "stage2_model_start":
          if (!msg.stage2_streaming) msg.stage2_streaming = {};
          msg.stage2_streaming[data.model] = {
            model: data.model,
            content: "",
            reasoning: "",
            isStreaming: true,
            isComplete: false
          };
          break;
          
        case "stage2_model_delta":
          if (msg.stage2_streaming?.[data.model]) {
            msg.stage2_streaming[data.model] = {
              ...msg.stage2_streaming[data.model],
              content: msg.stage2_streaming[data.model].content + data.content
            };
          }
          break;
          
        case "stage2_model_reasoning":
          if (msg.stage2_streaming?.[data.model]) {
            msg.stage2_streaming[data.model] = {
              ...msg.stage2_streaming[data.model],
              reasoning: (msg.stage2_streaming[data.model].reasoning || "") + data.content
            };
          }
          break;
          
        case "stage2_model_done":
          if (msg.stage2_streaming?.[data.model]) {
            msg.stage2_streaming[data.model] = {
              ...msg.stage2_streaming[data.model],
              content: data.ranking,
              reasoning: data.reasoning || "",
              isStreaming: false,
              isComplete: true
            };
          }
          break;
          
        case "stage2_complete":
          msg.stage2 = data.data;
          msg.metadata = data.metadata;
          msg.stages_status.stage2 = "complete";
          msg.stages_status.stage3 = "loading";
          msg.stage2_streaming = undefined;
          break;

        // Stage 3 events
        case "stage3_start":
          msg.stages_status.stage3 = "loading";
          msg.stage3_streaming = {
            model: "",
            content: "",
            reasoning: "",
            isStreaming: true,
            isComplete: false
          };
          break;
          
        case "stage3_delta":
          if (msg.stage3_streaming) {
            msg.stage3_streaming = {
              ...msg.stage3_streaming,
              model: data.model,
              content: msg.stage3_streaming.content + data.content
            };
          }
          break;
          
        case "stage3_reasoning":
          if (msg.stage3_streaming) {
            msg.stage3_streaming = {
              ...msg.stage3_streaming,
              reasoning: (msg.stage3_streaming.reasoning || "") + data.content
            };
          }
          break;
          
        case "stage3_complete":
          msg.stage3 = data.data;
          msg.stages_status.stage3 = "complete";
          msg.content = data.data.response;
          msg.stage3_streaming = undefined;
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
                  <>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <MessageFileCards files={msg.attachments} />
                    )}
                    <MessageResponse>{msg.content}</MessageResponse>
                  </>
                )                 : (
                  <div className="space-y-4 w-full">
                    {msg.stages_status?.stage1 === "loading" && !msg.stage1_streaming && (
                      <div className="text-sm text-muted-foreground animate-pulse">Gathering council responses...</div>
                    )}
                    
                    <Stage1Panel 
                      responses={msg.stage1 || []} 
                      streamingResponses={msg.stage1_streaming}
                      isStreaming={msg.stages_status?.stage1 === "loading"}
                    />
                    
                    {msg.stages_status?.stage2 === "loading" && !msg.stage2_streaming && (
                      <div className="text-sm text-muted-foreground animate-pulse">Peer reviewing and ranking...</div>
                    )}
                    
                    <Stage2Panel 
                      rankings={msg.stage2 || []} 
                      labelToModel={msg.metadata?.label_to_model} 
                      aggregateRankings={msg.metadata?.aggregate_rankings}
                      streamingRankings={msg.stage2_streaming}
                      isStreaming={msg.stages_status?.stage2 === "loading"}
                    />
                    
                    {msg.stages_status?.stage3 === "loading" && !msg.stage3_streaming?.content && (
                      <div className="text-sm text-muted-foreground animate-pulse">Synthesizing final answer...</div>
                    )}
                    
                    <Stage3Panel 
                      finalResponse={msg.stage3} 
                      streamingResponse={msg.stage3_streaming}
                      isStreaming={msg.stages_status?.stage3 === "loading"}
                    />
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
          maxFiles={10}
          multiple={true}
          accept="image/*,application/pdf,.txt,.md,.json,.csv"
          className="max-w-4xl mx-auto"
          onError={(err) => console.error("PromptInput error:", err)}
        >
          {/* File cards preview - shows uploaded files before submission */}
          <AttachmentPreview />
          
          <PromptInputTextarea 
            disabled={isLoading || !conversationId} 
            placeholder="Ask the council anything... (attach up to 10 files)"
          />
          <PromptInputFooter>
            <PromptInputTools>
              {/* Direct attachment button - no dropdown/portal issues */}
              <AttachmentButton />
            </PromptInputTools>
            <PromptInputSubmit status={isLoading ? "streaming" : "ready"} disabled={!conversationId} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
