# Detailed Mobile App Setup Guide

## Step 1: Installing Dependencies (Detailed)

### What You Need First

Before running the installation command, make sure you have:

1. **Node.js installed** (you already have this)
2. **A Mac computer** (required for iOS development)
3. **Terminal access**

### The Installation Command Breakdown

```bash
cd mobile && npm install --legacy-peer-deps
```

Let me break this down:

- `cd mobile` - Changes to the mobile app directory
- `npm install` - Downloads all required React Native packages
- `--legacy-peer-deps` - Handles version conflicts between packages

### Why --legacy-peer-deps?

React Native has strict version requirements. This flag tells npm to use older dependency resolution rules that are more flexible with version conflicts.

### What Gets Installed

When you run this command, npm will install:

**Core React Native:**
- `react-native` - The main framework
- `react` - React library (compatible version)

**Navigation:**
- `@react-navigation/native` - Screen navigation
- `@react-navigation/bottom-tabs` - Bottom tab bar
- `@react-navigation/native-stack` - Screen stack management

**Device Features:**
- `react-native-image-picker` - Camera and photo library access
- `@react-native-async-storage/async-storage` - Local data storage
- `react-native-vector-icons` - Icons for the interface

**Supporting Libraries:**
- `react-native-screens` - Native screen components
- `react-native-safe-area-context` - Handle iPhone notches/safe areas

### Expected Installation Output

You should see output like:
```
npm WARN using --legacy-peer-deps
npm WARN deprecated ...
added 847 packages in 45s
```

### Installation Time

- **First time**: 2-5 minutes (downloads ~200MB of packages)
- **Clean install**: 1-2 minutes

### Common Issues & Solutions

**Issue 1: Permission Errors**
```bash
# If you see permission errors, try:
sudo npm install --legacy-peer-deps
```

**Issue 2: Network/Download Errors**
```bash
# Clear npm cache and try again:
npm cache clean --force
npm install --legacy-peer-deps
```

**Issue 3: Version Conflicts**
```bash
# Force installation if needed:
npm install --force
```

### Verification

After installation succeeds, verify by checking:
```bash
ls node_modules/react-native
# Should show React Native files
```

### Next Steps Preview

After Step 1 completes successfully, you'll move to:
- Step 2: Installing Xcode and iOS Simulator
- Step 3: Running `pod install` for iOS dependencies
- Step 4: Starting the development server

The installation creates a `node_modules` folder with all dependencies needed to run your fitness coaching app on iOS.