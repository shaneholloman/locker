import { eq, and, isNull } from 'drizzle-orm';
import { folders } from '@locker/database';
import type { Database } from '@locker/database/client';
import { buildFolderPath } from '@locker/jobs';

/**
 * Resolves an S3 key's directory path to a folder ID, creating folders as needed.
 * e.g., key "docs/reports/q1.pdf" -> creates "docs", "docs/reports" folders
 * Returns the folderId for "docs/reports" (the parent of the file).
 */
export async function resolveOrCreateFolderChain(
  db: Database,
  workspaceId: string,
  userId: string,
  pathSegments: string[],
): Promise<string | null> {
  if (pathSegments.length === 0) return null;

  let parentId: string | null = null;

  for (const segment of pathSegments) {
    // Look up existing folder
    const conditions = [
      eq(folders.workspaceId, workspaceId),
      eq(folders.name, segment),
    ];

    if (parentId) {
      conditions.push(eq(folders.parentId, parentId));
    } else {
      conditions.push(isNull(folders.parentId));
    }

    const [existing] = await db
      .select({ id: folders.id })
      .from(folders)
      .where(and(...conditions));

    if (existing) {
      parentId = existing.id;
    } else {
      // Create the folder
      try {
        const newFolders: { id: string }[] = await db
          .insert(folders)
          .values({
            workspaceId,
            userId,
            parentId,
            name: segment,
          })
          .returning({ id: folders.id });
        parentId = newFolders[0]!.id;
      } catch {
        // Concurrent creation — look up again
        const [retry] = await db
          .select({ id: folders.id })
          .from(folders)
          .where(and(...conditions));
        if (retry) {
          parentId = retry.id;
        } else {
          throw new Error(`Failed to create folder: ${segment}`);
        }
      }
    }
  }

  return parentId;
}

/**
 * Builds the full S3 key path for a file by walking up the folder chain.
 * e.g., file "q1.pdf" in folder chain [root] -> "docs" -> "reports"
 * returns "docs/reports/q1.pdf"
 */
export async function buildS3KeyForFile(
  db: Database,
  workspaceId: string,
  file: { name: string; folderId: string | null },
): Promise<string> {
  return buildFolderPath(db, workspaceId, file);
}

/**
 * Parse an S3 object key into directory segments and file name.
 * "docs/reports/q1.pdf" -> { dirSegments: ["docs", "reports"], fileName: "q1.pdf" }
 * "file.txt" -> { dirSegments: [], fileName: "file.txt" }
 */
export function parseS3Key(key: string): {
  dirSegments: string[];
  fileName: string;
} {
  const parts = key.split('/').filter(Boolean);
  if (parts.length === 0) {
    return { dirSegments: [], fileName: '' };
  }
  const fileName = parts.pop()!;
  return { dirSegments: parts, fileName };
}
