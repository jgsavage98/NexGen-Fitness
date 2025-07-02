# NexGen Fitness - Local Setup Instructions

## Repository Issue Resolution

Since the GitHub repository appears empty, here's how to get your complete codebase locally:

### Option 1: Download Project Files from Replit

1. **Download from Replit**: 
   - In your Replit workspace, click the three dots menu (⋯) next to your project name
   - Select "Download as ZIP"
   - Extract the ZIP file on your Mac

2. **Create Local Git Repository**:
   ```bash
   # Navigate to extracted folder
   cd NexGen-Fitness
   
   # Initialize git and add remote
   git init
   git remote add origin https://github.com/jgsavage98/NexGen-Fitness.git
   
   # Add all files and push
   git add .
   git commit -m "Initial commit - Complete fitness coaching app"
   git branch -M main
   git push -u origin main
   ```

### Option 2: Push from Replit Git Interface

1. Go to your Replit Git tab
2. Make sure all files are staged (green checkmarks)
3. Click "Commit & Push" to push to GitHub
4. Then clone normally: `git clone https://github.com/jgsavage98/NexGen-Fitness.git`

## iOS Mobile App Setup (After Getting Code Locally)

### Prerequisites
- Mac computer (required for iOS development)
- Xcode from Mac App Store (free, ~10GB)
- Node.js 18+ (check with `node --version`)

### Setup Steps

1. **Install Development Tools**:
   ```bash
   # Install Xcode command line tools
   xcode-select --install
   
   # Install CocoaPods (if not already installed)
   sudo gem install cocoapods
   ```

2. **Install Project Dependencies**:
   ```bash
   # Navigate to your project
   cd NexGen-Fitness
   
   # Install main project dependencies
   npm install
   
   # Navigate to mobile folder and install mobile dependencies
   cd mobile
   npm install --legacy-peer-deps
   
   # Install iOS dependencies
   cd ios
   pod install
   cd ..
   ```

3. **Run the Application**:

   **Terminal 1 - Backend Server:**
   ```bash
   # From project root (NexGen-Fitness/)
   npm run dev
   ```

   **Terminal 2 - Mobile Metro Bundler:**
   ```bash
   # From mobile folder (NexGen-Fitness/mobile/)
   npm start
   ```

   **Terminal 3 - iOS Simulator:**
   ```bash
   # From mobile folder (NexGen-Fitness/mobile/)
   npm run ios
   ```

## What You'll Get

### Complete Fitness Coaching Platform
- **Web Application**: React frontend with real-time chat
- **Mobile Application**: React Native iOS app with native features
- **Backend**: Node.js/Express server with OpenAI integration
- **Database**: PostgreSQL with complete user data

### Key Features
- **AI Coach Chassidy**: Personalized responses using Rachel Freiman persona
- **Weekly Check-ins**: Automated Tuesday messages with emoji controls (1-10 scale)
- **Macro Tracking**: Screenshot analysis and nutrition logging
- **Real-time Chat**: WebSocket-powered messaging
- **Progress Reports**: PDF generation with weight trends
- **Mobile Camera**: Photo capture for macro analysis

### User Accounts Available
- **John Savage** (jgsavage98@gmail.com) - Client with complete data
- **Angie Varrecchio** (angienola@yahoo.com) - Client with authentic week 1 form responses
- **Coach Chassidy** - Trainer account with full dashboard access

## Mobile App Features

Your React Native app includes:
- **Dashboard**: Macro targets, uploads, workout plans
- **Chat**: Real-time messaging with Coach Chassidy AI
- **Camera**: Photo capture for nutrition tracking
- **Progress**: Weight logging and trend visualization
- **Authentication**: Same login system as web app

## Environment Variables Needed

Make sure your local environment has:
```bash
# Add to .env file in project root
OPENAI_API_KEY=your_openai_api_key_here
DATABASE_URL=your_postgresql_database_url
```

## Troubleshooting

### If npm install fails:
```bash
npm install --legacy-peer-deps
# or
npm install --force
```

### If iOS build fails:
```bash
cd mobile/ios
pod install --repo-update
cd ..
npm run ios
```

### If Metro bundler issues:
```bash
npx react-native start --reset-cache
```

## Next Steps

1. Get the code locally using Option 1 or 2 above
2. Follow the iOS setup steps
3. Run the three terminal commands
4. Test the mobile app in iOS simulator
5. All your existing data and AI features will work immediately

Your mobile app connects to the same backend, so all coaching automation, weekly check-ins, and data work identically to the web version.