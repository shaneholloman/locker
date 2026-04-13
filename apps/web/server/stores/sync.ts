import path from "path";
import { lookup as mimeLookup } from "mime-types";
import { eq, inArray } from "drizzle-orm";
import {
  blobLocations,
  fileBlobs,
  files,
  ingestTombstones,
  stores,
  workspaces,
} from "@locker/database";
import type { Database } from "@locker/database";
import { getDb } from "@locker/database/client";
import { getStoreById, makeWebFileSourceResolver } from "../storage";
import { createPendingFileUpload, markFileUploadReady } from "./file-records";
import { runFileReadyHooks } from "./lifecycle";
import { syncFileToStores } from "@locker/jobs";

// Re-export from @locker/jobs for callers that import from this file
export { syncWorkspaceStores, syncFileToStores, type FileSourceResolver } from "@locker/jobs";

function getDatabase(db?: Database): Database {
  return db ?? getDb();
}

async function touchStoreSyncTime(db: Database, storeIds: string[]) {
  if (storeIds.length === 0) return;
  await db
    .update(stores)
    .set({ lastSyncedAt: new Date(), updatedAt: new Date() })
    .where(inArray(stores.id, storeIds));
}

export async function ingestFromReadOnlyStore(params: {
  storeId: string;
  triggeredByUserId?: string;
  clearTombstones?: boolean;
  db?: Database;
}): Promise<{ ingested: number; skipped: number }> {
  const db = getDatabase(params.db);
  const { store, storage } = await getStoreById(params.storeId);

  if (store.writeMode !== "read_only" || store.ingestMode !== "scan") {
    throw new Error("Store is not configured for read-only ingest");
  }

  if (!storage.list) {
    throw new Error("Selected store does not support listing objects");
  }

  const [workspace] = await db
    .select({ ownerId: workspaces.ownerId })
    .from(workspaces)
    .where(eq(workspaces.id, store.workspaceId))
    .limit(1);

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  if (params.clearTombstones) {
    await db
      .delete(ingestTombstones)
      .where(eq(ingestTombstones.storeId, store.id));
  }

  const config = (store.config as Record<string, unknown> | null) ?? {};
  const rootPrefix =
    typeof config.rootPrefix === "string" ? config.rootPrefix : "";
  const discovered = await storage.list(rootPrefix);

  const existingLocations = await db
    .select({ storagePath: blobLocations.storagePath })
    .from(blobLocations)
    .where(eq(blobLocations.storeId, store.id));
  const existingPaths = new Set(existingLocations.map((location) => location.storagePath));

  const tombstones = await db
    .select({ externalPath: ingestTombstones.externalPath })
    .from(ingestTombstones)
    .where(eq(ingestTombstones.storeId, store.id));
  const ignoredPaths = new Set(tombstones.map((item) => item.externalPath));

  const resolveFileSource = makeWebFileSourceResolver();
  let ingested = 0;
  let skipped = 0;

  for (const object of discovered) {
    if (existingPaths.has(object.path) || ignoredPaths.has(object.path)) {
      skipped += 1;
      continue;
    }

    const name = path.basename(object.path) || "imported-file";
    const mimeType = mimeLookup(name) || "application/octet-stream";
    const pending = await createPendingFileUpload({
      db,
      workspaceId: store.workspaceId,
      userId: params.triggeredByUserId ?? workspace.ownerId,
      folderId: null,
      fileName: name,
      mimeType,
      size: object.size,
      status: "uploading",
    });

    try {
      const sourceObject = await storage.download(object.path);
      await pending.storage.upload({
        path: pending.storagePath,
        data: sourceObject.data,
        contentType: mimeType,
      });

      await markFileUploadReady({ db, fileId: pending.fileId });

      await db
        .insert(blobLocations)
        .values({
          blobId: pending.blobId,
          storeId: store.id,
          storagePath: object.path,
          state: "available",
          origin: "ingested",
          lastVerifiedAt: object.lastModified,
        })
        .onConflictDoNothing();

      await syncFileToStores({
        db,
        fileId: pending.fileId,
        resolveFileSource,
        sourceStoreId: pending.storeId,
      });

      void runFileReadyHooks({
        db,
        workspaceId: store.workspaceId,
        userId: params.triggeredByUserId ?? workspace.ownerId,
        fileId: pending.fileId,
      }).catch(() => {});

      ingested += 1;
    } catch (err) {
      console.error(`[ingest] Failed to ingest "${object.path}":`, err);
      await db.transaction(async (tx) => {
        await tx
          .delete(blobLocations)
          .where(eq(blobLocations.blobId, pending.blobId));
        await tx.delete(files).where(eq(files.id, pending.fileId));
        await tx.delete(fileBlobs).where(eq(fileBlobs.id, pending.blobId));
      });
    }
  }

  await touchStoreSyncTime(db, [store.id]);
  return { ingested, skipped };
}
