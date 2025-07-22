// server/schema/exercises.ts
import { pgTable, serial, text, smallint } from "drizzle-orm/pg-core";

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  primaryMuscle: text("primary_muscle").notNull(),
  secondaryMuscles: text("secondary_muscles").array(),
  equipment: text("equipment").array(),
  gifUrl: text("gif_url"),
  instructionsMd: text("instructions_md"),
  difficulty: text("difficulty"),
  movementType: text("movement_type"),
  force: text("force"),
  defaultSets: smallint("default_sets"),
  defaultReps: smallint("default_reps"),
  source: text("source").default("ExerciseDB"),
  sourceId: text("source_id"),
});
