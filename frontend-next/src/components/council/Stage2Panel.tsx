import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface Ranking {
  model: string;
  ranking: string;
  parsed_ranking: string[];
}

interface AggregateRanking {
  model: string;
  average_rank: number;
  rankings_count: number;
}

interface Stage2PanelProps {
  rankings: Ranking[];
  labelToModel: Record<string, string>;
  aggregateRankings: AggregateRanking[];
}

function deAnonymizeText(text: string, labelToModel: Record<string, string>) {
  if (!labelToModel) return text;

  let result = text;
  // Replace each "Response X" with the actual model name
  Object.entries(labelToModel).forEach(([label, model]) => {
    const modelShortName = model.split('/')[1] || model;
    result = result.replace(new RegExp(label, 'g'), `**${modelShortName}**`);
  });
  return result;
}

export function Stage2Panel({ rankings, labelToModel, aggregateRankings }: Stage2PanelProps) {
  if (!rankings || rankings.length === 0) return null;

  return (
    <Card className="w-full mt-4 border-l-4 border-l-purple-500">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Stage 2: Peer Rankings</CardTitle>
        <CardDescription>
          Each model evaluated all responses. Bold names are de-anonymized for readability.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="0" className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0 mb-2">
            {rankings.map((rank, index) => (
              <TabsTrigger 
                key={index} 
                value={index.toString()}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border px-3 py-1"
              >
                {rank.model.split('/')[1] || rank.model}
              </TabsTrigger>
            ))}
          </TabsList>
          {rankings.map((rank, index) => (
            <TabsContent key={index} value={index.toString()} className="mt-0">
              <div className="p-4 bg-muted/50 rounded-md text-sm">
                <div className="font-bold mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                  {rank.model}
                </div>
                <div className="prose dark:prose-invert max-w-none mb-4">
                  <ReactMarkdown>
                    {deAnonymizeText(rank.ranking, labelToModel)}
                  </ReactMarkdown>
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
          ))}
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

