"use client";

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageReasoning } from "@/components/ai-elements/message-reasoning";
import { Loader2 } from "lucide-react";

interface Response {
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

interface Stage1PanelProps {
  responses: Response[];
  streamingResponses?: Record<string, StreamingModel>;
  isStreaming?: boolean;
}

export function Stage1Panel({ responses, streamingResponses, isStreaming }: Stage1PanelProps) {
  const [activeTab, setActiveTab] = useState<string>("0");
  
  // Combine completed responses with streaming ones
  const allModels: (Response | StreamingModel)[] = [];
  
  if (responses && responses.length > 0) {
    // Use completed responses
    allModels.push(...responses);
  } else if (streamingResponses) {
    // Use streaming responses
    const streamingModels = Object.values(streamingResponses);
    allModels.push(...streamingModels.map(s => ({
      model: s.model,
      response: s.content,
      reasoning: s.reasoning,
      isStreaming: s.isStreaming,
      isComplete: s.isComplete
    })));
  }
  
  // Auto-select first streaming model when it starts
  useEffect(() => {
    if (streamingResponses) {
      const models = Object.keys(streamingResponses);
      if (models.length > 0 && activeTab === "0") {
        // Find first model that's streaming or has content
        const firstActiveModel = models.find(m => 
          streamingResponses[m].isStreaming || streamingResponses[m].content
        );
        if (firstActiveModel) {
          const index = models.indexOf(firstActiveModel);
          setActiveTab(index.toString());
        }
      }
    }
  }, [streamingResponses, activeTab]);
  
  // Don't render if nothing to show
  if (allModels.length === 0 && !isStreaming) return null;
  
  // Show loading state if streaming but no models yet
  if (allModels.length === 0 && isStreaming) {
    return (
      <Card className="w-full mt-4 border-l-4 border-l-blue-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            Stage 1: Individual Responses
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground animate-pulse">
            Waiting for models to respond...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full mt-4 border-l-4 border-l-blue-500">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          Stage 1: Individual Responses
          {isStreaming && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0 mb-2">
            {allModels.map((resp, index) => {
              const isModelStreaming = 'isStreaming' in resp && resp.isStreaming;
              const modelName = resp.model.split('/')[1] || resp.model;
              
              return (
                <TabsTrigger 
                  key={index} 
                  value={index.toString()}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border px-3 py-1 flex items-center gap-1.5"
                >
                  {modelName}
                  {isModelStreaming && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
          {allModels.map((resp, index) => {
            const isModelStreaming = 'isStreaming' in resp && resp.isStreaming;
            const content = 'response' in resp ? resp.response : resp.content;
            const reasoning = resp.reasoning;
            
            return (
              <TabsContent key={index} value={index.toString()} className="mt-0">
                <div className="p-4 bg-muted/50 rounded-md text-sm">
                  <div className="font-bold mb-2 text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    {resp.model}
                    {isModelStreaming && (
                      <span className="text-green-500 font-normal normal-case">streaming...</span>
                    )}
                  </div>
                  {reasoning && (
                    <MessageReasoning reasoning={reasoning} className="mb-4" />
                  )}
                  <div className="prose dark:prose-invert max-w-none">
                    {content ? (
                      <ReactMarkdown>{content}</ReactMarkdown>
                    ) : isModelStreaming ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Generating response...</span>
                      </div>
                    ) : null}
                    {isModelStreaming && content && (
                      <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5" />
                    )}
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}
