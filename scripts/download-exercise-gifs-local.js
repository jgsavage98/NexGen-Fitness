import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create exercises directory if it doesn't exist
const exercisesDir = path.join(__dirname, '../public/exercises/gifs');
if (!fs.existsSync(exercisesDir)) {
  fs.mkdirSync(exercisesDir, { recursive: true });
}

// Expanded list of popular exercise GIFs from exercisedb
const exerciseGifs = [
  { id: '0001', url: 'https://v1.cdn.exercisedb.dev/media/0001.gif', name: '3_4_sit_up' },
  { id: '0002', url: 'https://v1.cdn.exercisedb.dev/media/0002.gif', name: 'ab_crunch' },
  { id: '0003', url: 'https://v1.cdn.exercisedb.dev/media/0003.gif', name: 'air_bike' },
  { id: '0004', url: 'https://v1.cdn.exercisedb.dev/media/0004.gif', name: 'all_fours_quad_stretch' },
  { id: '0005', url: 'https://v1.cdn.exercisedb.dev/media/0005.gif', name: 'alternate_heel_touchers' },
  { id: '0006', url: 'https://v1.cdn.exercisedb.dev/media/0006.gif', name: 'alternate_lateral_pulldown' },
  { id: '0007', url: 'https://v1.cdn.exercisedb.dev/media/0007.gif', name: 'ankle_circles' },
  { id: '0008', url: 'https://v1.cdn.exercisedb.dev/media/0008.gif', name: 'archer_pull_up' },
  { id: '0009', url: 'https://v1.cdn.exercisedb.dev/media/0009.gif', name: 'archer_push_up' },
  { id: '0010', url: 'https://v1.cdn.exercisedb.dev/media/0010.gif', name: 'arm_circles' },
  { id: '0011', url: 'https://v1.cdn.exercisedb.dev/media/0011.gif', name: 'arnold_press' },
  { id: '0012', url: 'https://v1.cdn.exercisedb.dev/media/0012.gif', name: 'assisted_chin_up' },
  { id: '0013', url: 'https://v1.cdn.exercisedb.dev/media/0013.gif', name: 'assisted_pull_up' },
  { id: '0014', url: 'https://v1.cdn.exercisedb.dev/media/0014.gif', name: 'assisted_standing_pull_up' },
  { id: '0015', url: 'https://v1.cdn.exercisedb.dev/media/0015.gif', name: 'back_extension' },
  { id: '0016', url: 'https://v1.cdn.exercisedb.dev/media/0016.gif', name: 'back_pec_stretch' },
  { id: '0017', url: 'https://v1.cdn.exercisedb.dev/media/0017.gif', name: 'ball_crunch' },
  { id: '0018', url: 'https://v1.cdn.exercisedb.dev/media/0018.gif', name: 'barbell_bench_press' },
  { id: '0019', url: 'https://v1.cdn.exercisedb.dev/media/0019.gif', name: 'barbell_bent_over_row' },
  { id: '0020', url: 'https://v1.cdn.exercisedb.dev/media/0020.gif', name: 'barbell_bicep_curl' },
  { id: '0021', url: 'https://v1.cdn.exercisedb.dev/media/0021.gif', name: 'barbell_deadlift' },
  { id: '0022', url: 'https://v1.cdn.exercisedb.dev/media/0022.gif', name: 'barbell_squat' },
  { id: '0023', url: 'https://v1.cdn.exercisedb.dev/media/0023.gif', name: 'bench_press' },
  { id: '0024', url: 'https://v1.cdn.exercisedb.dev/media/0024.gif', name: 'bicycle_crunches' },
  { id: '0025', url: 'https://v1.cdn.exercisedb.dev/media/0025.gif', name: 'burpees' },
  { id: '0026', url: 'https://v1.cdn.exercisedb.dev/media/0026.gif', name: 'calf_raises' },
  { id: '0027', url: 'https://v1.cdn.exercisedb.dev/media/0027.gif', name: 'chest_fly' },
  { id: '0028', url: 'https://v1.cdn.exercisedb.dev/media/0028.gif', name: 'chin_ups' },
  { id: '0029', url: 'https://v1.cdn.exercisedb.dev/media/0029.gif', name: 'dips' },
  { id: '0030', url: 'https://v1.cdn.exercisedb.dev/media/0030.gif', name: 'dumbbell_curls' },
  { id: '0031', url: 'https://v1.cdn.exercisedb.dev/media/0031.gif', name: 'dumbbell_press' },
  { id: '0032', url: 'https://v1.cdn.exercisedb.dev/media/0032.gif', name: 'jumping_jacks' },
  { id: '0033', url: 'https://v1.cdn.exercisedb.dev/media/0033.gif', name: 'lat_pulldown' },
  { id: '0034', url: 'https://v1.cdn.exercisedb.dev/media/0034.gif', name: 'lunges' },
  { id: '0035', url: 'https://v1.cdn.exercisedb.dev/media/0035.gif', name: 'mountain_climbers' },
  { id: '0036', url: 'https://v1.cdn.exercisedb.dev/media/0036.gif', name: 'overhead_press' },
  { id: '0037', url: 'https://v1.cdn.exercisedb.dev/media/0037.gif', name: 'planks' },
  { id: '0038', url: 'https://v1.cdn.exercisedb.dev/media/0038.gif', name: 'pull_ups' },
  { id: '0039', url: 'https://v1.cdn.exercisedb.dev/media/0039.gif', name: 'push_ups' },
  { id: '0040', url: 'https://v1.cdn.exercisedb.dev/media/0040.gif', name: 'romanian_deadlift' },
  { id: '0041', url: 'https://v1.cdn.exercisedb.dev/media/0041.gif', name: 'shoulder_shrugs' },
  { id: '0042', url: 'https://v1.cdn.exercisedb.dev/media/0042.gif', name: 'side_planks' },
  { id: '0043', url: 'https://v1.cdn.exercisedb.dev/media/0043.gif', name: 'tricep_extensions' },
  { id: '0044', url: 'https://v1.cdn.exercisedb.dev/media/0044.gif', name: 'tricep_dips' },
  { id: '0045', url: 'https://v1.cdn.exercisedb.dev/media/0045.gif', name: 'wall_sits' },
];

function downloadFile(url, filename) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const filePath = path.join(exercisesDir, filename);
    
    // Skip if file already exists
    if (fs.existsSync(filePath)) {
      console.log(`⏭️  Skipping ${filename} - already exists`);
      resolve();
      return;
    }
    
    console.log(`📥 Downloading ${filename}...`);
    
    const file = fs.createWriteStream(filePath);
    
    const request = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'image/gif,image/*,*/*',
        'Referer': 'https://exercisedb.dev/',
      }
    }, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          console.log(`✅ Downloaded ${filename} (${(fs.statSync(filePath).size / 1024).toFixed(1)}KB)`);
          resolve();
        });
      } else if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirects
        const redirectUrl = response.headers.location;
        console.log(`🔄 Redirecting to: ${redirectUrl}`);
        fs.unlink(filePath, () => {});
        downloadFile(redirectUrl, filename).then(resolve).catch(reject);
      } else {
        fs.unlink(filePath, () => {}); // Delete file on error
        reject(new Error(`HTTP ${response.statusCode} for ${url}`));
      }
    });
    
    request.on('error', (error) => {
      fs.unlink(filePath, () => {}); // Delete file on error
      reject(error);
    });
    
    file.on('error', (error) => {
      fs.unlink(filePath, () => {}); // Delete file on error
      reject(error);
    });
    
    // Set timeout for each download (30 seconds)
    request.setTimeout(30000, () => {
      request.destroy();
      fs.unlink(filePath, () => {});
      reject(new Error(`Download timeout for ${filename}`));
    });
  });
}

async function downloadAllGifs() {
  console.log(`🏋️  Starting download of ${exerciseGifs.length} exercise GIFs...`);
  console.log(`📁 Saving to: ${exercisesDir}`);
  
  let successCount = 0;
  let failCount = 0;
  let totalSize = 0;
  
  for (const exercise of exerciseGifs) {
    try {
      await downloadFile(exercise.url, `${exercise.id}.gif`);
      
      // Calculate file size if it exists
      const filePath = path.join(exercisesDir, `${exercise.id}.gif`);
      if (fs.existsSync(filePath)) {
        totalSize += fs.statSync(filePath).size;
      }
      
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to download ${exercise.name}: ${error.message}`);
      failCount++;
    }
    
    // Add small delay to be respectful to the server
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log(`\n📊 Download Summary:`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📦 Total size: ${(totalSize / 1024 / 1024).toFixed(1)}MB`);
  console.log(`📁 Files saved to: ${exercisesDir}`);
  
  if (successCount > 0) {
    console.log(`\n🚀 Next steps:`);
    console.log(`1. Compress the gifs folder: zip -r exercise-gifs.zip public/exercises/gifs/`);
    console.log(`2. Upload exercise-gifs.zip to your Replit project`);
    console.log(`3. Extract in Replit: unzip exercise-gifs.zip`);
    console.log(`4. Exercise animations will work automatically!`);
  }
}

// Run the download
downloadAllGifs().catch(console.error);