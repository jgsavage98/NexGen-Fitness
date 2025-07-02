# NexGen-Fitness Mobile App Local Setup

## ✅ SUCCESS - Expo Working on Your Mac!

Great work! The Git clone and Expo installation succeeded on your local Mac, confirming the network issues were specific to the Replit environment.

## Next Steps for Mobile App Setup

### 1. Copy Your Mobile App Code
```bash
# You're in NexGen-Fitness directory, now navigate to the Expo project
cd NexGenFitnessMobile

# Copy the mobile app source code from your cloned repo
cp -r ../mobile/src ./src
cp ../mobile/App.tsx ./App.tsx

# Copy the API configuration (already has the correct IP)
cp ../mobile/src/config/api.ts ./src/config/api.ts
```

### 2. Install Required Dependencies
```bash
# Install React Navigation and other dependencies
npx expo install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack
npx expo install expo-image-picker expo-secure-store @react-native-async-storage/async-storage
npx expo install react-native-screens react-native-safe-area-context
```

### 3. Update API Configuration for Local Mac
Since you're running locally, update the API base URL to point to your Replit backend:

In `src/config/api.ts`, change:
```typescript
export const API_BASE_URL = isDev 
  ? 'http://192.168.68.67:5000'  // Your Replit URL 
  : 'https://your-production-domain.com';
```

### 4. Start the Mobile App
```bash
# Start Expo
npx expo start

# Press 'i' for iOS simulator or scan QR code with Expo Go app on your iPhone
```

### 5. Verify Backend Connection
Your Replit backend is running on `http://192.168.68.67:5000` and should be accessible from your Mac. Test the connection:

```bash
# Test from your Mac terminal
curl http://192.168.68.67:5000/api/auth/available-users
```

## Expected Results
- Mobile app should connect to your Replit backend
- All features should work: login, chat with Coach Chassidy, macro tracking, progress monitoring
- Real-time chat and AI responses should function normally

## Troubleshooting
If the mobile app can't connect to the backend:
1. Ensure your Mac and Replit are on the same network
2. Try using the Replit public URL instead of the IP address
3. Check if any Mac firewall settings are blocking the connection

Run these steps and let me know how the mobile app performs!