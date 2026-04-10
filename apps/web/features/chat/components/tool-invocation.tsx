"use client";

import { useState } from "react";
import {
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
import { FilePreviewCard, type FilePreviewData } from "./file-preview-card";

interface ToolInvocationData {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  input?: Record<string, unknown>;
  state: string;
  result?: unknown;
  output?: unknown;
}

const TOOL_META: Record<string, { label: string; icon: React.ElementType }> = {
  searchFiles: { label: "Searched files", icon: Search },
  listFiles: { label: "Listed files", icon: FileText },
  getFile: { label: "Retrieved file details", icon: FileText },
  renameFile: { label: "Renamed file", icon: FileText },
  moveFile: { label: "Moved file", icon: FileText },
  deleteFile: { label: "Deleted file", icon: AlertCircle },
  getFileDownloadUrl: { label: "Generated download link", icon: Link },
  listFolders: { label: "Listed folders", icon: FolderPlus },
  createFolder: { label: "Created folder", icon: FolderPlus },
  renameFolder: { label: "Renamed folder", icon: FolderPlus },
  moveFolder: { label: "Moved folder", icon: FolderPlus },
  deleteFolder: { label: "Deleted folder", icon: AlertCircle },
  createShareLink: { label: "Created share link", icon: Link },
  listShareLinks: { label: "Listed share links", icon: Link },
  revokeShareLink: { label: "Revoked share link", icon: Link },
  listTags: { label: "Listed tags", icon: Tag },
  createTag: { label: "Created tag", icon: Tag },
  tagFile: { label: "Tagged file", icon: Tag },
  getWorkspaceInfo: { label: "Retrieved workspace info", icon: Info },
  listMembers: { label: "Listed members", icon: Info },
  listPlugins: { label: "Listed plugins", icon: Plug },
};

function getToolMeta(toolName: string) {
  return TOOL_META[toolName] ?? { label: toolName, icon: Info };
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
    case "createShareLink":
      return r.shareUrl ? `Share link: ${r.shareUrl}` : null;
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
      return r.downloadUrl ? "Download URL ready" : null;
    default:
      return r.success ? "Done" : null;
  }
}

/** Extract file objects from tool results that tools like searchFiles/listFiles return. */
function extractFiles(
  toolName: string,
  result: unknown,
): FilePreviewData[] | null {
  if (!result || typeof result !== "object") return null;
  const r = result as Record<string, unknown>;

  // searchFiles and listFiles return { files: [...] }
  if (
    (toolName === "searchFiles" || toolName === "listFiles") &&
    Array.isArray(r.files)
  ) {
    return (r.files as any[])
      .filter((f) => f.id && f.name && f.mimeType)
      .slice(0, 6)
      .map((f) => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        size: Number(f.size ?? 0),
        snippet: f.snippet ?? null,
      }));
  }

  // getFile returns { file: {...} }
  if (toolName === "getFile" && r.file && typeof r.file === "object") {
    const f = r.file as any;
    if (f.id && f.name && f.mimeType) {
      return [
        {
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          size: Number(f.size ?? 0),
        },
      ];
    }
  }

  return null;
}

export function ToolInvocation({
  invocation,
  onFileClick,
}: {
  invocation: ToolInvocationData;
  onFileClick?: (fileId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = getToolMeta(invocation.toolName);

  // AI SDK v6 uses "output-available" + output; our DB uses "result" + result
  const isComplete =
    invocation.state === "result" || invocation.state === "output-available";
  const toolOutput = invocation.output ?? invocation.result;
  const toolInput = invocation.input ?? invocation.args;
  const hasResult = toolOutput != null;
  const resultSummary = hasResult
    ? formatToolResult(invocation.toolName, toolOutput)
    : null;
  const hasError =
    hasResult &&
    typeof toolOutput === "object" &&
    (toolOutput as any)?.error;

  // Extract file preview cards from results
  const fileCards = hasResult
    ? extractFiles(invocation.toolName, toolOutput)
    : null;

  return (
    <div className="my-3">
      {/* Collapsed row — subtle, inline */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="group/tool flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {isComplete ? (
          hasError ? (
            <AlertCircle className="size-3.5 text-destructive shrink-0" />
          ) : (
            <CheckCircle2 className="size-3.5 text-primary/60 shrink-0" />
          )
        ) : (
          <Loader2 className="size-3.5 animate-spin shrink-0" />
        )}

        <span>
          {isComplete && resultSummary ? resultSummary : meta.label}
        </span>

        <ChevronRight
          className={cn(
            "size-3 transition-transform",
            expanded && "rotate-90",
          )}
        />
      </button>

      {/* File preview cards — shown inline when tool returns files */}
      {fileCards && fileCards.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {fileCards.map((file) => (
            <FilePreviewCard
              key={file.id}
              file={file}
              onClick={() => onFileClick?.(file.id)}
            />
          ))}
        </div>
      )}

      {/* Expanded raw details */}
      {expanded && (
        <div className="mt-2 ml-6 space-y-2 text-xs">
          {toolInput &&
            typeof toolInput === "object" &&
            Object.keys(toolInput as object).length > 0 && (
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Input
                </span>
                <pre className="mt-1 rounded-lg bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground overflow-auto max-h-[200px]">
                  {JSON.stringify(toolInput, null, 2)}
                </pre>
              </div>
            )}

          {hasResult && (
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Output
              </span>
              <pre className="mt-1 rounded-lg bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground overflow-auto max-h-[300px]">
                {JSON.stringify(toolOutput, null, 2)}
              </pre>
            </div>
          )}

          {(!toolInput ||
            typeof toolInput !== "object" ||
            Object.keys(toolInput as object).length === 0) &&
            !hasResult && (
              <span className="text-[11px] text-muted-foreground italic">
                No details available
              </span>
            )}
        </div>
      )}
    </div>
  );
}
