import { getDb } from "@locker/database/client";
import { notifications } from "@locker/database";

type NotificationType =
  | "workspace_invite"
  | "share_link"
  | "announcement";

export async function createNotification({
  userId,
  type,
  title,
  body,
  actionUrl,
  metadata,
}: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}) {
  const db = getDb();

  const [notification] = await db
    .insert(notifications)
    .values({ userId, type, title, body, actionUrl, metadata })
    .returning();

  return notification;
}
