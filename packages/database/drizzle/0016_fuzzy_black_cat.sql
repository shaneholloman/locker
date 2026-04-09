CREATE TABLE "kb_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"knowledge_base_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assistant_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"title" varchar(255),
	"model" varchar(80),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assistant_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" varchar(20) NOT NULL,
	"parts" jsonb NOT NULL,
	"attachments" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "knowledge_bases" DROP CONSTRAINT "knowledge_bases_tag_id_tags_id_fk";
--> statement-breakpoint
DROP INDEX "knowledge_bases_workspace_tag_idx";--> statement-breakpoint
ALTER TABLE "kb_tags" ADD CONSTRAINT "kb_tags_knowledge_base_id_knowledge_bases_id_fk" FOREIGN KEY ("knowledge_base_id") REFERENCES "public"."knowledge_bases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_tags" ADD CONSTRAINT "kb_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_conversations" ADD CONSTRAINT "assistant_conversations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_conversations" ADD CONSTRAINT "assistant_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_messages" ADD CONSTRAINT "assistant_messages_conversation_id_assistant_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."assistant_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "kb_tags_kb_tag_idx" ON "kb_tags" USING btree ("knowledge_base_id","tag_id");--> statement-breakpoint
CREATE INDEX "kb_tags_kb_idx" ON "kb_tags" USING btree ("knowledge_base_id");--> statement-breakpoint
CREATE INDEX "kb_tags_tag_idx" ON "kb_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "assistant_conversations_workspace_idx" ON "assistant_conversations" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "assistant_conversations_user_idx" ON "assistant_conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "assistant_messages_conversation_idx" ON "assistant_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "assistant_messages_created_idx" ON "assistant_messages" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "knowledge_bases" DROP COLUMN "tag_id";