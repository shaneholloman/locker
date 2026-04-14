import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@locker/database/client";
import { blobLocations, stores, storeSecrets } from "@locker/database";
import {
  createStorageFromConfig,
  type StorageProvider,
  type WorkspaceStorageConfig,
} from "@locker/storage";
import { decryptSecret } from "./crypto";

export type StoreRow = typeof stores.$inferSelect;

export interface WorkspaceStorageResult {
  storage: StorageProvider;
  store: StoreRow;
  storeId: string;
  providerName: string;
}

export function asConfigObject(
  value: Record<string, unknown> | null,
): Record<string, unknown> {
  return value ?? {};
}

export function getConfigString(
  config: Record<string, unknown>,
  key: string,
): string | null {
  const value = config[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function buildStorageConfig(
  store: StoreRow,
  encryptedCredentials?: string | null,
): WorkspaceStorageConfig {
  const config = asConfigObject(store.config as Record<string, unknown> | null);
  const decryptedCredentials = encryptedCredentials
    ? JSON.parse(decryptSecret(encryptedCredentials))
    : undefined;

  return {
    provider: store.provider,
    bucket: getConfigString(config, "bucket"),
    region: getConfigString(config, "region"),
    endpoint: getConfigString(config, "endpoint"),
    accountId: getConfigString(config, "accountId"),
    publicUrl: getConfigString(config, "publicUrl"),
    baseDir: getConfigString(config, "baseDir"),
    credentials: decryptedCredentials,
  };
}

function normalizeObjectKey(value: string): string {
  return value.replace(/^\/+|\/+$/g, "");
}

export function joinStoragePath(prefix: string | null, objectKey: string): string {
  const normalizedPrefix = prefix?.replace(/^\/+|\/+$/g, "") ?? "";
  const normalizedObjectKey = normalizeObjectKey(objectKey);
  return normalizedPrefix
    ? `${normalizedPrefix}/${normalizedObjectKey}`
    : normalizedObjectKey;
}

export function buildStoragePathForStore(
  store: Pick<StoreRow, "config">,
  objectKey: string,
): string {
  const config = asConfigObject(store.config as Record<string, unknown> | null);
  return joinStoragePath(getConfigString(config, "rootPrefix"), objectKey);
}

export async function hydrateStore(
  store: StoreRow,
): Promise<{ store: StoreRow; storage: StorageProvider }> {
  const db = getDb();
  const [secretRow] = await db
    .select({ encryptedCredentials: storeSecrets.encryptedCredentials })
    .from(storeSecrets)
    .where(eq(storeSecrets.storeId, store.id))
    .limit(1);

  return {
    store,
    storage:
      store.credentialSource === "platform"
        ? createStorageFromConfig(buildStorageConfig(store))
        : createStorageFromConfig(
            buildStorageConfig(store, secretRow?.encryptedCredentials ?? null),
          ),
  };
}

export async function getActiveStores(
  workspaceId: string,
): Promise<StoreRow[]> {
  const db = getDb();
  return db
    .select()
    .from(stores)
    .where(and(eq(stores.workspaceId, workspaceId), eq(stores.status, "active")))
    .orderBy(asc(stores.readPriority), asc(stores.createdAt));
}

export async function getStoreById(storeId: string): Promise<{
  store: StoreRow;
  storage: StorageProvider;
}> {
  const db = getDb();
  const [store] = await db
    .select()
    .from(stores)
    .where(eq(stores.id, storeId))
    .limit(1);

  if (!store) {
    throw new Error("Store not found");
  }

  return hydrateStore(store);
}
