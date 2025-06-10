CREATE TABLE "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"message" text NOT NULL,
	"is_ai" boolean DEFAULT false,
	"metadata" jsonb,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_macros" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"date" date NOT NULL,
	"screenshot_url" varchar,
	"screenshot_uploaded_at" timestamp,
	"extracted_calories" real,
	"extracted_protein" real,
	"extracted_carbs" real,
	"extracted_fat" real,
	"vision_confidence" real,
	"vision_processed_at" timestamp,
	"target_calories" real,
	"target_protein" real,
	"target_carbs" real,
	"target_fat" real,
	"adherence_score" real,
	"hunger_level" integer,
	"energy_level" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "daily_macros_user_id_date_unique" UNIQUE("user_id","date")
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"instructions" text,
	"category" varchar,
	"primary_muscles" text[] DEFAULT '{}',
	"secondary_muscles" text[] DEFAULT '{}',
	"equipment" varchar,
	"difficulty" varchar,
	"video_url" varchar,
	"image_url" varchar,
	"regression_id" integer,
	"progression_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "macro_changes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"date" date NOT NULL,
	"old_calories" real,
	"old_protein" real,
	"old_carbs" real,
	"old_fat" real,
	"ai_proposal" jsonb,
	"ai_calories" real,
	"ai_protein" real,
	"ai_carbs" real,
	"ai_fat" real,
	"ai_reasoning" text,
	"final_calories" real,
	"final_protein" real,
	"final_carbs" real,
	"final_fat" real,
	"status" varchar DEFAULT 'pending',
	"trainer_id" varchar,
	"trainer_notes" text,
	"approved_at" timestamp,
	"screenshot_url" varchar,
	"weight_trend" real,
	"program_day" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "macro_targets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"calories" real NOT NULL,
	"protein" real NOT NULL,
	"carbs" real NOT NULL,
	"fat" real NOT NULL,
	"date" date NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "macro_targets_user_date_unique" UNIQUE("user_id","date")
);
--> statement-breakpoint
CREATE TABLE "meals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"calories" real NOT NULL,
	"protein" real NOT NULL,
	"carbs" real NOT NULL,
	"fat" real NOT NULL,
	"fiber" real,
	"sugar" real,
	"meal_type" varchar,
	"logged_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "progress_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"weight" real,
	"body_fat" real,
	"muscle_mass" real,
	"measurements" jsonb,
	"photos" text[] DEFAULT '{}',
	"notes" text,
	"recorded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trainers" (
	"id" varchar PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"photo_url" varchar,
	"bio" text,
	"specialties" text[] DEFAULT '{}',
	"certifications" text[] DEFAULT '{}',
	"years_experience" integer DEFAULT 0,
	"clients_helped" integer DEFAULT 0,
	"rating" real DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"goal" varchar,
	"weight" real,
	"goal_weight" real,
	"height" integer,
	"age" integer,
	"gender" varchar,
	"activity_level" varchar,
	"workout_frequency" integer,
	"injuries" text[] DEFAULT '{}',
	"equipment" text[] DEFAULT '{}',
	"onboarding_completed" boolean DEFAULT false,
	"trainer_id" varchar DEFAULT 'coach_chassidy',
	"program_start_date" timestamp,
	"timezone" varchar DEFAULT 'America/New_York',
	"profile_picture" varchar,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workout_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"workout_id" integer,
	"exercise_id" integer NOT NULL,
	"sets" integer,
	"reps" integer,
	"weight" real,
	"duration" integer,
	"notes" text,
	"completed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"type" varchar,
	"target_muscle_groups" text[] DEFAULT '{}',
	"estimated_duration" integer,
	"difficulty" varchar,
	"exercises" jsonb NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");