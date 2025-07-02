# NexGen-Fitness Expo Setup - Step by Step

## Problem Diagnosed
- Port 8081 is accessible (Metro bundler port)
- Issue is likely in the Expo project setup or app code copying

## Solution Steps

### Step 1: Clean Setup
```bash
# Remove any existing projects
rm -rf NexGenFitnessApp TestApp

# Create fresh Expo project
npx create-expo-app@latest NexGenFitnessApp --template blank
cd NexGenFitnessApp
```

### Step 2: Test Basic Expo First
```bash
# Test the default Expo app first
npx expo start --clear

# Press 'i' to open iOS simulator
# You should see "Open up App.js to start working on your app!"
```

### Step 3: Add Your NexGen-Fitness Code (Only after Step 2 works)
```bash
# Stop the Expo server (Ctrl+C)

# Install required dependencies
npx expo install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack
npx expo install expo-image-picker expo-secure-store @react-native-async-storage/async-storage
npx expo install react-native-screens react-native-safe-area-context

# Copy your mobile app code
cp -r ../mobile/src ./
cp ../mobile/App.tsx ./App.tsx

# Restart Expo
npx expo start --clear
```

### Step 4: Alternative - Simple Test App
If Step 2 fails, try this minimal test:

```bash
# Create minimal test
echo 'import { Text, View } from "react-native";
export default function App() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>NexGen Fitness Mobile App Working!</Text>
    </View>
  );
}' > App.js

# Start Expo
npx expo start --clear
```

### Step 5: Terminal Output Check
When running `npx expo start`, you should see:
- "Metro waiting on exp://192.168.68.67:8081"
- QR code displayed
- No error messages about port binding

### Step 6: iOS Simulator Alternative
If iOS simulator fails, try:
1. Download "Expo Go" app on your iPhone
2. Scan the QR code from `npx expo start`
3. This bypasses simulator networking issues

## Next Steps
1. Try Step 1-2 first (basic Expo test)
2. Report back what you see in the terminal
3. Once basic Expo works, add your NexGen-Fitness code