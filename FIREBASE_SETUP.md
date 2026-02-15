# 🔥 Firebase Setup Guide

This guide will help you set up Firebase for real-time data synchronization so you and your friend can share data instantly.

## Step 1: Create Firebase Project

1. **Go to [Firebase Console](https://console.firebase.google.com/)**
2. Click **"Add project"** or select an existing project
3. Enter a project name (e.g., "csgo-tracker")
4. Click **"Continue"**
5. Disable Google Analytics (optional - you can skip it)
6. Click **"Create project"**
7. Wait for project creation, then click **"Continue"**

## Step 2: Enable Firestore Database

1. In your Firebase project, click **"Firestore Database"** in the left sidebar
2. Click **"Create database"**
3. Select **"Start in test mode"** (we'll add security rules later)
4. Choose a location (pick the closest to you)
5. Click **"Enable"**

## Step 3: Get Your Firebase Config

1. Click the **gear icon** ⚙️ next to "Project Overview" in the left sidebar
2. Click **"Project settings"**
3. Scroll down to **"Your apps"** section
4. Click the **Web icon** `</>` to add a web app
5. Register your app:
   - App nickname: "CSGO Tracker" (or any name)
   - Check "Also set up Firebase Hosting" (optional)
   - Click **"Register app"**
6. **Copy the Firebase configuration object** - it looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

## Step 4: Add Config to Your App

1. Open `src/firebase.js` in your project
2. Replace the placeholder values with your actual Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "YOUR_ACTUAL_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_ACTUAL_PROJECT_ID",
  storageBucket: "YOUR_ACTUAL_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_ACTUAL_MESSAGING_SENDER_ID",
  appId: "YOUR_ACTUAL_APP_ID"
};
```

## Step 5: Set Up Firestore Security Rules (Important!)

1. Go to **Firestore Database** → **Rules** tab
2. Replace the rules with this:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to rooms collection
    match /rooms/{roomId} {
      allow read, write: if true; // Public access for now
    }
  }
}
```

3. Click **"Publish"**

**Note:** These rules allow anyone to read/write. For production, you'd want to add authentication, but for a simple game tracker with friends, this is fine.

## Step 6: Install Dependencies

```powershell
cd C:\Users\kangl\planning-tool
npm install
```

## Step 7: Test It!

1. Start your dev server:
   ```powershell
   npm run dev
   ```

2. Open the app in your browser
3. Click **"Create New Room"** - you'll get a room code like "ABC123"
4. Share that code with your friend
5. They click **"Join Existing Room"** and enter the code
6. Add an event - it should appear on your friend's screen instantly! 🎉

## How It Works

- **Create Room**: Generates a random 6-character room code
- **Join Room**: Enter the code to connect to the same room
- **Real-time Sync**: Any changes (add, complete, delete) sync instantly to all devices in the room
- **Local Backup**: Data is also saved locally, so it works offline

## Troubleshooting

### "Firebase: Error (auth/unauthorized-domain)"
- Go to Firebase Console → Project Settings → Authorized domains
- Add your domain (or `localhost` for development)

### "Permission denied" error
- Make sure you published the Firestore security rules (Step 5)

### Changes not syncing
- Check browser console for errors
- Make sure both devices are connected to the internet
- Verify Firebase config is correct in `src/firebase.js`

### Room not found
- Make sure you're using the exact same room code (case-sensitive)
- Try creating a new room

## Free Tier Limits

Firebase free tier includes:
- **50K reads/day** - Plenty for personal use
- **20K writes/day** - More than enough for a game tracker
- **20K deletes/day** - Should be fine

You won't hit these limits unless you're using it heavily!

## Next Steps

1. Deploy your app (see `MOBILE_DEPLOYMENT.md`)
2. Share the URL with your friend
3. Both create/join the same room
4. Start tracking your game events together! 🎮

---

**Need help?** Check the Firebase console for any error messages, or let me know if you run into issues!
