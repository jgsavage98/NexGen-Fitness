# iOS Xcode Build Debug Guide

## Current Status
✅ **React Native project created successfully**
✅ **iOS project files generated properly**
❌ **Xcode build failing with exit code 70**

## Debug Steps

### 1. Open Xcode to See Detailed Error
```bash
cd ~/Documents/Personal/NexGen-Fitness/NexGenFitnessiOS
open ios/NexGenFitnessiOS.xcworkspace
```

### 2. Clean Build Folder
In Xcode:
- Product → Clean Build Folder (Cmd+Shift+K)
- Wait for completion

### 3. Check Build Settings
Common issues and fixes:
- **Deployment Target**: Make sure iOS deployment target is compatible (usually 12.0+)
- **Code Signing**: Ensure proper development team selected
- **Architectures**: Should include arm64 for iPhone 15

### 4. Alternative: Try Different Simulator
```bash
# List available simulators
xcrun simctl list devices

# Try iPhone 14 Pro instead
npx react-native run-ios --simulator="iPhone 14 Pro"
```

### 5. Reset React Native Cache
```bash
cd ~/Documents/Personal/NexGen-Fitness/NexGenFitnessiOS
npx react-native start --reset-cache
```

### 6. Reinstall CocoaPods
```bash
cd ios
rm -rf Pods
rm Podfile.lock
pod install
cd ..
```

### 7. Check Node/iOS Environment
```bash
npx react-native doctor
```

## Most Common Fixes for Exit Code 70

### Fix 1: Code Signing Issue
In Xcode:
1. Select project in navigator
2. Go to "Signing & Capabilities"
3. Select your development team
4. Enable "Automatically manage signing"

### Fix 2: Deployment Target
In Xcode:
1. Select project → Build Settings
2. Search for "iOS Deployment Target"
3. Set to 12.0 or higher

### Fix 3: Clean Everything
```bash
cd ~/Documents/Personal/NexGen-Fitness/NexGenFitnessiOS
rm -rf node_modules
rm -rf ios/Pods
rm ios/Podfile.lock
npm install
cd ios && pod install && cd ..
```

## Expected Result
Once fixed, you should see:
- iPhone 15 simulator launches
- NexGen Fitness app loads
- Connection interface displays
- Ready to test Replit backend connection

## Next Steps After Build Success
1. Enter your Replit URL in the app
2. Test native iOS connection
3. Verify all 5 users display
4. Confirm native iOS development is working