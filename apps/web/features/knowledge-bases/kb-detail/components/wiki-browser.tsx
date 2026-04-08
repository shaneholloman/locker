"use client";

import { useState, useEffect } from "react";
import { FileText, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { trpc } from "@/lib/trpc/client";
import { ScrollArea } from "@/components/ui/scroll-area";

export function WikiBrowser({
  knowledgeBaseId,
  initialPage,
}: {
  knowledgeBaseId: string;
  initialPage?: string | null;
}) {
  const [selectedPage, setSelectedPage] = useState<string | null>(null);

  useEffect(() => {
    if (initialPage) setSelectedPage(initialPage);
  }, [initialPage]);

  const { data: pages, isLoading: pagesLoading } =
    trpc.knowledgeBases.wikiPages.useQuery({ knowledgeBaseId });

  const { data: pageData, isLoading: pageLoading } =
    trpc.knowledgeBases.wikiPage.useQuery(
      { knowledgeBaseId, pagePath: selectedPage! },
      { enabled: !!selectedPage },
    );

  // Custom renderer for wiki links [[page-slug]]
  const renderContent = (content: string) => {
    // Replace [[page-slug]] with clickable markers
    const processed = content.replace(
      /\[\[([^\]]+)\]\]/g,
      (_, slug) => `[${slug}](wiki://${slug})`,
    );
    return processed;
  };

  return (
    <div className="flex h-full">
      {/* Page list sidebar */}
      <div className="w-56 border-r shrink-0">
        <div className="p-3 border-b">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Pages
          </p>
        </div>
        <ScrollArea className="h-[calc(100%-41px)]">
          {pagesLoading ? (
            <div className="p-3 text-xs text-muted-foreground">Loading...</div>
          ) : !pages || pages.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground">
              No wiki pages yet. Ingest some source documents to create pages.
            </div>
          ) : (
            <div className="p-1">
              {pages.map((page) => (
                <button
                  key={page.path}
                  onClick={() => setSelectedPage(page.path)}
                  className={`w-full text-left px-3 py-1.5 rounded text-sm truncate transition-colors ${
                    selectedPage === page.path
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <FileText className="size-3 inline mr-1.5 -mt-0.5" />
                  {page.title}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Page content */}
      <div className="flex-1 overflow-auto">
        {!selectedPage ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Select a page to view its content.
          </div>
        ) : pageLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : pageData ? (
          <div className="p-6 md:px-10 md:py-8 prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-primary prose-code:before:content-none prose-code:after:content-none prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[0.85em] prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-img:rounded-lg">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              urlTransform={(url) => url}
              components={{
                a: ({ href, children, ...props }) => {
                  if (href?.startsWith("wiki://")) {
                    const slug = href.replace("wiki://", "");
                    const targetPath = slug.endsWith(".md")
                      ? slug
                      : `${slug}.md`;
                    return (
                      <button
                        onClick={() => setSelectedPage(targetPath)}
                        className="text-primary underline cursor-pointer hover:text-primary/80"
                      >
                        {children}
                      </button>
                    );
                  }
                  return (
                    <a href={href} {...props}>
                      {children}
                    </a>
                  );
                },
              }}
            >
              {renderContent(pageData.content)}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Page not found.
          </div>
        )}
      </div>
    </div>
  );
}
