# React Native Mobile App Setup

## Quick Start Guide

Your React Native fitness coaching app is ready to run. Follow these steps to get it working:

### 1. Install Dependencies

```bash
cd mobile
npm install --legacy-peer-deps
```

If you get dependency conflicts, use:
```bash
npm install --force
```

### 2. iOS Setup (Mac Required)

Install Xcode from the Mac App Store, then:
```bash
cd ios
pod install
cd ..
```

### 3. Start the App

Start Metro bundler:
```bash
npm start
```

Run on iOS simulator:
```bash
npm run ios
```

### 4. Backend Connection

The app connects to your existing backend at `http://localhost:5000`. Make sure your backend server is running before testing the mobile app.

## What Works Now

✅ **Authentication**: Login with existing user accounts
✅ **Dashboard**: Shows macro targets and today's uploads
✅ **Chat**: Real-time messaging with Coach Chassidy  
✅ **Camera**: Photo upload for macro tracking
✅ **Progress**: Weight tracking and trends

## App Store Preparation

When ready for App Store:

1. Update app metadata in `app.json`
2. Add app icons to `ios/FitnessCoachApp/Images.xcassets/`
3. Configure signing in Xcode
4. Build release version: `npm run build:ios`

## Architecture

- **Frontend**: React Native with native iOS navigation
- **Backend**: Your existing Node.js/Express API (unchanged)
- **Authentication**: Same token system as web app
- **Real-time**: WebSocket connection to existing chat system

The mobile app is a completely separate frontend that talks to your existing backend. Your web app continues working exactly as before.