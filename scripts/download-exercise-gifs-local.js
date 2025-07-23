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

// Dynamically fetch exercises from the database to get actual URLs
let exerciseGifs = [];

// We'll populate this from the database query

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
  console.log(`🏋️  This script requires database access to fetch actual exercise URLs`);
  console.log(`📋 Instead, use the database URLs directly from your exercises table`);
  console.log(`\n💡 Manual process:`);
  console.log(`1. Query your database: SELECT id, name, animated_gif_url FROM exercises WHERE animated_gif_url IS NOT NULL;`);
  console.log(`2. For each URL like: https://v1.cdn.exercisedb.dev/media/UVo2Qs2.gif`);
  console.log(`3. Download and save as: UVo2Qs2.gif (use the exact filename from URL)`);
  console.log(`4. Upload all GIFs to public/exercises/gifs/ in Replit`);
  console.log(`\n📁 Files should be saved to: ${exercisesDir}`);
}

// Run the download
downloadAllGifs().catch(console.error);