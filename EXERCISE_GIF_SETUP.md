# Exercise GIF Setup Guide

Since Replit has network restrictions that prevent downloading exercise GIFs directly from exercisedb.dev, you can download them locally and upload to Replit.

## Option 1: Download on Local MacBook (Recommended)

### Step 1: Download on your MacBook
```bash
# Clone the repo to your MacBook (if not already done)
git clone https://github.com/your-repo/nexgen-fitness.git
cd nexgen-fitness

# Run the download script locally (where network access works)
node scripts/download-exercise-gifs-local.js
```

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

## GIF ID Reference

The system expects GIFs named by their exercisedb ID:
- `0001.gif` - 3/4 Sit-up
- `0002.gif` - Ab Crunch  
- `0003.gif` - Air Bike
- `0018.gif` - Barbell Bench Press
- `0021.gif` - Barbell Deadlift
- `0022.gif` - Barbell Squat
- `0039.gif` - Push-ups
- And more...

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