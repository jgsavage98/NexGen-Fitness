# Fix iPhone + Mac Network Connection for Expo

## The Problem
Your iPhone can't connect to your Mac's Expo development server on the local network.

## Quick Fixes to Try:

### 1. Check WiFi Connection
- Ensure both iPhone and Mac are on the **same WiFi network**
- Check iPhone Settings > WiFi - should show same network name as Mac
- Try disconnecting and reconnecting iPhone to WiFi

### 2. Restart Expo with Tunnel Mode
On your Mac terminal:
```bash
cd ~/Documents/Personal/NexGen-Fitness/TestAppExpo
npx expo start --tunnel
```

This creates a tunnel connection that bypasses local network issues.

### 3. Use Manual Connection
If QR code doesn't work:
1. In Expo Go app, tap "Enter URL manually"
2. Type: `exp://192.168.68.67:8081`
3. If that fails, try the tunnel URL from step 2

### 4. Check Mac Firewall
- Go to System Preferences > Security & Privacy > Firewall
- Make sure it allows Expo/Node.js connections
- Or temporarily disable firewall for testing

### 5. Reset Network Settings (Last Resort)
On iPhone: Settings > General > Reset > Reset Network Settings
(This will remove saved WiFi passwords)

## Alternative: Use Expo Go Web Preview
If network issues persist:
```bash
npx expo start --web
```
This opens the app in your Mac's browser instead of iPhone.