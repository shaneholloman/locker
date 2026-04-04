import { and, eq } from "drizzle-orm";
import { workspacePlugins } from "@locker/database";
import type { Database } from "@locker/database";

const FTS_SERVICE_URL = process.env.FTS_SERVICE_URL;
const FTS_API_SECRET = process.env.FTS_API_SECRET;

const INDEXABLE_PREFIXES = ["text/"];
const INDEXABLE_TYPES = new Set([
  "application/json",
  "application/xml",
  "application/javascript",
  "application/typescript",
]);

function shouldIndex(mimeType: string): boolean {
  if (INDEXABLE_PREFIXES.some((p) => mimeType.startsWith(p))) return true;
  return INDEXABLE_TYPES.has(mimeType);
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (FTS_API_SECRET) {
    headers["Authorization"] = `Bearer ${FTS_API_SECRET}`;
  }
  return headers;
}

export const ftsClient = {
  isConfigured(): boolean {
    return !!FTS_SERVICE_URL;
  },

  shouldIndex,

  async isActiveForWorkspace(
    db: Database,
    workspaceId: string,
  ): Promise<boolean> {
    const [row] = await db
      .select({ id: workspacePlugins.id })
      .from(workspacePlugins)
      .where(
        and(
          eq(workspacePlugins.workspaceId, workspaceId),
          eq(workspacePlugins.pluginSlug, "fts-search"),
          eq(workspacePlugins.status, "active"),
        ),
      )
      .limit(1);
    return !!row;
  },

  async indexFile(params: {
    workspaceId: string;
    fileId: string;
    fileName: string;
    mimeType: string;
    content: string;
  }): Promise<void> {
    if (!FTS_SERVICE_URL) return;

    const res = await fetch(`${FTS_SERVICE_URL}/index`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      console.error(
        `[fts-client] indexFile failed: ${res.status} ${res.statusText}`,
      );
    }
  },

  async search(params: {
    workspaceId: string;
    query: string;
    limit?: number;
  }): Promise<Array<{ fileId: string; score: number; snippet?: string }>> {
    if (!FTS_SERVICE_URL) return [];

    const res = await fetch(`${FTS_SERVICE_URL}/search`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(5_000),
    });

    if (!res.ok) return [];
    const data = (await res.json()) as {
      results?: Array<{ fileId: string; score: number; snippet?: string }>;
    };
    return data.results ?? [];
  },

  async deindexFile(params: {
    workspaceId: string;
    fileId: string;
  }): Promise<void> {
    if (!FTS_SERVICE_URL) return;

    await fetch(`${FTS_SERVICE_URL}/deindex`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(5_000),
    });
  },
};
