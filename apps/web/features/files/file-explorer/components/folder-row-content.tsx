"use client";

import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Share2,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { FileIcon } from "@/components/file-icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DroppableFolderRow } from "./droppable-folder-row";

const ROW_GRID =
  "grid grid-cols-[1fr_40px] sm:grid-cols-[1fr_100px_140px_40px] gap-4 px-4 py-2.5 border-b last:border-b-0";

type PluginAction = {
  workspacePluginId: string;
  actionId: string;
  label: string;
};

export function FolderRowContent({
  folder,
  pluginActions,
  onDrop,
  onClick,
  onRename,
  onShare,
  onTrack,
  onDelete,
  onPluginAction,
}: {
  folder: { id: string; name: string; updatedAt: Date };
  pluginActions: PluginAction[];
  onDrop: (
    item: { id: string; type: "file" | "folder" },
    targetFolderId: string,
  ) => void;
  onClick: () => void;
  onRename: () => void;
  onShare: () => void;
  onTrack: () => void;
  onDelete: () => void;
  onPluginAction: (action: PluginAction) => void;
}) {
  return (
    <DroppableFolderRow
      folderId={folder.id}
      folderName={folder.name}
      onDrop={onDrop}
      onClick={onClick}
      className={cn(
        ROW_GRID,
        "hover:bg-muted/50 cursor-pointer group transition-colors",
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <FileIcon name={folder.name} isFolder className="size-4 shrink-0" />
        <span className="text-sm font-medium truncate">{folder.name}</span>
      </div>
      <div className="hidden sm:flex items-center gap-1.5">
        <span className="text-xs font-mono text-muted-foreground">&mdash;</span>
      </div>
      <div className="hidden sm:flex items-center gap-1.5">
        <span className="text-xs font-mono text-muted-foreground">
          {formatDate(folder.updatedAt)}
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
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </DroppableFolderRow>
  );
}
