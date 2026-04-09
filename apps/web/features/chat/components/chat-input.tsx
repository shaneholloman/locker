"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import {
  ArrowUp,
  Square,
  ChevronDown,
  Sparkles,
  Paperclip,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const AVAILABLE_MODELS = [
  { id: "openai/gpt-4o", label: "GPT-4o", provider: "OpenAI" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o Mini", provider: "OpenAI" },
  {
    id: "anthropic/claude-sonnet-4-20250514",
    label: "Claude Sonnet 4",
    provider: "Anthropic",
  },
  {
    id: "anthropic/claude-haiku-3-5-20241022",
    label: "Claude 3.5 Haiku",
    provider: "Anthropic",
  },
  {
    id: "google/gemini-2.0-flash",
    label: "Gemini 2.0 Flash",
    provider: "Google",
  },
] as const;

export type ModelId = (typeof AVAILABLE_MODELS)[number]["id"];

export interface ChatAttachment {
  file: File;
  preview?: string;
}

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  model: ModelId;
  onModelChange: (model: ModelId) => void;
  disabled?: boolean;
  isSending?: boolean;
  placeholder?: string;
  attachments?: ChatAttachment[];
  onAttach?: (files: FileList) => void;
  onRemoveAttachment?: (index: number) => void;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  model,
  onModelChange,
  disabled = false,
  isSending = false,
  placeholder = "Ask Locker anything...",
  attachments = [],
  onAttach,
  onRemoveAttachment,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const canSubmit = (value.trim().length > 0 || attachments.length > 0) && !disabled;

  useEffect(() => {
    if (!disabled) textareaRef.current?.focus();
  }, [disabled]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && canSubmit && !isSending) {
      e.preventDefault();
      onSubmit();
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit && !isSending) {
      onSubmit();
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    }
  };

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && onAttach) {
        onAttach(e.target.files);
        e.target.value = "";
      }
    },
    [onAttach],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files.length > 0 && onAttach) {
        onAttach(e.dataTransfer.files);
      }
    },
    [onAttach],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const selectedModel =
    AVAILABLE_MODELS.find((m) => m.id === model) ?? AVAILABLE_MODELS[0];

  return (
    <div className="border-t bg-background px-4 py-3">
      <form
        onSubmit={handleSubmit}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="mx-auto max-w-3xl"
      >
        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((att, idx) => (
              <div
                key={idx}
                className="group/att relative flex items-center gap-1.5 rounded-lg border bg-muted/50 px-2.5 py-1.5 text-xs"
              >
                {att.preview ? (
                  <img
                    src={att.preview}
                    alt={att.file.name}
                    className="size-8 rounded object-cover"
                  />
                ) : (
                  <Paperclip className="size-3.5 text-muted-foreground" />
                )}
                <span className="max-w-[120px] truncate text-foreground">
                  {att.file.name}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveAttachment?.(idx)}
                  className="ml-0.5 flex size-4 items-center justify-center rounded-full bg-muted-foreground/20 text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-colors"
                >
                  <X className="size-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Main input container */}
        <div
          className={cn(
            "flex items-end gap-2 rounded-xl border bg-muted/30 px-3 py-2.5 transition-all",
            isFocused
              ? "border-primary/40 ring-2 ring-primary/10"
              : "border-border",
            disabled && "opacity-50",
          )}
        >
          {/* Attach button */}
          {onAttach && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors pb-0.5"
                title="Attach files"
              >
                <Paperclip className="size-4" />
              </button>
            </>
          )}

          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="max-h-[200px] min-h-[32px] pt-1 flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            style={{ boxShadow: "none" }}
          />

          {/* Send / Stop button */}
          <div className="flex items-center gap-1 pb-0.5">
            {isSending ? (
              <button
                type="button"
                className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
                title="Generating..."
              >
                <Square className="size-3" fill="currentColor" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!canSubmit}
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg transition-all active:scale-95",
                  canSubmit
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <ArrowUp className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Footer: model selector + keyboard hints */}
        <div className="mt-2 flex items-center justify-between">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Sparkles className="size-3" />
                <span>{selectedModel.label}</span>
                <ChevronDown className="size-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {AVAILABLE_MODELS.map((m) => (
                <DropdownMenuItem
                  key={m.id}
                  onSelect={() => onModelChange(m.id)}
                  className={cn(m.id === model && "bg-accent")}
                >
                  <div className="flex flex-col">
                    <span className="text-sm">{m.label}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {m.provider}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <span className="text-[10px] text-muted-foreground">
            Enter to send &middot; Shift+Enter for newline
          </span>
        </div>
      </form>
    </div>
  );
}
