# Download and Run on Your Mac

## Downloading the Project

### Option 1: Git Clone (Recommended)
If you have git installed:
```bash
git clone https://replit.com/github/YourReplit/YourProject.git
cd YourProject
```

### Option 2: Download ZIP
1. Click the three dots menu in Replit
2. Select "Download as ZIP"
3. Extract to your desired folder

## Running on Your MacBook

### Backend Setup
```bash
# Install dependencies
npm install

# Start the backend server
npm run dev
```
This starts your fitness coaching backend on http://localhost:5000

### Mobile App Setup
```bash
# Navigate to mobile folder
cd mobile

# Install React Native dependencies
npm install --legacy-peer-deps

# Install iOS dependencies
cd ios
pod install
cd ..

# Start Metro bundler
npm start

# In another terminal, run iOS simulator
npm run ios
```

## What You Get

**Complete Project Structure:**
- Full web application (client/ folder)
- Complete React Native mobile app (mobile/ folder)
- Backend API server (server/ folder)
- Database setup with all your data

**Mobile App Features:**
- Native iOS interface
- Authentication with your existing users
- Real-time chat with Coach Chassidy
- Camera integration for macro photos
- Progress tracking and weight monitoring
- Connects to same backend as web app

## Development Workflow

1. **Web App**: Access at http://localhost:5000
2. **Mobile App**: Runs in iOS Simulator
3. **Shared Backend**: Both apps use same data and API
4. **Real-time Sync**: Changes sync between web and mobile

The mobile app will work exactly like your web version but with native iOS features like camera access and push notifications.

## Xcode Requirements

- macOS (any recent version)
- Xcode from Mac App Store (free)
- iOS Simulator (included with Xcode)

Once downloaded, you'll have the complete fitness coaching application with both web and mobile versions running locally on your Mac.