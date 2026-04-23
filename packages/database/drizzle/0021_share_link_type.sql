-- Replace the 'view'/'download' access model with 'download'/'raw'.
-- All existing share links now allow downloads; view-only is removed.
UPDATE "share_links" SET "access" = 'download' WHERE "access" = 'view';--> statement-breakpoint
ALTER TABLE "share_links" ALTER COLUMN "access" SET DEFAULT 'download';--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_access_check"
  CHECK ("access" IN ('download', 'raw'));
