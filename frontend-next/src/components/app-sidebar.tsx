"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { PlusIcon, MessageSquareIcon } from "lucide-react";

interface Conversation {
  id: string;
  title: string;
  message_count: number;
  created_at: string;
}

interface AppSidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  className?: string;
}

export function AppSidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  className,
}: AppSidebarProps) {
  return (
    <div className={cn("flex w-64 flex-col border-r bg-muted/30", className)}>
      <div className="p-4 border-b">
        <Button 
          onClick={onNewConversation} 
          className="w-full justify-start gap-2" 
          variant="default"
        >
          <PlusIcon className="size-4" />
          New Conversation
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-1 p-2">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No conversations yet
            </div>
          ) : (
            conversations.map((conv) => (
              <Button
                key={conv.id}
                variant={conv.id === currentConversationId ? "secondary" : "ghost"}
                className={cn(
                  "justify-start h-auto py-3 px-3 text-left font-normal",
                  conv.id === currentConversationId && "bg-secondary"
                )}
                onClick={() => onSelectConversation(conv.id)}
              >
                <MessageSquareIcon className="mr-2 size-4 shrink-0 opacity-50" />
                <div className="flex-1 overflow-hidden">
                  <div className="truncate font-medium text-sm">
                    {conv.title || "New Conversation"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {conv.message_count} messages
                  </div>
                </div>
              </Button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

