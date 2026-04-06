"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TagFilterBar({
  tags,
  selectedTagIds,
  onToggle,
  onClear,
}: {
  tags: { id: string; name: string; color: string | null }[];
  selectedTagIds: string[];
  onToggle: (tagId: string) => void;
  onClear: () => void;
}) {
  if (tags.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto py-1">
      <span className="text-xs text-muted-foreground shrink-0">Filter:</span>
      {tags.map((tag) => {
        const isActive = selectedTagIds.includes(tag.id);
        const color = tag.color ?? "#6b7280";
        return (
          <button
            key={tag.id}
            onClick={() => onToggle(tag.id)}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors shrink-0"
            style={
              isActive
                ? {
                    backgroundColor: `${color}25`,
                    color,
                    outline: `1.5px solid ${color}`,
                  }
                : { backgroundColor: `${color}10`, color: `${color}aa` }
            }
          >
            <div
              className="size-2 rounded-full"
              style={{ backgroundColor: color }}
            />
            {tag.name}
          </button>
        );
      })}
      {selectedTagIds.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-6 px-2 text-xs text-muted-foreground shrink-0"
        >
          <X className="size-3" />
          Clear
        </Button>
      )}
    </div>
  );
}
