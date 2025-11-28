import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Response {
  model: string;
  response: string;
}

interface Stage1PanelProps {
  responses: Response[];
}

export function Stage1Panel({ responses }: Stage1PanelProps) {
  if (!responses || responses.length === 0) return null;

  return (
    <Card className="w-full mt-4 border-l-4 border-l-blue-500">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Stage 1: Individual Responses</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="0" className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0 mb-2">
            {responses.map((resp, index) => (
              <TabsTrigger 
                key={index} 
                value={index.toString()}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border px-3 py-1"
              >
                {resp.model.split('/')[1] || resp.model}
              </TabsTrigger>
            ))}
          </TabsList>
          {responses.map((resp, index) => (
            <TabsContent key={index} value={index.toString()} className="mt-0">
              <div className="p-4 bg-muted/50 rounded-md text-sm">
                <div className="font-bold mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                  {resp.model}
                </div>
                <div className="prose dark:prose-invert max-w-none">
                  <ReactMarkdown>{resp.response}</ReactMarkdown>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

