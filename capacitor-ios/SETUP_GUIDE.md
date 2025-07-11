# NexGen Fitness iOS App Setup Guide

## Prerequisites
- macOS with Xcode installed
- Node.js 16+ installed
- iOS Simulator or physical iOS device

## Quick Setup (5 minutes)

### 1. Install Capacitor CLI
```bash
npm install -g @capacitor/cli
```

### 2. Navigate to capacitor-ios folder
```bash
cd capacitor-ios
```

### 3. Install dependencies
```bash
npm install
```

### 4. Initialize Capacitor (first time only)
```bash
npx cap init "NexGen Fitness Coach" "com.nexgenfitness.coach"
```

### 5. Add iOS platform
```bash
npx cap add ios
```

### 6. Sync project
```bash
npx cap sync
```

### 7. Open in Xcode
```bash
npx cap open ios
```

## Running the App

### Option 1: iOS Simulator
```bash
npx cap run ios
```

### Option 2: Physical Device
1. Connect your iPhone via USB
2. Open Xcode from step 7
3. Select your device as the target
4. Click the "Play" button in Xcode

## What You Get

✅ **Native iOS App**: Your web app wrapped in a native iOS container
✅ **App Store Ready**: Configured for App Store submission
✅ **Zero Code Changes**: Uses your existing web app at https://ai-companion-jgsavage98.replit.app
✅ **Native Features**: Status bar, splash screen, keyboard handling
✅ **iOS Integration**: Proper iOS look and feel

## Configuration

The app is configured to:
- Load your web app from the production URL
- Use dark theme to match your app
- Handle iOS-specific features like status bar and keyboard
- Show a professional splash screen during loading

## Deployment

To deploy to App Store:
1. Open the project in Xcode
2. Configure signing & capabilities
3. Archive the app
4. Submit to App Store Connect

## Troubleshooting

**Build errors?**
- Ensure Xcode is updated to latest version
- Run `npx cap sync` after any configuration changes

**App not loading?**
- Check that https://ai-companion-jgsavage98.replit.app is accessible
- Verify internet connection on device/simulator

**Need to update?**
- Web app updates automatically (no app rebuild needed)
- For native features, run `npx cap sync` and rebuild