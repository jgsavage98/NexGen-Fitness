#!/bin/bash

# NexGen Fitness iOS App Setup Script
# This script automates the complete Capacitor iOS setup

echo "🚀 Setting up NexGen Fitness iOS App..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Initialize Capacitor
echo "⚡ Initializing Capacitor..."
npx cap init "NexGen Fitness Coach" "com.nexgenfitness.coach"

# Add iOS platform
echo "📱 Adding iOS platform..."
npx cap add ios

# Sync project
echo "🔄 Syncing project..."
npx cap sync

echo "✅ Setup complete!"
echo ""
echo "🎉 Your iOS app is ready!"
echo ""
echo "Next steps:"
echo "1. Run: npx cap open ios (opens Xcode)"
echo "2. In Xcode, select your device/simulator"
echo "3. Click the Play button to run the app"
echo ""
echo "Or run directly: npx cap run ios"
echo ""
echo "The app will load your web app from: https://ai-companion-jgsavage98.replit.app"