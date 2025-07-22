// server/scripts/seedExerciseDB.ts
import { readFileSync } from "fs";
import { db } from "../db";
import { exercises } from "../../shared/schema";  // path to the table above

type Source = {
  exerciseId: string;
  name: string;
  gifUrl: string;
  instructions: string[];
  targetMuscles: string[];
  bodyParts: string[];
  equipments: string[];
  secondaryMuscles: string[];
};

const rows: Source[] = JSON.parse(
  readFileSync("server/full_catalog.json", "utf8"),
);

for (const r of rows) {
  await db
    .insert(exercises)
    .values({
      /* ─── REQUIRED ─── */
      name: r.name,
      instructions: r.instructions.join("\n"),

      /* ─── BASIC TAGS ─── */
      category: "strength",                     // generic default
      exerciseType: "strength",                 // matches your comment
      bodyPart: r.bodyParts?.[0] ?? null,       // e.g. "neck", "waist"
      equipmentType: r.equipments?.[0] ?? null, // e.g. "band", "barbell"
      equipment: r.equipments?.[0] ?? null,

      /* ─── MUSCLE ARRAYS ─── */
      primaryMuscles: r.targetMuscles,
      secondaryMuscles: r.secondaryMuscles ?? [],

      /* ─── MEDIA ─── */
      animatedGifUrl: r.gifUrl,                 // main demo
      imageUrl: r.gifUrl,                       // list thumbnail
      videoUrl: null,                           // you chose GIF‑only

      /* ─── OPTIONAL FIELDS ─── */
      difficulty: null,         // fill later via ChatGPT
      regressionId: null,
      progressionId: null,
    })
    .onConflictDoNothing();     // safe to re‑run
}

console.log("✅  ExerciseDB seed complete");
