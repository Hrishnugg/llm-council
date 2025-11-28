import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FinalResponse {
  model: string;
  response: string;
}

interface Stage3PanelProps {
  finalResponse: FinalResponse;
}

export function Stage3Panel({ finalResponse }: Stage3PanelProps) {
  if (!finalResponse) return null;

  return (
    <Card className="w-full mt-4 border-l-4 border-l-green-500 bg-green-50/30 dark:bg-green-900/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Stage 3: Final Council Answer</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-green-600 dark:text-green-400">
          Chairman: {finalResponse.model.split('/')[1] || finalResponse.model}
        </div>
        <div className="prose dark:prose-invert max-w-none">
          <ReactMarkdown>{finalResponse.response}</ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
}

