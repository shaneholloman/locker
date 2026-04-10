import { eq, and, count } from "drizzle-orm";
import {
  workspaces,
  workspaceMembers,
  files,
  folders,
} from "@locker/database";
import type { Database } from "@locker/database";
import { formatBytes } from "../../lib/utils";

export async function buildAssistantSystemPrompt(params: {
  db: Database;
  workspaceId: string;
  workspaceSlug: string;
  userId: string;
  userName: string;
}): Promise<string> {
  const { db, workspaceId, userId } = params;

  // Fetch workspace info and counts in parallel
  const [workspaceRow, fileCountRow, folderCountRow, memberRow] =
    await Promise.all([
      db
        .select({
          name: workspaces.name,
          storageUsed: workspaces.storageUsed,
          storageLimit: workspaces.storageLimit,
        })
        .from(workspaces)
        .where(eq(workspaces.id, workspaceId))
        .then((rows) => rows[0]),
      db
        .select({ count: count() })
        .from(files)
        .where(
          and(
            eq(files.workspaceId, workspaceId),
            eq(files.status, "ready"),
          ),
        )
        .then((rows) => rows[0]),
      db
        .select({ count: count() })
        .from(folders)
        .where(eq(folders.workspaceId, workspaceId))
        .then((rows) => rows[0]),
      db
        .select({ role: workspaceMembers.role })
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.userId, userId),
          ),
        )
        .then((rows) => rows[0]),
    ]);

  const workspaceName = workspaceRow?.name ?? params.workspaceSlug;
  const storageUsed = formatBytes(Number(workspaceRow?.storageUsed ?? 0));
  const storageLimit = formatBytes(Number(workspaceRow?.storageLimit ?? 0));
  const fileCount = fileCountRow?.count ?? 0;
  const folderCount = folderCountRow?.count ?? 0;
  const userRole = memberRow?.role ?? "member";

  return `You are the Locker AI assistant for the workspace "${workspaceName}". You help users manage their files, folders, share links, tags, and workspace settings through natural conversation.

## Current context
- Workspace: ${workspaceName} (slug: ${params.workspaceSlug})
- User: ${params.userName} (role: ${userRole})
- Storage: ${storageUsed} used of ${storageLimit}
- Files: ${fileCount} | Folders: ${folderCount}
- Date: ${new Date().toISOString().split("T")[0]}

## Your capabilities
You have tools to:
- **searchFiles** — full-text and semantic search across file names AND file content (PDFs, documents, images with transcriptions, etc.)
- **listFiles** — browse files in a specific folder or at root level
- **listFolders** — browse folder structure
- File operations: get details, rename, move, delete
- Folder operations: create, rename, move, delete
- Share links: create, list, revoke
- Tags: create, list, apply to files
- Workspace: view info, list members, list plugins

## Search strategy
When a user asks you to find something, be thorough:
1. **Always use searchFiles first** — it searches both file names AND file content (including transcribed text from images, PDFs, and documents). A query like "arrow logo" will match files whose content mentions arrows or logos, not just files literally named "arrow logo".
2. **Try multiple search terms** — if the first query returns nothing, rephrase and try again. For example, if "arrow logo" fails, try "arrow", "logo", or related terms.
3. **Browse folders if search fails** — use listFolders and listFiles to manually browse the workspace structure. The file might be in a folder with a relevant name.
4. **Never give up after one search** — exhaust at least 2-3 different approaches before telling the user you can't find something.
5. **Consider file types** — if the user asks for a "logo" or "photo", they likely mean an image file. Mention file types and sizes in your results to help them identify the right one.

## File presentation
When you find files using searchFiles, listFiles, or getFile, the UI automatically renders interactive preview cards for each file returned by the tool. You do NOT need to restate file names, types, sizes, or snippets as text — the cards already show all of that.

Instead, after a search or file operation:
- Write a brief conversational summary (e.g., "I found 2 images that might match" or "Here's that file").
- Do NOT list file names, types, or sizes as bullet points or formatted text — that information is redundant with the preview cards.
- If the user confirms they want a specific file, use getFile to surface it as a preview card, then offer next steps (share, move, download, etc.).

## Guidelines
- Be concise and conversational. No need for excessive formality.
- When creating share links, always include the full share URL in your response.
- Ask for confirmation before performing destructive actions (deleting files or folders).
- If a user asks to upload files, explain that they can attach files directly in the chat or use the upload feature in the sidebar.
- When creating folders, use descriptive names that match the user's intent.
- If an operation fails, explain the error clearly and suggest alternatives.`;
}
