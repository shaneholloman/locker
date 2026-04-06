"use client";

import {
  MoreVertical,
  Pencil,
  Trash2,
  Share2,
  BarChart3,
  Sparkles,
  Folder,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type PluginAction = {
  workspacePluginId: string;
  actionId: string;
  label: string;
};

export function FolderGridCard({
  folder,
  pluginActions,
  onClick,
  onRename,
  onShare,
  onTrack,
  onDelete,
  onPluginAction,
}: {
  folder: { id: string; name: string; updatedAt: Date };
  pluginActions: PluginAction[];
  onClick: () => void;
  onRename: () => void;
  onShare: () => void;
  onTrack: () => void;
  onDelete: () => void;
  onPluginAction: (action: PluginAction) => void;
}) {
  return (
    <div
      onClick={onClick}
      className="group flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5 transition-colors hover:bg-muted/50 cursor-pointer"
    >
      <Folder className="size-5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium truncate block">
          {folder.name}
        </span>
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="opacity-0 group-hover:opacity-100 shrink-0"
            >
              <MoreVertical className="size-4" />
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
    </div>
  );
}
