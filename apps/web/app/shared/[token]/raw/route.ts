import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@locker/database/client";
import { shareLinks, files } from "@locker/database";
import {
  createStorageForFile,
  getFileStoragePath,
} from "../../../../server/storage";
import { verifyLinkPassword } from "../../../../server/security/password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ token: string }>;
};

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { token } = await params;

  const db = getDb();
  const [link] = await db
    .select()
    .from(shareLinks)
    .where(eq(shareLinks.token, token));

  if (!link || !link.isActive) {
    return new Response("Link not found", { status: 404 });
  }

  if (link.access !== "raw") {
    return new Response("Not a raw link", { status: 404 });
  }

  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    return new Response("Link expired", { status: 410 });
  }

  if (link.hasPassword) {
    const provided = req.nextUrl.searchParams.get("p");
    if (!verifyLinkPassword(provided ?? undefined, link.passwordHash)) {
      return new Response("Password required", { status: 401 });
    }
  }

  if (!link.fileId) {
    return new Response("File not found", { status: 404 });
  }

  const [targetFile] = await db
    .select()
    .from(files)
    .where(eq(files.id, link.fileId));

  if (!targetFile || targetFile.status !== "ready") {
    return new Response("File not found", { status: 404 });
  }

  const storage = await createStorageForFile(targetFile.id);
  const storagePath = await getFileStoragePath(targetFile.id);
  const signedUrl = await storage.getSignedUrl(storagePath, 3600);

  await db
    .update(shareLinks)
    .set({ lastAccessedAt: new Date() })
    .where(eq(shareLinks.id, link.id));

  // Local storage returns a relative path like "/api/files/serve/..."; resolve
  // against the request origin so NextResponse.redirect gets an absolute URL.
  const destination = signedUrl.startsWith("http")
    ? signedUrl
    : new URL(signedUrl, req.nextUrl.origin).toString();

  return NextResponse.redirect(destination, 302);
}
