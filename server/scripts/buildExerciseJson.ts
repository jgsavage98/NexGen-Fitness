// server/scripts/buildExerciseJson.ts
import { readFileSync, writeFileSync } from "fs";

// 1) read the big JSON file ExerciseDB ships
const raw: any[] = JSON.parse(
  readFileSync(
    "exercisedb-api/src/data/exercises.json",
    "utf8"
  )
);

// 2) map each row to the columns you’ll seed
const catalog = raw.map((j) => ({
  exerciseId:      j.exerciseId,            // keep original ID for reference
  name:            j.name,
  equipment:       j.equipments ?? [],      // ExerciseDB uses plural key
  primaryMuscle:   j.targetMuscles?.[0] ?? null,
  secondaryMuscles:j.secondaryMuscles ?? [],
  gifUrl:          j.gifUrl,                // animated GIF – no MP4
  instructions:    j.instructions,          // array of step strings
}));

// 3) write to server/full_catalog.json
writeFileSync(
  "server/full_catalog.json",
  JSON.stringify(catalog, null, 2)
);
console.log(`✅  Wrote ${catalog.length} records to server/full_catalog.json`);
