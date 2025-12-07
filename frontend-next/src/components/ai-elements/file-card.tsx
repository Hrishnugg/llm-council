"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FileUIPart } from "ai";
import { FileTextIcon, ImageIcon, XIcon, FileIcon, FileSpreadsheetIcon, FileCodeIcon } from "lucide-react";
import type { HTMLAttributes } from "react";
import { usePromptInputAttachments } from "./prompt-input";

export type FileCardProps = HTMLAttributes<HTMLDivElement> & {
  data: FileUIPart & { id: string };
  onRemove?: () => void;
};

function getFileIcon(mediaType?: string, filename?: string) {
  if (mediaType?.startsWith("image/")) {
    return ImageIcon;
  }
  if (mediaType === "application/pdf" || filename?.endsWith(".pdf")) {
    return FileTextIcon;
  }
  if (mediaType?.includes("spreadsheet") || filename?.match(/\.(csv|xlsx?|xls)$/i)) {
    return FileSpreadsheetIcon;
  }
  if (mediaType?.includes("json") || filename?.match(/\.(json|js|ts|tsx|jsx|py|rb|go|rs)$/i)) {
    return FileCodeIcon;
  }
  if (mediaType?.startsWith("text/") || filename?.match(/\.(txt|md|markdown)$/i)) {
    return FileTextIcon;
  }
  return FileIcon;
}

function getFileTypeLabel(mediaType?: string, filename?: string): string {
  if (mediaType?.startsWith("image/")) {
    return mediaType.split("/")[1]?.toUpperCase() || "IMAGE";
  }
  if (mediaType === "application/pdf" || filename?.endsWith(".pdf")) {
    return "PDF";
  }
  if (filename?.endsWith(".csv")) return "CSV";
  if (filename?.match(/\.xlsx?$/i)) return "EXCEL";
  if (filename?.endsWith(".json")) return "JSON";
  if (filename?.endsWith(".md")) return "MARKDOWN";
  if (filename?.endsWith(".txt")) return "TEXT";
  if (mediaType?.startsWith("text/")) return "TEXT";
  return "FILE";
}

export function FileCard({ data, onRemove, className, ...props }: FileCardProps) {
  const attachments = usePromptInputAttachments();
  const isImage = data.mediaType?.startsWith("image/");
  const Icon = getFileIcon(data.mediaType, data.filename);
  const typeLabel = getFileTypeLabel(data.mediaType, data.filename);
  
  const handleRemove = () => {
    if (onRemove) {
      onRemove();
    } else {
      attachments.remove(data.id);
    }
  };

  // For images, show a thumbnail preview
  if (isImage && data.url) {
    return (
      <div
        className={cn(
          "group relative flex h-20 w-28 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/50",
          className
        )}
        {...props}
      >
        <img
          src={data.url}
          alt={data.filename || "Image"}
          className="h-full w-full object-cover"
        />
        <Button
          variant="secondary"
          size="icon"
          className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full opacity-0 shadow-md transition-opacity group-hover:opacity-100"
          onClick={handleRemove}
        >
          <XIcon className="h-3 w-3" />
        </Button>
        {/* Loading indicator overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 opacity-0 transition-opacity">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  // For non-image files, show a card with icon
  return (
    <div
      className={cn(
        "group relative flex h-20 w-44 flex-shrink-0 items-start gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50",
        className
      )}
      {...props}
    >
      {/* File icon */}
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-red-500/10 text-red-500">
        <Icon className="h-5 w-5" />
      </div>
      
      {/* File info */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium leading-tight" title={data.filename}>
          {data.filename || "Untitled"}
        </span>
        <span className="text-xs text-muted-foreground">{typeLabel}</span>
      </div>

      {/* Remove button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-muted opacity-0 shadow-sm transition-opacity hover:bg-destructive hover:text-destructive-foreground group-hover:opacity-100"
        onClick={handleRemove}
      >
        <XIcon className="h-3 w-3" />
      </Button>
    </div>
  );
}

export type FileCardsContainerProps = HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
};

export function FileCardsContainer({ children, className, ...props }: FileCardsContainerProps) {
  return (
    <div
      className={cn(
        "flex w-full gap-2 overflow-x-auto p-3 pb-2 scrollbar-none",
        className
      )}
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      {...props}
    >
      {children}
    </div>
  );
}

