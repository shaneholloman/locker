"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FolderPlus,
  Search,
  FileText,
  Link,
  Tag,
  Info,
  Plug,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolInvocationData {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  state: string;
  result?: unknown;
}

const TOOL_META: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  searchFiles: { label: "Searching files", icon: Search, color: "text-blue-500" },
  listFiles: { label: "Listing files", icon: FileText, color: "text-blue-500" },
  getFile: { label: "Getting file details", icon: FileText, color: "text-blue-500" },
  renameFile: { label: "Renaming file", icon: FileText, color: "text-amber-500" },
  moveFile: { label: "Moving file", icon: FileText, color: "text-amber-500" },
  deleteFile: { label: "Deleting file", icon: AlertCircle, color: "text-red-500" },
  getFileDownloadUrl: { label: "Getting download link", icon: Link, color: "text-blue-500" },
  listFolders: { label: "Listing folders", icon: FolderPlus, color: "text-blue-500" },
  createFolder: { label: "Creating folder", icon: FolderPlus, color: "text-green-500" },
  renameFolder: { label: "Renaming folder", icon: FolderPlus, color: "text-amber-500" },
  moveFolder: { label: "Moving folder", icon: FolderPlus, color: "text-amber-500" },
  deleteFolder: { label: "Deleting folder", icon: AlertCircle, color: "text-red-500" },
  createShareLink: { label: "Creating share link", icon: Link, color: "text-green-500" },
  listShareLinks: { label: "Listing share links", icon: Link, color: "text-blue-500" },
  revokeShareLink: { label: "Revoking share link", icon: Link, color: "text-red-500" },
  listTags: { label: "Listing tags", icon: Tag, color: "text-purple-500" },
  createTag: { label: "Creating tag", icon: Tag, color: "text-green-500" },
  tagFile: { label: "Tagging file", icon: Tag, color: "text-purple-500" },
  getWorkspaceInfo: { label: "Getting workspace info", icon: Info, color: "text-blue-500" },
  listMembers: { label: "Listing members", icon: Info, color: "text-blue-500" },
  listPlugins: { label: "Listing plugins", icon: Plug, color: "text-blue-500" },
};

function getToolMeta(toolName: string) {
  return TOOL_META[toolName] ?? { label: toolName, icon: Info, color: "text-muted-foreground" };
}

function formatToolResult(toolName: string, result: unknown): string | null {
  if (!result || typeof result !== "object") return null;
  const r = result as Record<string, unknown>;

  if (r.error) return `Error: ${r.error}`;

  switch (toolName) {
    case "createFolder": {
      const folder = r.folder as any;
      return folder ? `Created folder "${folder.name}"` : null;
    }
    case "createShareLink": {
      return r.shareUrl ? `Share link: ${r.shareUrl}` : null;
    }
    case "searchFiles":
    case "listFiles": {
      const files = r.files as any[];
      if (!files) return null;
      return `Found ${files.length} file${files.length === 1 ? "" : "s"}`;
    }
    case "listFolders": {
      const folders = r.folders as any[];
      if (!folders) return null;
      return `Found ${folders.length} folder${folders.length === 1 ? "" : "s"}`;
    }
    case "deleteFile":
      return r.deletedFile ? `Deleted "${r.deletedFile}"` : "File deleted";
    case "deleteFolder":
      return r.deletedFolder
        ? `Deleted folder "${r.deletedFolder}"`
        : "Folder deleted";
    case "renameFile":
    case "renameFolder": {
      const item = (r.file ?? r.folder) as any;
      return item ? `Renamed to "${item.name}"` : null;
    }
    case "revokeShareLink":
      return "Share link revoked";
    case "createTag": {
      const tag = r.tag as any;
      return tag ? `Created tag "${tag.name}"` : null;
    }
    case "tagFile": {
      const tags = r.tags as any[];
      if (!tags) return null;
      return `Applied ${tags.length} tag${tags.length === 1 ? "" : "s"}`;
    }
    case "getFileDownloadUrl":
      return r.downloadUrl ? `Download URL ready` : null;
    default:
      return r.success ? "Done" : null;
  }
}

export function ToolInvocation({
  invocation,
}: {
  invocation: ToolInvocationData;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = getToolMeta(invocation.toolName);
  const Icon = meta.icon;
  const isComplete = invocation.state === "result";
  const hasResult = invocation.result != null;
  const resultSummary = hasResult
    ? formatToolResult(invocation.toolName, invocation.result)
    : null;
  const hasError =
    hasResult &&
    typeof invocation.result === "object" &&
    (invocation.result as any)?.error;

  return (
    <div className="my-2 rounded-lg border border-border/60 bg-background overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/30 transition-colors"
      >
        {isComplete ? (
          hasError ? (
            <AlertCircle className="size-3.5 text-destructive shrink-0" />
          ) : (
            <CheckCircle2 className="size-3.5 text-green-500 shrink-0" />
          )
        ) : (
          <Loader2 className="size-3.5 animate-spin text-muted-foreground shrink-0" />
        )}

        <Icon className={cn("size-3.5 shrink-0", meta.color)} />

        <span className="text-xs font-medium text-foreground">
          {isComplete && resultSummary
            ? resultSummary
            : meta.label}
        </span>

        <div className="ml-auto">
          {expanded ? (
            <ChevronDown className="size-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border/40 px-3 py-2 space-y-2">
          {/* Arguments */}
          <div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Arguments
            </span>
            <pre className="mt-1 rounded bg-muted/50 px-2 py-1.5 text-[11px] text-muted-foreground overflow-auto max-h-[200px]">
              {JSON.stringify(invocation.args, null, 2)}
            </pre>
          </div>

          {/* Result */}
          {hasResult && (
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Result
              </span>
              <pre className="mt-1 rounded bg-muted/50 px-2 py-1.5 text-[11px] text-muted-foreground overflow-auto max-h-[300px]">
                {JSON.stringify(invocation.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
