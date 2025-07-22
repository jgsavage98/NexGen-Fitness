import { readFileSync } from "fs";
import slugify from "slugify";
import { db } from "../db";
import { exercises } from "../../shared/schema";   // path points to your big schema

const rows = JSON.parse(
  readFileSync("server/full_catalog.json", "utf8"),
) as Array<{
  exerciseId: string;
  name: string;
  gifUrl: string;
  targetMuscles: string[];
  bodyParts: string[];
  equipments: string[];
  secondaryMuscles: string[];
  instructions: string[];
}>;

for (const r of rows) {
  await db
    .insert(exercises)
    .values({
      // mandatory
      name: r.name,
      slug: slugify(r.name, { lower: true, strict: true }),
      instructions: r.instructions.join("\n"),

      // simple mappings
      category: "strength",
      exerciseType: r.bodyParts?.[0] ?? null,
      bodyPart: r.bodyParts?.[0] ?? null,
      equipmentType: r.equipments?.[0] ?? null,
      equipment: r.equipments?.[0] ?? null,

      primaryMuscles: r.targetMuscles,
      secondaryMuscles: r.secondaryMuscles ?? [],

      animatedGifUrl: r.gifUrl,
      imageUrl: r.gifUrl,
      sourceId: r.exerciseId,            // matches your table
    })
    .onConflictDoNothing();              // safe to re‑run
}

console.log("✅  ExerciseDB seed complete");
