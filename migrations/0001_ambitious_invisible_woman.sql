ALTER TABLE "chat_messages" ADD COLUMN "status" varchar DEFAULT 'approved';--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "trainer_id" varchar;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "trainer_notes" text;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "approved_at" timestamp;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "original_ai_response" text;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "exercise_type" varchar;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "equipment_type" varchar;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "body_part" varchar;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "animated_gif_url" varchar;