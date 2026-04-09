import { randomBytes } from "node:crypto";
import { tool } from "ai";
import { z } from "zod/v4";
import { eq, and, desc } from "drizzle-orm";
import { shareLinks, files, folders } from "@locker/database";
import { hashLinkPassword } from "../../security/password";
import type { AssistantToolContext } from "./types";

export function createShareTools(ctx: AssistantToolContext) {
  return {
    createShareLink: tool({
      description:
        "Create a share link for a file or folder. Returns the public URL. Exactly one of fileId or folderId must be provided.",
      inputSchema: z.object({
        fileId: z
          .string()
          .uuid()
          .optional()
          .describe("ID of the file to share"),
        folderId: z
          .string()
          .uuid()
          .optional()
          .describe("ID of the folder to share"),
        access: z
          .enum(["view", "download"])
          .default("view")
          .describe("Access level for the share link"),
        password: z
          .string()
          .optional()
          .describe("Optional password to protect the link"),
        expiresAt: z
          .string()
          .optional()
          .describe("Optional ISO date string for link expiration"),
        maxDownloads: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Optional maximum number of downloads"),
      }),
      execute: async ({
        fileId,
        folderId,
        access,
        password,
        expiresAt,
        maxDownloads,
      }) => {
        if (!fileId && !folderId) {
          return { error: "Either fileId or folderId is required" };
        }

        if (fileId) {
          const [file] = await ctx.db
            .select({ id: files.id })
            .from(files)
            .where(
              and(
                eq(files.id, fileId),
                eq(files.workspaceId, ctx.workspaceId),
              ),
            )
            .limit(1);

          if (!file) return { error: "File not found" };
        }

        if (folderId) {
          const [folder] = await ctx.db
            .select({ id: folders.id })
            .from(folders)
            .where(
              and(
                eq(folders.id, folderId),
                eq(folders.workspaceId, ctx.workspaceId),
              ),
            )
            .limit(1);

          if (!folder) return { error: "Folder not found" };
        }

        const token = randomBytes(32).toString("base64url");
        const hasPassword = !!password;
        const passwordHash = password ? hashLinkPassword(password) : null;

        const [link] = await ctx.db
          .insert(shareLinks)
          .values({
            userId: ctx.userId,
            workspaceId: ctx.workspaceId,
            fileId: fileId ?? null,
            folderId: folderId ?? null,
            token,
            access,
            hasPassword,
            passwordHash,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            maxDownloads: maxDownloads ?? null,
          })
          .returning();

        const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/shared/${token}`;
        return { shareLink: link, shareUrl };
      },
    }),

    listShareLinks: tool({
      description:
        "List all share links in the workspace with their target file/folder names.",
      inputSchema: z.object({}),
      execute: async () => {
        const links = await ctx.db
          .select()
          .from(shareLinks)
          .where(eq(shareLinks.workspaceId, ctx.workspaceId))
          .orderBy(desc(shareLinks.createdAt))
          .limit(50);

        const enriched = await Promise.all(
          links.map(async (link) => {
            let itemName = "Unknown";
            let itemType: "file" | "folder" = "file";

            if (link.fileId) {
              const [file] = await ctx.db
                .select({ name: files.name })
                .from(files)
                .where(eq(files.id, link.fileId))
                .limit(1);
              if (file) itemName = file.name;
            } else if (link.folderId) {
              const [folder] = await ctx.db
                .select({ name: folders.name })
                .from(folders)
                .where(eq(folders.id, link.folderId))
                .limit(1);
              if (folder) {
                itemName = folder.name;
                itemType = "folder";
              }
            }

            return {
              id: link.id,
              token: link.token,
              itemName,
              itemType,
              access: link.access,
              isActive: link.isActive,
              hasPassword: link.hasPassword,
              expiresAt: link.expiresAt,
              downloadCount: link.downloadCount,
              maxDownloads: link.maxDownloads,
              shareUrl: `${process.env.NEXT_PUBLIC_APP_URL}/shared/${link.token}`,
              createdAt: link.createdAt,
            };
          }),
        );

        return { shareLinks: enriched };
      },
    }),

    revokeShareLink: tool({
      description: "Revoke (disable) a share link so it can no longer be used.",
      inputSchema: z.object({
        shareLinkId: z
          .string()
          .uuid()
          .describe("ID of the share link to revoke"),
      }),
      execute: async ({ shareLinkId }) => {
        const [link] = await ctx.db
          .update(shareLinks)
          .set({ isActive: false, updatedAt: new Date() })
          .where(
            and(
              eq(shareLinks.id, shareLinkId),
              eq(shareLinks.workspaceId, ctx.workspaceId),
            ),
          )
          .returning();

        if (!link) {
          return { error: "Share link not found" };
        }

        return { success: true, revokedLinkId: shareLinkId };
      },
    }),
  };
}
