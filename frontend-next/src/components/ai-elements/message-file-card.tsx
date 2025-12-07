"use client";

import { cn } from "@/lib/utils";
import type { FileUIPart } from "ai";
import { FileTextIcon, ImageIcon, FileIcon, FileSpreadsheetIcon, FileCodeIcon } from "lucide-react";
import type { HTMLAttributes } from "react";

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

export type MessageFileCardProps = HTMLAttributes<HTMLDivElement> & {
  data: FileUIPart;
};

export function MessageFileCard({ data, className, ...props }: MessageFileCardProps) {
  const isImage = data.mediaType?.startsWith("image/");
  const Icon = getFileIcon(data.mediaType, data.filename);
  const typeLabel = getFileTypeLabel(data.mediaType, data.filename);

  // For images, show a thumbnail preview
  if (isImage && data.url) {
    return (
      <div
        className={cn(
          "relative h-24 w-32 overflow-hidden rounded-lg border bg-muted/50",
          className
        )}
        {...props}
      >
        <img
          src={data.url}
          alt={data.filename || "Image"}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  // For non-image files, show a compact card
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-card px-4 py-3",
        className
      )}
      {...props}
    >
      {/* File icon */}
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
        <Icon className="h-5 w-5" />
      </div>
      
      {/* File info */}
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium max-w-[200px]" title={data.filename}>
          {data.filename || "Untitled"}
        </span>
        <span className="text-xs text-muted-foreground">{typeLabel}</span>
      </div>
    </div>
  );
}

export type MessageFileCardsProps = HTMLAttributes<HTMLDivElement> & {
  files: FileUIPart[];
};

export function MessageFileCards({ files, className, ...props }: MessageFileCardsProps) {
  if (!files || files.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2 mb-2",
        className
      )}
      {...props}
    >
      {files.map((file, idx) => (
        <MessageFileCard key={idx} data={file} />
      ))}
    </div>
  );
}

