"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface MessageReasoningProps {
  reasoning: string | object | null | undefined;
  isLoading?: boolean;
  className?: string;
  defaultExpanded?: boolean;
}

// Extract readable text from various reasoning formats
function extractReasoningText(item: unknown): string | null {
  if (!item) return null;
  if (typeof item === "string") return item;
  
  if (typeof item === "object" && item !== null) {
    const obj = item as Record<string, unknown>;
    
    // Skip encrypted reasoning data (OpenAI, xAI format)
    if (obj.type === "reasoning.encrypted" || obj.type === "reasoning_encrypted") {
      return null;
    }
    
    // Handle summary type (OpenAI format) - this is the readable part!
    if (obj.type === "reasoning.summary" || obj.type === "reasoning_summary") {
      return obj.summary as string || null;
    }
    
    // Handle thinking/text/content fields
    if (obj.thinking) return obj.thinking as string;
    if (obj.text) return obj.text as string;
    if (obj.content) return obj.content as string;
    if (obj.summary) return obj.summary as string;
  }
  
  return null;
}

// Normalize reasoning to a string
function normalizeReasoning(reasoning: string | object | null | undefined): string {
  if (!reasoning) return "";
  
  // If it's a string, clean it up
  if (typeof reasoning === "string") {
    // Check if it looks like JSON
    if (reasoning.trim().startsWith("{") || reasoning.trim().startsWith("[")) {
      try {
        const parsed = JSON.parse(reasoning);
        return normalizeReasoning(parsed);
      } catch {
        // Not valid JSON, treat as plain text
      }
    }
    // Replace literal \n\n with actual newlines
    return reasoning.replace(/\\n\\n/g, "\n\n").replace(/\\n/g, "\n");
  }
  
  // If it's an array, extract readable parts and join
  if (Array.isArray(reasoning)) {
    const parts = reasoning
      .map(extractReasoningText)
      .filter((text): text is string => text !== null && text.length > 0);
    
    if (parts.length === 0) return "";
    
    return parts
      .join("\n\n")
      .replace(/\\n\\n/g, "\n\n")
      .replace(/\\n/g, "\n");
  }
  
  // If it's a single object, try to extract text
  const extracted = extractReasoningText(reasoning);
  if (extracted) {
    return extracted.replace(/\\n\\n/g, "\n\n").replace(/\\n/g, "\n");
  }
  
  return "";
}

export function MessageReasoning({ 
  reasoning, 
  isLoading, 
  className,
  defaultExpanded = false 
}: MessageReasoningProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  const normalizedReasoning = normalizeReasoning(reasoning);

  // Don't render if there's no content and not loading
  if (!normalizedReasoning && !isLoading) return null;

  return (
    <div className={cn("my-2 border rounded-md overflow-hidden bg-muted/30", className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-2 h-auto text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50"
      >
        <div className="flex items-center gap-2">
          <Brain className="size-3.5" />
          <span>
            {isLoading ? "Thinking..." : "Reasoning Process"}
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown className="size-3.5" />
        ) : (
          <ChevronRight className="size-3.5" />
        )}
      </Button>
      
      {isExpanded && (
        <div className="p-3 border-t bg-background/50 text-sm text-muted-foreground">
          {normalizedReasoning ? (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-muted prose-pre:border">
              <ReactMarkdown>{normalizedReasoning}</ReactMarkdown>
            </div>
          ) : (
            <p className="italic">No reasoning content available.</p>
          )}
        </div>
      )}
    </div>
  );
}


