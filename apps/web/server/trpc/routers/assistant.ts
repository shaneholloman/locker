import { z } from "zod";
import { eq, and, asc, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { assistantConversations, assistantMessages } from "@locker/database";
import { createRouter, protectedProcedure, workspaceProcedure } from "../init";
import { GENERATION_TYPES } from "../../ai/generation-types";

export const assistantRouter = createRouter({
  // Surface the file-generation catalog to clients (the browser extension
  // uses this to filter generation types against the input's accept attr).
  generationTypes: protectedProcedure.query(() =>
    GENERATION_TYPES.map((t) => ({
      id: t.id,
      label: t.label,
      description: t.description,
      extension: t.extension,
      mimeType: t.mimeType,
      kind: t.kind,
    })),
  ),

  conversations: workspaceProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: assistantConversations.id,
        title: assistantConversations.title,
        model: assistantConversations.model,
        createdAt: assistantConversations.createdAt,
        updatedAt: assistantConversations.updatedAt,
      })
      .from(assistantConversations)
      .where(
        and(
          eq(assistantConversations.workspaceId, ctx.workspaceId),
          eq(assistantConversations.userId, ctx.userId),
        ),
      )
      .orderBy(desc(assistantConversations.updatedAt));
  }),

  conversation: workspaceProcedure
    .input(z.object({ conversationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [conversation] = await ctx.db
        .select({
          id: assistantConversations.id,
          title: assistantConversations.title,
          model: assistantConversations.model,
          createdAt: assistantConversations.createdAt,
          updatedAt: assistantConversations.updatedAt,
        })
        .from(assistantConversations)
        .where(
          and(
            eq(assistantConversations.id, input.conversationId),
            eq(assistantConversations.workspaceId, ctx.workspaceId),
            eq(assistantConversations.userId, ctx.userId),
          ),
        )
        .limit(1);

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      const messages = await ctx.db
        .select({
          id: assistantMessages.id,
          role: assistantMessages.role,
          parts: assistantMessages.parts,
          attachments: assistantMessages.attachments,
          metadata: assistantMessages.metadata,
          createdAt: assistantMessages.createdAt,
        })
        .from(assistantMessages)
        .where(eq(assistantMessages.conversationId, conversation.id))
        .orderBy(asc(assistantMessages.createdAt));

      return { ...conversation, messages };
    }),

  createConversation: workspaceProcedure
    .input(
      z.object({
        title: z.string().max(255).optional(),
        model: z.string().max(80).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [conversation] = await ctx.db
        .insert(assistantConversations)
        .values({
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
          title: input.title ?? null,
          model: input.model ?? null,
        })
        .returning();

      return conversation;
    }),

  deleteConversation: workspaceProcedure
    .input(z.object({ conversationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [conv] = await ctx.db
        .select({ id: assistantConversations.id })
        .from(assistantConversations)
        .where(
          and(
            eq(assistantConversations.id, input.conversationId),
            eq(assistantConversations.workspaceId, ctx.workspaceId),
            eq(assistantConversations.userId, ctx.userId),
          ),
        )
        .limit(1);

      if (!conv) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      await ctx.db
        .delete(assistantConversations)
        .where(eq(assistantConversations.id, conv.id));

      return { success: true };
    }),

  updateTitle: workspaceProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        title: z.string().max(255),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [conv] = await ctx.db
        .update(assistantConversations)
        .set({ title: input.title, updatedAt: new Date() })
        .where(
          and(
            eq(assistantConversations.id, input.conversationId),
            eq(assistantConversations.workspaceId, ctx.workspaceId),
            eq(assistantConversations.userId, ctx.userId),
          ),
        )
        .returning();

      if (!conv) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      return conv;
    }),
});
