# 📱 Mobile App Deployment Guide

This guide will help you deploy your CS:GO Tracker as a mobile app that you and your friend can use while playing.

## 🎯 Quick Start Options

### Option 1: Deploy to Vercel (Recommended - Easiest) ⚡

**Best for:** Quick deployment, free hosting, automatic HTTPS

1. **Install Vercel CLI** (if not already installed):
   ```powershell
   npm install -g vercel
   ```

2. **Build your app**:
   ```powershell
   cd C:\Users\kangl\planning-tool
   npm run build
   ```

3. **Deploy to Vercel**:
   ```powershell
   vercel
   ```
   - Follow the prompts (press Enter for defaults)
   - When asked "Set up and deploy?", type `Y`
   - When asked "Which scope?", select your account
   - When asked "Link to existing project?", type `N`
   - When asked "What's your project's name?", press Enter (or type a name)
   - When asked "In which directory is your code located?", press Enter
   - When asked "Override settings?", type `N`

4. **Get your URL**: After deployment, Vercel will give you a URL like `https://your-app-name.vercel.app`

5. **Share with your friend**: Send them the URL!

6. **Install as Mobile App**:
   - **On iPhone**: Open Safari, go to your URL, tap Share → "Add to Home Screen"
   - **On Android**: Open Chrome, go to your URL, tap Menu (3 dots) → "Add to Home Screen" or "Install App"

### Option 2: Deploy to Netlify 🌐

**Best for:** Free hosting, drag-and-drop deployment

1. **Build your app**:
   ```powershell
   cd C:\Users\kangl\planning-tool
   npm run build
   ```

2. **Go to [netlify.com](https://netlify.com)** and sign up/login

3. **Deploy**:
   - Drag and drop the `dist` folder onto Netlify's dashboard
   - OR use Netlify CLI:
     ```powershell
     npm install -g netlify-cli
     netlify deploy --prod --dir=dist
     ```

4. **Get your URL**: Netlify will give you a URL like `https://your-app-name.netlify.app`

5. **Install on mobile** (same as Vercel instructions above)

### Option 3: Use GitHub Pages 🐙

**Best for:** Free hosting if you have a GitHub account

1. **Create a GitHub repository** (if you don't have one)

2. **Update vite.config.js** to add base path:
   ```js
   export default defineConfig({
     plugins: [react()],
     base: '/your-repo-name/', // Add this line
     // ... rest of config
   })
   ```

3. **Build and deploy**:
   ```powershell
   npm run build
   # Then push dist folder to gh-pages branch
   ```

4. **Enable GitHub Pages** in your repo settings

## 📲 Installing as a Mobile App

### iPhone (iOS)

1. Open **Safari** (not Chrome - Safari is required)
2. Navigate to your deployed URL
3. Tap the **Share button** (square with arrow pointing up)
4. Scroll down and tap **"Add to Home Screen"**
5. Customize the name if desired
6. Tap **"Add"**
7. The app icon will appear on your home screen!

### Android

1. Open **Chrome** browser
2. Navigate to your deployed URL
3. Tap the **Menu** (3 dots in top right)
4. Tap **"Add to Home Screen"** or **"Install App"**
5. Confirm the installation
6. The app icon will appear on your home screen!

## 🔄 Updating Your App

When you make changes:

1. **Build again**:
   ```powershell
   npm run build
   ```

2. **Redeploy**:
   - **Vercel**: Just run `vercel` again (it will update automatically)
   - **Netlify**: Drag the new `dist` folder or run `netlify deploy --prod --dir=dist`

3. **Refresh on mobile**: Open the app and pull down to refresh, or close and reopen

## 🎮 Sharing Data Between Devices

Currently, the app uses **localStorage** which means each device has its own data. To share data:

### Option A: Manual Export/Import
- One person exports data (Save to File)
- Share the JSON file (via email/message)
- Other person imports it (Load from File)

### Option B: Add Cloud Sync (Advanced)
You could add Firebase or another backend to sync data in real-time. Let me know if you want help with this!

## 🛠️ Troubleshooting

### App doesn't install on iPhone
- Make sure you're using **Safari**, not Chrome
- The site must be served over **HTTPS** (Vercel/Netlify do this automatically)

### App doesn't work offline
- The service worker caches the app for offline use
- Make sure you've visited the site at least once while online

### Changes not showing up
- Clear your browser cache
- Uninstall and reinstall the app
- Make sure you rebuilt (`npm run build`) before redeploying

## 📝 Next Steps

1. **Create app icons** (optional but recommended):
   - Create `icon-192.png` and `icon-512.png` in the `public` folder
   - Use a tool like [PWA Asset Generator](https://github.com/elegantapp/pwa-asset-generator)

2. **Test on both devices**:
   - Make sure everything works on your phone
   - Share the URL with your friend and test together

3. **Customize**:
   - Update colors/themes in `App.css`
   - Change the app name in `manifest.json`

## 🚀 Quick Deploy Commands

**Vercel (one-time setup)**:
```powershell
npm install -g vercel
cd C:\Users\kangl\planning-tool
npm run build
vercel
```

**For updates**:
```powershell
npm run build
vercel --prod
```

---

**Need help?** Let me know if you run into any issues during deployment!
