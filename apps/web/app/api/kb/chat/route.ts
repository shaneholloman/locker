import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, and, asc } from "drizzle-orm";
import { convertToModelMessages } from "ai";
import { auth } from "../../../../server/auth";
import { getDb } from "@locker/database/client";
import {
  knowledgeBases,
  kbConversations,
  kbMessages,
} from "@locker/database";
import { getHandler, buildPluginContext } from "../../../../server/plugins/runtime";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    messages: uiMessages,
    knowledgeBaseId,
    conversationId,
  } = body as {
    messages: Array<{
      id: string;
      role: string;
      parts: unknown[];
      metadata?: unknown;
    }>;
    knowledgeBaseId: string;
    conversationId: string;
  };

  if (!knowledgeBaseId || !conversationId || !uiMessages?.length) {
    return NextResponse.json(
      { error: "Missing knowledgeBaseId, conversationId, or messages" },
      { status: 400 },
    );
  }

  const db = getDb();

  // Verify KB access
  const [kb] = await db
    .select()
    .from(knowledgeBases)
    .where(eq(knowledgeBases.id, knowledgeBaseId))
    .limit(1);

  if (!kb) {
    return NextResponse.json(
      { error: "Knowledge base not found" },
      { status: 404 },
    );
  }

  // Verify conversation belongs to user and KB
  const [conversation] = await db
    .select()
    .from(kbConversations)
    .where(
      and(
        eq(kbConversations.id, conversationId),
        eq(kbConversations.knowledgeBaseId, knowledgeBaseId),
        eq(kbConversations.userId, session.user.id),
      ),
    )
    .limit(1);

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 },
    );
  }

  // Save the latest user message
  const lastUserMessage = [...uiMessages]
    .reverse()
    .find((m) => m.role === "user");

  if (lastUserMessage) {
    await db.insert(kbMessages).values({
      id: lastUserMessage.id,
      conversationId,
      role: "user",
      parts: lastUserMessage.parts as any,
      metadata: (lastUserMessage.metadata as any) ?? null,
    });

    // Auto-title: if conversation has no title, set from first user message
    if (!conversation.title) {
      const firstTextPart = (lastUserMessage.parts as any[])?.find(
        (p: any) => p.type === "text",
      );
      if (firstTextPart?.text) {
        const title = firstTextPart.text.slice(0, 100);
        await db
          .update(kbConversations)
          .set({ title, updatedAt: new Date() })
          .where(eq(kbConversations.id, conversationId));
      }
    }
  }

  // Get the handler
  const handler = getHandler("knowledge-base");
  if (!handler?.chat) {
    return NextResponse.json(
      { error: "Knowledge base handler not available" },
      { status: 500 },
    );
  }

  // Build plugin context
  const pluginCtx = await buildPluginContext({
    db,
    workspaceId: kb.workspaceId,
    userId: session.user.id,
    pluginId: kb.id,
    config: {},
  });

  // Convert UIMessages to ModelMessages for the LLM
  const modelMessages = await convertToModelMessages(uiMessages as any);

  try {
    const result = await handler.chat(pluginCtx, {
      knowledgeBaseId: kb.id,
      messages: modelMessages,
      wikiStoragePath: kb.wikiStoragePath,
      schemaPrompt: kb.schemaPrompt,
    });

    // The handler returns a streamText() result
    const streamResult = result as {
      toUIMessageStreamResponse: (opts?: {
        onFinish?: (event: { messages?: Array<{ id: string; role: string; parts: unknown[]; metadata?: unknown }> }) => Promise<void>;
      }) => Response;
    };

    // Return streaming response compatible with useChat()
    const response = streamResult.toUIMessageStreamResponse({
      onFinish: async ({ messages: finishedMessages }: { messages?: Array<{ id: string; role: string; parts: unknown[]; metadata?: unknown }> }) => {
        // Save the assistant message(s)
        if (finishedMessages) {
          for (const msg of finishedMessages) {
            if (msg.role === "assistant") {
              await db.insert(kbMessages).values({
                id: msg.id,
                conversationId,
                role: "assistant",
                parts: msg.parts as any,
                metadata: (msg.metadata as any) ?? null,
              });
            }
          }
        }

        // Update conversation timestamp
        await db
          .update(kbConversations)
          .set({ updatedAt: new Date() })
          .where(eq(kbConversations.id, conversationId));
      },
    });

    return response;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Chat generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
