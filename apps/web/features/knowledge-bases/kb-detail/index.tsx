"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  ArrowLeft,
  RefreshCw,
  Search,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useWorkspace } from "@/lib/workspace-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ChatPanel } from "./components/chat-panel";
import { WikiBrowser } from "./components/wiki-browser";
import { SourceList } from "./components/source-list";
import { KBSettings } from "./components/kb-settings";
import { LintResults, type LintResult } from "./components/lint-results";

export function KBDetailPage({ id }: { id: string }) {
  const workspace = useWorkspace();
  const prefix = `/w/${workspace.slug}`;
  const utils = trpc.useUtils();

  const { data: kb, isLoading } = trpc.knowledgeBases.get.useQuery({ id });
  const [lintResults, setLintResults] = useState<LintResult | null>(null);
  const [activeTab, setActiveTab] = useState("chat");

  const ingestAllMutation = trpc.knowledgeBases.ingestAll.useMutation({
    onSuccess: (result) => {
      utils.knowledgeBases.get.invalidate({ id });
      utils.knowledgeBases.wikiPages.invalidate({ knowledgeBaseId: id });
      toast.success(
        `Ingested ${result.filesProcessed} files: ${result.pagesCreated} pages created, ${result.pagesUpdated} updated${result.errors ? `, ${result.errors} errors` : ""}`,
      );
    },
    onError: (error) => toast.error(error.message),
  });

  const lintMutation = trpc.knowledgeBases.lint.useMutation({
    onSuccess: (result) => {
      setLintResults(result);
      utils.knowledgeBases.get.invalidate({ id });
      toast.success(`Lint complete: ${result.issues.length} issues found`);
    },
    onError: (error) => toast.error(error.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!kb) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Knowledge base not found.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
        <Link
          href={`${prefix}/knowledge-bases`}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <BookOpen className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium truncate">{kb.name}</span>
        <Badge
          variant="secondary"
          className="text-[10px]"
          style={
            kb.tagColor
              ? {
                  backgroundColor: `${kb.tagColor}20`,
                  color: kb.tagColor,
                  borderColor: `${kb.tagColor}40`,
                }
              : undefined
          }
        >
          {kb.tagName}
        </Badge>

        <div className="flex-1" />

        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            ingestAllMutation.mutate({ knowledgeBaseId: id })
          }
          disabled={ingestAllMutation.isPending}
        >
          {ingestAllMutation.isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
          Ingest All
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => lintMutation.mutate({ knowledgeBaseId: id })}
          disabled={lintMutation.isPending}
        >
          {lintMutation.isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Search className="size-3.5" />
          )}
          Lint
        </Button>
      </header>

      <div className="flex-1 overflow-hidden">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col h-full"
        >
          <div className="border-b px-4">
            <TabsList className="h-10 bg-transparent p-0 gap-4">
              <TabsTrigger
                value="chat"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                Chat
              </TabsTrigger>
              <TabsTrigger
                value="wiki"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                Wiki
              </TabsTrigger>
              <TabsTrigger
                value="sources"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                Sources
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                Settings
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="chat" className="flex-1 overflow-hidden mt-0">
            <ChatPanel knowledgeBaseId={id} />
          </TabsContent>
          <TabsContent value="wiki" className="flex-1 overflow-hidden mt-0">
            <WikiBrowser knowledgeBaseId={id} />
          </TabsContent>
          <TabsContent value="sources" className="flex-1 overflow-auto mt-0">
            <SourceList knowledgeBaseId={id} />
          </TabsContent>
          <TabsContent
            value="settings"
            className="flex-1 overflow-auto mt-0"
          >
            <KBSettings knowledgeBaseId={id} />
          </TabsContent>
        </Tabs>
      </div>

      {lintResults && lintResults.issues.length > 0 && (
        <LintResults
          results={lintResults}
          onClose={() => setLintResults(null)}
          onNavigateToPage={(pagePath) => {
            setActiveTab("wiki");
          }}
        />
      )}
    </div>
  );
}
