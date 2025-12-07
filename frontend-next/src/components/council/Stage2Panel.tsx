"use client";

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface Ranking {
  model: string;
  ranking: string;
  parsed_ranking: string[];
  reasoning?: string;
}

interface StreamingModel {
  model: string;
  content: string;
  reasoning?: string;
  isStreaming: boolean;
  isComplete: boolean;
}

interface AggregateRanking {
  model: string;
  average_rank: number;
  rankings_count: number;
}

interface Stage2PanelProps {
  rankings: Ranking[];
  labelToModel?: Record<string, string>;
  aggregateRankings?: AggregateRanking[];
  streamingRankings?: Record<string, StreamingModel>;
  isStreaming?: boolean;
}

function deAnonymizeText(text: string, labelToModel?: Record<string, string>) {
  if (!labelToModel || !text) return text;

  let result = text;
  // Replace each "Response X" with the actual model name
  Object.entries(labelToModel).forEach(([label, model]) => {
    const modelShortName = model.split('/')[1] || model;
    result = result.replace(new RegExp(label, 'g'), `**${modelShortName}**`);
  });
  return result;
}

export function Stage2Panel({ rankings, labelToModel, aggregateRankings, streamingRankings, isStreaming }: Stage2PanelProps) {
  const [activeTab, setActiveTab] = useState<string>("0");
  
  // Combine completed rankings with streaming ones
  const allModels: (Ranking | (StreamingModel & { parsed_ranking?: string[] }))[] = [];
  
  if (rankings && rankings.length > 0) {
    allModels.push(...rankings);
  } else if (streamingRankings) {
    const streamingModels = Object.values(streamingRankings);
    allModels.push(...streamingModels.map(s => ({
      model: s.model,
      ranking: s.content,
      content: s.content,
      reasoning: s.reasoning,
      isStreaming: s.isStreaming,
      isComplete: s.isComplete,
      parsed_ranking: []
    })));
  }
  
  // Auto-select first streaming model
  useEffect(() => {
    if (streamingRankings) {
      const models = Object.keys(streamingRankings);
      if (models.length > 0 && activeTab === "0") {
        const firstActiveModel = models.find(m => 
          streamingRankings[m].isStreaming || streamingRankings[m].content
        );
        if (firstActiveModel) {
          const index = models.indexOf(firstActiveModel);
          setActiveTab(index.toString());
        }
      }
    }
  }, [streamingRankings, activeTab]);
  
  // Don't render if nothing to show
  if (allModels.length === 0 && !isStreaming) return null;
  
  // Show loading state
  if (allModels.length === 0 && isStreaming) {
    return (
      <Card className="w-full mt-4 border-l-4 border-l-purple-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            Stage 2: Peer Rankings
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground animate-pulse">
            Waiting for models to evaluate...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full mt-4 border-l-4 border-l-purple-500">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          Stage 2: Peer Rankings
          {isStreaming && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </CardTitle>
        <CardDescription>
          Each model evaluated all responses. Bold names are de-anonymized for readability.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0 mb-2">
            {allModels.map((rank, index) => {
              const isModelStreaming = 'isStreaming' in rank && rank.isStreaming;
              const modelName = rank.model.split('/')[1] || rank.model;
              
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
          {allModels.map((rank, index) => {
            const isModelStreaming = 'isStreaming' in rank && rank.isStreaming;
            const content = 'ranking' in rank ? rank.ranking : rank.content;
            
            return (
              <TabsContent key={index} value={index.toString()} className="mt-0">
                <div className="p-4 bg-muted/50 rounded-md text-sm">
                  <div className="font-bold mb-2 text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    {rank.model}
                    {isModelStreaming && (
                      <span className="text-green-500 font-normal normal-case">streaming...</span>
                    )}
                  </div>
                  <div className="prose dark:prose-invert max-w-none mb-4">
                    {content ? (
                      <>
                        <ReactMarkdown>
                          {deAnonymizeText(content, labelToModel)}
                        </ReactMarkdown>
                        {isModelStreaming && (
                          <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5" />
                        )}
                      </>
                    ) : isModelStreaming ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Generating evaluation...</span>
                      </div>
                    ) : null}
                  </div>

                  {rank.parsed_ranking && rank.parsed_ranking.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="font-semibold mb-2 text-xs text-muted-foreground">EXTRACTED RANKING</div>
                      <ol className="list-decimal list-inside space-y-1">
                        {rank.parsed_ranking.map((label, i) => (
                          <li key={i} className="text-sm">
                            {labelToModel && labelToModel[label]
                              ? labelToModel[label].split('/')[1] || labelToModel[label]
                              : label}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>

        {aggregateRankings && aggregateRankings.length > 0 && (
          <div className="mt-6">
            <h4 className="font-semibold mb-2">Aggregate Rankings (Street Cred)</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Combined results across all peer evaluations (lower score is better):
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {aggregateRankings.map((agg, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-secondary rounded-md text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-primary">#{index + 1}</span>
                    <span className="font-medium">{agg.model.split('/')[1] || agg.model}</span>
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    <div>Avg: {agg.average_rank.toFixed(2)}</div>
                    <div>({agg.rankings_count} votes)</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
