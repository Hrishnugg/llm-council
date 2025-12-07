"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageReasoning } from "@/components/ai-elements/message-reasoning";
import { Loader2 } from "lucide-react";

interface FinalResponse {
  model: string;
  response: string;
  reasoning?: string;
}

interface StreamingModel {
  model: string;
  content: string;
  reasoning?: string;
  isStreaming: boolean;
  isComplete: boolean;
}

interface Stage3PanelProps {
  finalResponse?: FinalResponse;
  streamingResponse?: StreamingModel;
  isStreaming?: boolean;
}

export function Stage3Panel({ finalResponse, streamingResponse, isStreaming }: Stage3PanelProps) {
  // Use final response if available, otherwise use streaming
  const response = finalResponse || (streamingResponse ? {
    model: streamingResponse.model,
    response: streamingResponse.content,
    reasoning: streamingResponse.reasoning
  } : null);
  
  const isCurrentlyStreaming = !finalResponse && streamingResponse?.isStreaming;
  
  // Don't render if nothing to show
  if (!response && !isStreaming) return null;
  
  // Show loading state if streaming but no content yet
  if (!response?.response && isStreaming) {
    return (
      <Card className="w-full mt-4 border-l-4 border-l-green-500 bg-green-50/30 dark:bg-green-900/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            Stage 3: Final Council Answer
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground animate-pulse">
            Chairman is synthesizing the final answer...
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!response) return null;

  return (
    <Card className="w-full mt-4 border-l-4 border-l-green-500 bg-green-50/30 dark:bg-green-900/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          Stage 3: Final Council Answer
          {isCurrentlyStreaming && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-green-600 dark:text-green-400 flex items-center gap-2">
          Chairman: {response.model ? (response.model.split('/')[1] || response.model) : 'Loading...'}
          {isCurrentlyStreaming && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
          )}
        </div>
        
        {response.reasoning && (
          <MessageReasoning reasoning={response.reasoning} className="mb-4" />
        )}
        
        <div className="prose dark:prose-invert max-w-none">
          {response.response ? (
            <>
              <ReactMarkdown>{response.response}</ReactMarkdown>
              {isCurrentlyStreaming && (
                <span className="inline-block w-2 h-4 bg-green-500 animate-pulse ml-0.5" />
              )}
            </>
          ) : isCurrentlyStreaming ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Generating synthesis...</span>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
