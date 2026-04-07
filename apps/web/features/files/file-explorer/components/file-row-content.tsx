"use client";

import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Share2,
  Download,
  BarChart3,
  Sparkles,
  FileText,
  Loader2,
  Tag,
} from "lucide-react";
import { cn, formatBytes, formatDate } from "@/lib/utils";
import { FileIcon } from "@/components/file-icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TagBadge } from "@/components/tag-badge";
import { Avatar } from "@/components/avatar";
import { isTextIndexable } from "@locker/common";
import { DraggableFileRow } from "./draggable-file-row";

const ROW_GRID =
  "grid grid-cols-[1fr_40px] sm:grid-cols-[1fr_100px_140px_40px] gap-4 px-4 py-2.5 border-b last:border-b-0";

type PluginAction = {
  workspacePluginId: string;
  actionId: string;
  label: string;
};

type FileTag = { id: string; name: string; color: string | null };

export function FileRowContent({
  file,
  uploader,
  tags,
  transcriptionStatus,
  pluginActions,
  onClick,
  onDownload,
  onRename,
  onShare,
  onTrack,
  onEditTags,
  onDelete,
  onPluginAction,
  onViewTranscription,
  onGenerateTranscription,
}: {
  file: {
    id: string;
    name: string;
    mimeType: string;
    size: number;
    updatedAt: Date;
  };
  uploader?: { name: string | null; image: string | null };
  tags: FileTag[];
  transcriptionStatus: string | undefined;
  pluginActions: PluginAction[];
  onClick: () => void;
  onDownload: () => void;
  onRename: () => void;
  onShare: () => void;
  onTrack: () => void;
  onEditTags: () => void;
  onDelete: () => void;
  onPluginAction: (action: PluginAction) => void;
  onViewTranscription: () => void;
  onGenerateTranscription: () => void;
}) {
  return (
    <DraggableFileRow
      fileId={file.id}
      fileName={file.name}
      onClick={onClick}
      className={cn(
        ROW_GRID,
        "hover:bg-muted/50 cursor-pointer group transition-colors",
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <FileIcon
          name={file.name}
          mimeType={file.mimeType}
          className="size-4 shrink-0"
        />
        <span className="text-sm truncate">{file.name}</span>
        {tags.length > 0 && (
          <div className="hidden sm:flex items-center gap-1 shrink-0">
            {tags.slice(0, 3).map((tag) => (
              <TagBadge key={tag.id} name={tag.name} color={tag.color} />
            ))}
            {tags.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="hidden sm:block">
        <span className="text-xs font-mono text-muted-foreground tabular-nums">
          {formatBytes(file.size)}
        </span>
      </div>
      <div className="hidden sm:flex items-center gap-1.5">
        {uploader && (
          <Avatar
            name={uploader.name}
            src={uploader.image}
            className="size-4 rounded-full shrink-0"
            width={16}
          />
        )}
        <span className="text-xs font-mono text-muted-foreground">
          {formatDate(file.updatedAt)}
        </span>
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onDownload}>
              <Download />
              Download
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onRename}>
              <Pencil />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onShare}>
              <Share2 />
              Share
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onTrack}>
              <BarChart3 />
              Track
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onEditTags}>
              <Tag />
              Edit Tags
            </DropdownMenuItem>
            {pluginActions.length > 0 && (
              <>
                <DropdownMenuSeparator />
                {pluginActions.map((action) => (
                  <DropdownMenuItem
                    key={`${action.workspacePluginId}:${action.actionId}`}
                    onSelect={() => onPluginAction(action)}
                  >
                    <Sparkles />
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </>
            )}
            {(() => {
              if (transcriptionStatus === "ready") {
                return (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={onViewTranscription}>
                      <FileText />
                      View Transcription
                    </DropdownMenuItem>
                  </>
                );
              }
              if (transcriptionStatus === "processing") {
                return (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled>
                      <Loader2 className="animate-spin" />
                      Transcription in progress...
                    </DropdownMenuItem>
                  </>
                );
              }
              if (transcriptionStatus === "failed") {
                return (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={onGenerateTranscription}>
                      <FileText />
                      Retry Transcription
                    </DropdownMenuItem>
                  </>
                );
              }
              if (!transcriptionStatus && !isTextIndexable(file.mimeType)) {
                return (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={onGenerateTranscription}>
                      <FileText />
                      Generate Transcription
                    </DropdownMenuItem>
                  </>
                );
              }
              return null;
            })()}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </DraggableFileRow>
  );
}
