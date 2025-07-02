# NexGen-Fitness Mobile App Setup Guide

## Quick Setup Instructions

Since you're encountering Ruby/CocoaPods issues with React Native CLI, use Expo for a much simpler setup:

### Step 1: Create Expo Project
```bash
# From your NexGen-Fitness directory
npx create-expo-app@latest NexGenFitnessApp --template blank-typescript
cd NexGenFitnessApp
```

### Step 2: Copy Your App Code
```bash
# Copy your existing mobile app code
cp -r ../mobile/src ./
cp ../mobile/App.tsx ./

# The API configuration is already set up to connect to your Mac's IP address
# Your mobile app will connect to: http://192.168.68.67:5000
```

### Step 3: Install Dependencies
```bash
# Install navigation and other dependencies for Expo
npx expo install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack
npx expo install expo-image-picker expo-secure-store @react-native-async-storage/async-storage
npx expo install react-native-screens react-native-safe-area-context
```

### Step 4: Run the App
```bash
# Start your backend server (Terminal 1)
cd ../
npm run dev

# Start Expo (Terminal 2 - from NexGenFitnessApp directory)
npx expo start

# Press 'i' to open iOS simulator
# Or scan QR code with Expo Go app on your phone
```

## Alternative: Fix React Native CLI Issues

If you prefer to stick with React Native CLI, try these fixes:

### Fix Ruby/CocoaPods
```bash
# Update Ruby gems and CocoaPods
sudo gem update --system
sudo gem install cocoapods
sudo gem install activesupport -v 7.0.0

# From your NexGenFitnessMobile/ios directory
pod cache clean --all
pod deintegrate
pod setup
pod install --repo-update
```

### Install Xcode Command Line Tools
```bash
xcode-select --install
sudo xcodebuild -license accept
sudo xcodebuild -runFirstLaunch
```

## Recommended: Use Expo

Expo is much simpler and avoids all the Ruby/CocoaPods/Xcode setup complexity. It's perfect for your NexGen-Fitness app and will get you running immediately.

Your app will have:
- Dashboard with macro targets
- Real-time chat with Coach Chassidy
- Photo upload for nutrition tracking
- Progress monitoring
- Full backend integration

## Next Steps

1. Run the Expo setup commands above
2. Your NexGen-Fitness mobile app will connect to your existing backend
3. Test login, chat, photo upload, and progress tracking features
4. Deploy to app stores when ready

The Expo approach will have you running in minutes instead of hours debugging environment issues.