# Native iOS App Setup for iPhone 15

## Overview
Create a native React Native iOS app that connects to your Replit backend for full mobile development capability.

## Prerequisites Verification
Check if you have the required tools:

```bash
# Check Xcode installation
xcode-select --version

# Check iOS Simulator
xcrun simctl list devices

# Check React Native CLI
npx react-native --version

# Check CocoaPods
pod --version
```

## Step 1: Create Native React Native Project

```bash
cd ~/Documents/Personal/NexGen-Fitness
npx react-native@latest init NexGenFitnessiOS
cd NexGenFitnessiOS
```

## Step 2: Install iOS Dependencies

```bash
# Install iOS dependencies
cd ios
pod install
cd ..
```

## Step 3: iOS App Configuration

### Update App Info (ios/NexGenFitnessiOS/Info.plist):
Add network security exception for your Replit server:

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
    <key>NSExceptionDomains</key>
    <dict>
        <key>replit.app</key>
        <dict>
            <key>NSExceptionAllowsInsecureHTTPLoads</key>
            <true/>
            <key>NSExceptionMinimumTLSVersion</key>
            <string>TLSv1.0</string>
        </dict>
    </dict>
</dict>
```

## Step 4: Build and Run on iPhone 15

### Option A: Physical iPhone 15
```bash
# Connect iPhone 15 via USB
# Enable Developer Mode in iPhone Settings
npx react-native run-ios --device
```

### Option B: iOS Simulator (iPhone 15)
```bash
# Run on iPhone 15 simulator
npx react-native run-ios --simulator="iPhone 15"
```

## Step 5: Real Device Setup (iPhone 15)

1. **Enable Developer Mode**:
   - Settings > Privacy & Security > Developer Mode > ON
   
2. **Trust Development Certificate**:
   - When prompted on iPhone, trust the developer certificate
   
3. **Xcode Device Setup**:
   - Open Xcode > Window > Devices and Simulators
   - Add your iPhone 15 as a device
   - Configure development team/signing

## Expected Results

- Native iOS app running on iPhone 15
- Direct connection to Replit backend
- Full access to iOS native features
- Professional app deployment capability