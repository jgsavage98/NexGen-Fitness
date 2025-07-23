// This script generates a list of GIF URLs from your database
// Run this in your Replit environment to get the actual URLs to download

console.log('🏋️ Generating exercise GIF download list from database...');
console.log('📋 Copy these URLs and download them manually on your MacBook:\n');

// Sample based on what we saw in the database
const sampleExercises = [
  { id: 3544, name: 'flutter kicks', url: 'https://v1.cdn.exercisedb.dev/media/UVo2Qs2.gif' },
  { id: 3565, name: 'three bench dip', url: 'https://v1.cdn.exercisedb.dev/media/DQ0cqkT.gif' },
  { id: 4174, name: 'reverse dip', url: 'https://v1.cdn.exercisedb.dev/media/NZ5Qqkz.gif' },
  { id: 3062, name: 'kettlebell alternating press', url: 'https://v1.cdn.exercisedb.dev/media/5KLbZWx.gif' },
  { id: 3063, name: 'cable rope lying on floor tricep extension', url: 'https://v1.cdn.exercisedb.dev/media/U3ffHlY.gif' },
];

console.log('📥 Download URLs (right-click → Save As):');
console.log('=' .repeat(60));

sampleExercises.forEach(exercise => {
  const urlParts = exercise.url.split('/');
  const filename = urlParts[urlParts.length - 1];
  console.log(`${exercise.name}:`);
  console.log(`  URL: ${exercise.url}`);
  console.log(`  Save as: ${filename}`);
  console.log('');
});

console.log('🔄 For the complete list, run this SQL query in your database:');
console.log('   SELECT id, name, animated_gif_url FROM exercises WHERE animated_gif_url IS NOT NULL ORDER BY name;');
console.log('');
console.log('📁 Save all GIFs to: public/exercises/gifs/');
console.log('📦 Then zip and upload to Replit: zip -r exercise-gifs.zip public/exercises/gifs/');