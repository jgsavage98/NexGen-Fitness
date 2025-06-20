# Fitness Coach Mobile App

React Native mobile application that connects to the existing fitness coaching backend.

## Features

- **Real-time Chat**: Direct coaching with Coach Chassidy (AI-powered)
- **Macro Tracking**: Camera-based nutrition photo uploads
- **Progress Monitoring**: Weight tracking and goal management
- **Dashboard**: Overview of daily targets and achievements

## Development Setup

### Prerequisites

- Node.js 18+
- Xcode 14+ (for iOS development)
- React Native CLI
- CocoaPods (for iOS dependencies)

### Installation

1. Install dependencies:
```bash
cd mobile
npm install
```

2. Install iOS dependencies:
```bash
cd ios && pod install && cd ..
```

3. Start Metro bundler:
```bash
npm start
```

4. Run on iOS simulator:
```bash
npm run ios
```

## API Configuration

The app connects to the same backend as the web application:

- **Development**: `http://localhost:5000`
- **Production**: Update `API_BASE_URL` in `src/config/api.ts`

## Architecture

- **Authentication**: Token-based auth using existing backend system
- **State Management**: React Context for user state
- **Navigation**: React Navigation with bottom tabs
- **Storage**: AsyncStorage for offline data

## App Store Build

To build for App Store submission:

1. Update version in `app.json`
2. Configure signing in Xcode
3. Build release version:
```bash
npx react-native build-ios --configuration Release
```

## Backend Integration

The mobile app uses the same API endpoints as the web application:

- `/api/auth/*` - Authentication
- `/api/daily-macros` - Macro data
- `/api/chat/messages` - Real-time chat
- `/api/upload-macro-screenshot` - Photo uploads
- `/api/progress-entries` - Weight tracking