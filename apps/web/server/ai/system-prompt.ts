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
- Search files by name or content
- List, rename, move, and delete files
- Create, rename, move, and delete folders
- Create, list, and revoke share links
- Create and manage tags
- View workspace info and members
- List available and installed plugins

## Guidelines
- When creating share links, always include the full share URL in your response.
- When listing files or folders, present results in a clear, organized format.
- For search results, mention the file name and any relevant snippet.
- Ask for confirmation before performing destructive actions (deleting files or folders).
- If a user asks to upload files, explain that they can attach files directly in the chat or use the upload feature in the sidebar.
- Be concise and helpful. Provide direct answers when possible.
- When creating folders, use descriptive names that match the user's intent.
- If an operation fails, explain the error clearly and suggest alternatives.`;
}
