# Exercise GIF Setup Guide

Since Replit has network restrictions that prevent downloading exercise GIFs directly from exercisedb.dev, you can download them locally and upload to Replit.

## Option 1: Download on Local MacBook (Recommended)

### Step 1: Get the exercise URLs
```bash
# Run this helper script to see the download instructions
node scripts/generate-download-list.js
```

### Step 2: Query your database for all exercise URLs
```sql
SELECT id, name, animated_gif_url FROM exercises WHERE animated_gif_url IS NOT NULL ORDER BY name;
```

### Step 3: Download GIFs manually on your MacBook
For each URL in your database:
1. Copy the URL (e.g., `https://v1.cdn.exercisedb.dev/media/UVo2Qs2.gif`)
2. Right-click and "Save As..." or use curl/wget
3. Save with the exact filename from the URL (e.g., `UVo2Qs2.gif`)
4. Save to `public/exercises/gifs/` directory

### Step 2: Create ZIP file
```bash
# Create a compressed archive of the downloaded GIFs
cd public/exercises
zip -r exercise-gifs.zip gifs/
```

### Step 3: Upload to Replit
1. In your Replit project, navigate to the `public/exercises/` directory
2. Upload the `exercise-gifs.zip` file
3. Extract it in Replit:
```bash
cd public/exercises
unzip exercise-gifs.zip
```

### Step 4: Verify Setup
- Exercise animations should now work automatically
- GIFs will be served from `/api/exercise-gif/:gifId` endpoint
- No more placeholder SVGs - real exercise animations!

## Option 2: Manual Upload (Alternative)

If you prefer to download individual GIFs:

1. Visit: https://exercisedb.dev/
2. Find exercises you want to include
3. Right-click on GIF animations and "Save Image As..."
4. Save with naming format: `0001.gif`, `0002.gif`, etc.
5. Upload directly to `public/exercises/gifs/` in Replit

## GIF Filename Reference

Your database contains URLs with alphanumeric filenames. Use the exact filename from each URL:

From your database:
- `UVo2Qs2.gif` - flutter kicks
- `DQ0cqkT.gif` - three bench dip  
- `NZ5Qqkz.gif` - reverse dip
- `5KLbZWx.gif` - kettlebell alternating press
- `U3ffHlY.gif` - cable rope lying on floor tricep extension
- And more...

**Important**: Use the exact filename from your database's `animated_gif_url` field!

## How It Works

1. **Local Storage**: GIFs stored in `public/exercises/gifs/`
2. **API Endpoint**: `/api/exercise-gif/:gifId` serves local GIFs
3. **Fallback**: SVG placeholders shown for missing GIFs
4. **Frontend**: Automatically converts exercisedb URLs to local URLs

## Current Status

✅ Local GIF serving system implemented  
✅ Professional SVG placeholders for missing GIFs  
✅ Download script ready for local MacBook use  
⏳ Awaiting GIF upload to activate animations  

Once you upload the GIFs, exercise animations will work seamlessly!