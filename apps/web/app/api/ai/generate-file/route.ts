import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { generateText, generateImage } from "ai";
import { z } from "zod";
import { auth } from "../../../../server/auth";
import { getDb } from "@locker/database/client";
import {
  workspaces,
  workspaceMembers,
  files as filesTable,
} from "@locker/database";
import { gateway, DEFAULT_MODEL } from "../../../../server/ai/gateway";
import {
  getGenerationType,
  type GenerationType,
} from "../../../../server/ai/generation-types";
import {
  createStorageForFile,
  getFileStoragePath,
} from "../../../../server/storage";

export const runtime = "nodejs";

// Generated file size cap. Keeps the response under the messaging structured-
// clone limit when the extension forwards bytes through chrome.runtime.
const MAX_OUTPUT_BYTES = 25 * 1024 * 1024; // 25 MB

const DEFAULT_IMAGE_MODEL = "openai/gpt-image-1";

const attachmentSchema = z.object({
  name: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(255),
  // base64-encoded bytes from the extension's File → arrayBuffer → btoa path.
  dataBase64: z.string().min(1),
});

const bodySchema = z.object({
  typeId: z.string().min(1).max(64),
  prompt: z.string().min(1).max(8000),
  // Files the user uploaded from their computer in the chat composer.
  attachments: z.array(attachmentSchema).max(8).optional(),
  // Files the user picked from their Locker workspace. Looked up server-side
  // and read straight from storage so we don't round-trip the bytes through
  // the extension.
  lockerFileIds: z.array(z.string().uuid()).max(8).optional(),
});

function decodeBase64(b64: string): Buffer {
  return Buffer.from(b64, "base64");
}

async function loadLockerFile(
  fileId: string,
  workspaceId: string,
): Promise<{ name: string; mimeType: string; bytes: Buffer } | null> {
  const db = getDb();
  const [file] = await db
    .select({
      id: filesTable.id,
      name: filesTable.name,
      mimeType: filesTable.mimeType,
    })
    .from(filesTable)
    .where(
      and(eq(filesTable.id, fileId), eq(filesTable.workspaceId, workspaceId)),
    );
  if (!file) return null;
  const storage = await createStorageForFile(file.id);
  const path = await getFileStoragePath(file.id);
  const result = await storage.download(path);
  // storage.download returns either a Buffer-ish or a ReadableStream depending
  // on the provider. Coerce to Buffer so attachments are uniform.
  let bytes: Buffer;
  const data = result.data as Buffer | Uint8Array | ReadableStream<Uint8Array>;
  if (Buffer.isBuffer(data)) {
    bytes = data;
  } else if (data instanceof Uint8Array) {
    bytes = Buffer.from(data);
  } else {
    const chunks: Uint8Array[] = [];
    const reader = data.getReader();
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      // Same cap as the output: don't load arbitrarily large attachments.
      if (total > MAX_OUTPUT_BYTES) {
        reader.cancel().catch(() => undefined);
        throw new Error(`Attachment "${file.name}" exceeds the 25 MB cap`);
      }
      chunks.push(value);
    }
    bytes = Buffer.concat(chunks.map((c) => Buffer.from(c)));
  }
  return { name: file.name, mimeType: file.mimeType, bytes };
}

function safeFilename(prompt: string, type: GenerationType): string {
  const slug = prompt
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 48);
  const stem = slug || "generated";
  return `${stem}${type.extension}`;
}

interface AttachmentInput {
  name: string;
  mimeType: string;
  bytes: Buffer;
}

function attachmentsToTextSummary(atts: AttachmentInput[]): string {
  if (atts.length === 0) return "";
  // We only inline text-y attachments verbatim; non-text gets a short
  // description so the model knows it exists without us pretending to feed
  // raw bytes into a text prompt.
  const lines: string[] = ["Reference files supplied by the user:"];
  for (const a of atts) {
    const text = isLikelyText(a.mimeType, a.name);
    if (text) {
      const decoded = a.bytes.toString("utf8");
      const trimmed =
        decoded.length > 32_000
          ? decoded.slice(0, 32_000) + "\n…[truncated]"
          : decoded;
      lines.push(`\n--- ${a.name} (${a.mimeType}) ---\n${trimmed}\n`);
    } else {
      lines.push(
        `- ${a.name} (${a.mimeType}, ${a.bytes.byteLength} bytes — not inlined)`,
      );
    }
  }
  return lines.join("\n");
}

function isLikelyText(mimeType: string, name: string): boolean {
  if (mimeType.startsWith("text/")) return true;
  if (
    [
      "application/json",
      "application/xml",
      "application/javascript",
      "application/typescript",
      "application/x-yaml",
      "application/x-sh",
    ].includes(mimeType)
  )
    return true;
  // Common text extensions whose MIME types are inconsistent across browsers.
  return /\.(md|markdown|txt|json|yaml|yml|csv|tsv|html?|js|jsx|ts|tsx|py|sql|sh|toml|ini|env|log|xml|svg)$/i.test(
    name,
  );
}

export async function POST(req: NextRequest) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slug = reqHeaders.get("x-workspace-slug");
  if (!slug) {
    return NextResponse.json(
      { error: "Missing workspace context" },
      { status: 400 },
    );
  }

  const db = getDb();
  const [membership] = await db
    .select({ workspaceId: workspaces.id })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(
      and(
        eq(workspaces.slug, slug),
        eq(workspaceMembers.userId, session.user.id),
      ),
    )
    .limit(1);

  if (!membership) {
    return NextResponse.json(
      { error: "Workspace not found or access denied" },
      { status: 403 },
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
      { status: 400 },
    );
  }

  const { typeId, prompt, attachments = [], lockerFileIds = [] } = parsed.data;
  const type = getGenerationType(typeId);
  if (!type) {
    return NextResponse.json(
      { error: `Unknown generation type "${typeId}"` },
      { status: 400 },
    );
  }

  // Materialize attachments — both client uploads and Locker references —
  // into in-memory buffers we can hand to the model.
  const materialized: AttachmentInput[] = [];
  for (const a of attachments) {
    const bytes = decodeBase64(a.dataBase64);
    materialized.push({ name: a.name, mimeType: a.mimeType, bytes });
  }
  for (const id of lockerFileIds) {
    const loaded = await loadLockerFile(id, membership.workspaceId);
    if (!loaded) {
      return NextResponse.json(
        { error: `Locker file ${id} not found` },
        { status: 404 },
      );
    }
    materialized.push(loaded);
  }

  try {
    if (type.kind === "text") {
      return await generateTextFile(type, prompt, materialized);
    }
    return await generateImageFile(type, prompt, materialized);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    console.error("[ai/generate-file] failed", err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

async function generateTextFile(
  type: GenerationType,
  prompt: string,
  attachments: AttachmentInput[],
) {
  const system = [
    "You are a file-generation assistant. The user wants you to produce the contents of one file matching their request — nothing else.",
    type.systemHint ?? "",
    "Do not wrap your output in Markdown code fences unless the target format itself requires them. Do not add explanations.",
  ]
    .filter(Boolean)
    .join("\n\n");

  // Build a multimodal user message: prompt text first, then any image
  // attachments as `image` parts (Claude understands them natively), and any
  // text-y files inlined as text parts. Non-text non-image attachments fall
  // through to a short description so the model isn't blind to them.
  const parts: Array<
    | { type: "text"; text: string }
    | { type: "image"; image: Buffer; mediaType: string }
  > = [{ type: "text", text: prompt }];

  const summarized: AttachmentInput[] = [];
  for (const a of attachments) {
    if (a.mimeType.startsWith("image/")) {
      parts.push({ type: "image", image: a.bytes, mediaType: a.mimeType });
    } else {
      summarized.push(a);
    }
  }
  const summary = attachmentsToTextSummary(summarized);
  if (summary) parts.push({ type: "text", text: summary });

  const result = await generateText({
    model: gateway(DEFAULT_MODEL),
    system,
    messages: [{ role: "user", content: parts }],
  });

  const buf = Buffer.from(result.text, "utf8");
  if (buf.byteLength > MAX_OUTPUT_BYTES) {
    return NextResponse.json(
      { error: "Generated file exceeded the 25 MB cap" },
      { status: 502 },
    );
  }

  return NextResponse.json({
    name: safeFilename(prompt, type),
    mimeType: type.mimeType,
    size: buf.byteLength,
    dataBase64: buf.toString("base64"),
  });
}

async function generateImageFile(
  type: GenerationType,
  prompt: string,
  attachments: AttachmentInput[],
) {
  // The image-gen API doesn't take attachments directly across all providers;
  // we describe non-image attachments inline and append image attachments as
  // a hint that the user wants the new image to relate to them. Most users
  // attaching images expect img-to-img, which not every gateway model
  // exposes — fall back gracefully to text-only prompting and surface a
  // note so the user knows attachments were context, not source frames.
  const refs: string[] = [];
  for (const a of attachments) {
    if (a.mimeType.startsWith("image/")) {
      refs.push(`a reference image (${a.name}, ${a.mimeType})`);
    } else if (isLikelyText(a.mimeType, a.name)) {
      refs.push(
        `the contents of ${a.name}: ${a.bytes.toString("utf8").slice(0, 1000)}`,
      );
    } else {
      refs.push(`a file named ${a.name} (${a.mimeType})`);
    }
  }
  const combinedPrompt = refs.length
    ? `${prompt}\n\nUser also provided ${refs.join("; ")}.`
    : prompt;

  const result = await generateImage({
    model: gateway.imageModel(DEFAULT_IMAGE_MODEL),
    prompt: combinedPrompt,
  });

  const image = result.image;
  // GeneratedFile carries the raw Uint8Array on `.uint8Array` and a media
  // type on `.mediaType` per AI SDK v6.
  const bytes = Buffer.from(image.uint8Array);
  if (bytes.byteLength > MAX_OUTPUT_BYTES) {
    return NextResponse.json(
      { error: "Generated image exceeded the 25 MB cap" },
      { status: 502 },
    );
  }

  // Prefer the model's reported media type if it lines up with the kind the
  // user asked for; otherwise re-stamp with the requested mime so the page
  // sees consistent metadata.
  const mimeType =
    image.mediaType && image.mediaType.startsWith("image/")
      ? image.mediaType
      : type.mimeType;

  return NextResponse.json({
    name: safeFilename(prompt, {
      ...type,
      // Match the extension to whatever the model actually returned so the
      // file the page receives is internally consistent.
      extension:
        mimeType === "image/png"
          ? ".png"
          : mimeType === "image/jpeg"
            ? ".jpg"
            : mimeType === "image/webp"
              ? ".webp"
              : type.extension,
    }),
    mimeType,
    size: bytes.byteLength,
    dataBase64: bytes.toString("base64"),
  });
}
