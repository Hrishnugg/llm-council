"use client";

import { useState, useEffect } from "react";
import { ModeToggle } from "@/components/theme-toggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CouncilChat } from "@/components/council-chat";
import { ToolsChat } from "@/components/tools-chat";
import { AppSidebar } from "@/components/app-sidebar";
import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface Conversation {
  id: string;
  title: string;
  message_count: number;
  created_at: string;
}

export default function ChatPage() {
  const [mode, setMode] = useState("council");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (error) {
      console.error("Failed to load conversations", error);
    }
  };

  const handleNewConversation = async () => {
    try {
      const res = await fetch("/api/conversations", { method: "POST" });
      if (res.ok) {
        const newConv = await res.json();
        setConversations((prev) => [newConv, ...prev]);
        setCurrentConversationId(newConv.id);
        setSidebarOpen(false);
      }
    } catch (error) {
      console.error("Failed to create conversation", error);
    }
  };

  const handleSelectConversation = (id: string) => {
    setCurrentConversationId(id);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:block h-full">
        <AppSidebar
          conversations={conversations}
          currentConversationId={currentConversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          className="h-full"
        />
      </div>

      <div className="flex flex-col flex-1 h-full overflow-hidden">
        <header className="flex items-center justify-between border-b p-4 shrink-0">
          <div className="flex items-center gap-4">
            {/* Mobile Sidebar Trigger */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <MenuIcon className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                <AppSidebar
                  conversations={conversations}
                  currentConversationId={currentConversationId}
                  onSelectConversation={handleSelectConversation}
                  onNewConversation={handleNewConversation}
                  className="h-full border-none w-full"
                />
              </SheetContent>
            </Sheet>

            <h1 className="text-xl font-bold hidden sm:block">LLM Council</h1>
            
            <Tabs value={mode} onValueChange={setMode} className="w-[200px]">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="council">Council</TabsTrigger>
                <TabsTrigger value="tools">Tools</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <ModeToggle />
        </header>
        
        <div className="flex-1 overflow-hidden">
          {mode === "council" ? (
            <CouncilChat 
              conversationId={currentConversationId} 
              onConversationUpdate={loadConversations}
            />
          ) : (
            <ToolsChat />
          )}
        </div>
      </div>
    </div>
  );
}
