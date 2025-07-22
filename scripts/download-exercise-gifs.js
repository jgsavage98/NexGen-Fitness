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

// Sample exercise GIF URLs from exercisedb - you can expand this list
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
        'User-Agent': 'Mozilla/5.0 (compatible; fitness-app/1.0)',
        'Accept': 'image/gif,image/*,*/*',
      }
    }, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          console.log(`✅ Downloaded ${filename}`);
          resolve();
        });
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
  });
}

async function downloadAllGifs() {
  console.log(`🏋️  Starting download of ${exerciseGifs.length} exercise GIFs...`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const exercise of exerciseGifs) {
    try {
      await downloadFile(exercise.url, `${exercise.id}.gif`);
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to download ${exercise.name}: ${error.message}`);
      failCount++;
    }
    
    // Add small delay to be respectful to the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n📊 Download Summary:`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📁 Files saved to: ${exercisesDir}`);
}

// Run the download
downloadAllGifs().catch(console.error);