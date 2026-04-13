import { asc, eq } from "drizzle-orm";
import { getDb } from "@locker/database/client";
import { blobLocations, files, stores } from "@locker/database";
import { hydrateStore, type FileSourceResolver } from "@locker/jobs";

/**
 * Workflow-specific file source resolver. Unlike the web app's resolver,
 * this does NOT fall back to getPrimaryStore for legacy files — any file
 * being synced by a workflow was already uploaded through the normal flow
 * and must have at least one blob_location row.
 */
export const resolveFileSource: FileSourceResolver = async (
  fileId,
  preferredStoreId,
) => {
  const db = getDb();

  const [file] = await db
    .select({
      id: files.id,
      blobId: files.blobId,
      storagePath: files.storagePath,
    })
    .from(files)
    .where(eq(files.id, fileId))
    .limit(1);

  if (!file) throw new Error(`File not found: ${fileId}`);

  const locations = await db
    .select({
      storagePath: blobLocations.storagePath,
      state: blobLocations.state,
      store: stores,
    })
    .from(blobLocations)
    .innerJoin(stores, eq(blobLocations.storeId, stores.id))
    .where(eq(blobLocations.blobId, file.blobId))
    .orderBy(asc(stores.readPriority), asc(blobLocations.createdAt));

  if (locations.length === 0) {
    throw new Error(
      `No blob locations found for file ${fileId}. Cannot resolve file source in workflow context.`,
    );
  }

  const preferred = preferredStoreId
    ? locations.find((l) => l.store.id === preferredStoreId)
    : undefined;
  const available = locations.find(
    (l) =>
      l.storagePath === file.storagePath && l.state !== "failed",
  );
  const anyAvailable = locations.find(
    (l) => l.state === "available" || l.state === "pending",
  );
  const chosen = preferred ?? available ?? anyAvailable ?? locations[0]!;

  const { storage } = await hydrateStore(chosen.store);

  return {
    storage,
    storagePath: chosen.storagePath,
    storeId: chosen.store.id,
  };
};
