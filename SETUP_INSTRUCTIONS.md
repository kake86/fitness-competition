# Setup Instructions for Planning Tool

Complete guide to get the Planning Tool up and running on Windows.

## Table of Contents

1. [Quick Start](#quick-start) - For users who already have Node.js installed
2. [Full Setup Guide](#full-setup-guide) - Complete setup including Node.js installation
3. [Verification Steps](#verification-steps) - How to confirm everything is working
4. [Troubleshooting](#troubleshooting) - Common issues and solutions
5. [Production Build](#production-build) - Building for deployment
6. [Next Steps](#next-steps) - What to do after setup

---

## Quick Start

If you already have Node.js installed, follow these steps:

### Step 1: Verify Node.js Installation

Open PowerShell or Command Prompt and run:

```powershell
node --version
npm --version
```

**Expected Output:**
- Node.js version should be 14.0.0 or higher (e.g., `v18.17.0` or `v20.10.0`)
- npm version should be displayed (e.g., `9.8.1`)

**If you see version numbers:** ✅ You're ready! Skip to [Step 2: Navigate to Project Directory](#step-2-navigate-to-project-directory)

**If you get an error:** ❌ Node.js is not installed. Follow the [Full Setup Guide](#full-setup-guide) below.

### Step 2: Navigate to Project Directory

Open PowerShell or Command Prompt and navigate to the project folder:

```powershell
cd C:\Users\kangl\planning-tool
```

**Verification:** You should see the prompt change to show the `planning-tool` directory path.

### Step 3: Install Dependencies

Install all required packages:

```powershell
npm install
```

**What this does:**
- Downloads and installs React, Vite, and all other dependencies
- Creates a `node_modules` folder in your project directory
- May take 1-3 minutes depending on your internet connection

**Expected Output:**
```
added 123 packages, and audited 124 packages in 45s
```

**Verification:** Check that `node_modules` folder exists:
```powershell
Test-Path node_modules
```
Should return `True`.

### Step 4: Start the Development Server

Launch the application:

```powershell
npm run dev
```

**Expected Output:**
```
  VITE v7.3.1  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

**Verification:** 
- ✅ The terminal shows a local URL (usually `http://localhost:5173`)
- ✅ No error messages appear
- ✅ The server stays running (don't close the terminal)

### Step 5: Open in Browser

1. Copy the URL shown in the terminal (e.g., `http://localhost:5173`)
2. Open your web browser (Chrome, Edge, Firefox, etc.)
3. Paste the URL into the address bar and press Enter

**What you should see:**
- 🌟 A colorful planning tool interface
- "Daily" and "Weekly" view buttons at the top
- An "➕ Add Event" button
- The current date displayed

**Success!** 🎉 Your Planning Tool is now running!

---

## Full Setup Guide

If you don't have Node.js installed, follow these complete setup instructions.

### Part 1: Installing Node.js and npm

Node.js is required to run this application. npm (Node Package Manager) comes bundled with Node.js.

#### Option 1: Download from Official Website (Recommended)

1. **Visit the Node.js website:**
   - Go to https://nodejs.org/
   - You'll see two download buttons

2. **Choose the LTS version:**
   - Click the **LTS (Long Term Support)** button (left side)
   - This is the stable, recommended version
   - Example: "v20.11.0 LTS"

3. **Download the installer:**
   - The website will automatically detect you're on Windows
   - Download the `.msi` installer file
   - File will be something like `node-v20.11.0-x64.msi`

4. **Run the installer:**
   - Double-click the downloaded `.msi` file
   - Click "Next" through the setup wizard
   - **Important:** Make sure "Add to PATH" is checked (usually checked by default)
   - Click "Install" and wait for installation to complete
   - Click "Finish"

5. **Restart your terminal:**
   - Close any open PowerShell or Command Prompt windows
   - Open a new PowerShell or Command Prompt window
   - This ensures the PATH environment variable is updated

#### Option 2: Using Winget (Windows Package Manager)

If you have Windows 10/11 with winget installed:

1. Open PowerShell as Administrator
2. Run:
   ```powershell
   winget install OpenJS.NodeJS.LTS
   ```
3. Wait for installation to complete
4. Close and reopen your terminal

#### Verify Node.js Installation

After installing, verify it worked:

```powershell
node --version
npm --version
```

**Expected Output:**
```
v20.11.0
10.2.4
```

**If you see version numbers:** ✅ Node.js is installed correctly!

**If you get an error like "node is not recognized":**
- Make sure you closed and reopened your terminal after installation
- Try restarting your computer
- Check that Node.js appears in your Start menu
- Reinstall Node.js and ensure "Add to PATH" is checked

### Part 2: Setting Up the Planning Tool

Now that Node.js is installed, follow the [Quick Start](#quick-start) guide starting from Step 2.

---

## Verification Steps

Use these checks to confirm each step completed successfully:

### ✅ Prerequisites Check

```powershell
# Check Node.js version (should be 14+)
node --version

# Check npm version
npm --version

# Check current directory
pwd
# Should show: C:\Users\kangl\planning-tool
```

### ✅ Installation Check

```powershell
# Verify node_modules exists
Test-Path node_modules
# Should return: True

# Verify package.json exists
Test-Path package.json
# Should return: True

# Check if dependencies are installed
npm list --depth=0
# Should show react, react-dom, vite, etc.
```

### ✅ Server Check

When you run `npm run dev`, verify:

1. **Terminal shows:**
   - ✅ "VITE" version number
   - ✅ "Local: http://localhost:5173/" (or similar port)
   - ✅ "ready" message
   - ❌ No error messages

2. **Browser shows:**
   - ✅ Planning Tool interface loads
   - ✅ No console errors (press F12 to check)
   - ✅ Can click buttons and interact with the app

3. **Functionality test:**
   - ✅ Click "➕ Add Event" button
   - ✅ Enter an event name and click "✓ Add"
   - ✅ Event appears in the list
   - ✅ Can check/uncheck events

---

## Troubleshooting

### Problem: "node is not recognized"

**Symptoms:** Running `node --version` gives an error message.

**Solutions:**
1. **Restart your terminal** - Close and reopen PowerShell/Command Prompt
2. **Restart your computer** - Sometimes required for PATH changes to take effect
3. **Reinstall Node.js** - Make sure "Add to PATH" option is checked during installation
4. **Manual PATH check:**
   - Open System Properties → Environment Variables
   - Check that Node.js path is in System PATH (usually `C:\Program Files\nodejs\`)

### Problem: Port Already in Use

**Symptoms:** Error message like "Port 5173 is already in use" or "EADDRINUSE".

**Solutions:**

**Option 1: Use a different port**
```powershell
npm run dev -- --port 5174
```

**Option 2: Find and close the process using the port**
```powershell
# Find process using port 5173
netstat -ano | findstr :5173

# Note the PID (last number), then kill it (replace XXXX with actual PID)
taskkill /PID XXXX /F
```

**Option 3: Restart your computer** (simplest but slowest)

### Problem: npm install fails or takes too long

**Symptoms:** `npm install` errors out or hangs.

**Solutions:**

1. **Check internet connection** - npm needs to download packages
2. **Clear npm cache:**
   ```powershell
   npm cache clean --force
   npm install
   ```
3. **Delete node_modules and retry:**
   ```powershell
   Remove-Item -Recurse -Force node_modules
   npm install
   ```
4. **Use a different registry (if behind firewall):**
   ```powershell
   npm install --registry https://registry.npmjs.org/
   ```

### Problem: "Cannot find module" errors

**Symptoms:** Errors like "Cannot find module 'react'" when running the app.

**Solutions:**

1. **Reinstall dependencies:**
   ```powershell
   Remove-Item -Recurse -Force node_modules
   Remove-Item package-lock.json
   npm install
   ```

2. **Check package.json exists:**
   ```powershell
   Test-Path package.json
   ```
   Should return `True`. If not, you're in the wrong directory.

### Problem: Browser shows blank page or errors

**Symptoms:** Browser opens but shows nothing or console errors.

**Solutions:**

1. **Check terminal output** - Make sure `npm run dev` is still running
2. **Check the URL** - Should be `http://localhost:5173` (or port shown in terminal)
3. **Clear browser cache:**
   - Press `Ctrl + Shift + Delete`
   - Clear cached images and files
   - Refresh the page (`F5`)
4. **Try a different browser** - Test in Chrome, Edge, or Firefox
5. **Check browser console:**
   - Press `F12` to open Developer Tools
   - Look at the Console tab for error messages
   - Share error messages for further troubleshooting

### Problem: Node.js version is too old

**Symptoms:** Errors about unsupported features or version requirements.

**Solutions:**

1. **Check your version:**
   ```powershell
   node --version
   ```
   Should be v14.0.0 or higher.

2. **Update Node.js:**
   - Download latest LTS from https://nodejs.org/
   - Run the installer (it will update your existing installation)
   - Restart your terminal

### Problem: PowerShell execution policy error

**Symptoms:** Error about execution policy when running npm scripts.

**Solutions:**

1. **Check execution policy:**
   ```powershell
   Get-ExecutionPolicy
   ```

2. **Set execution policy (if needed):**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```
   Type `Y` when prompted.

### Problem: Antivirus blocking npm

**Symptoms:** npm install fails or files are deleted.

**Solutions:**

1. **Add exception in antivirus:**
   - Add `node_modules` folder to exclusions
   - Add npm/node.exe to exclusions
2. **Temporarily disable antivirus** during installation (not recommended for long-term)

### Still Having Issues?

If none of these solutions work:

1. **Check the error message carefully** - Copy the exact error text
2. **Verify you're in the correct directory:**
   ```powershell
   pwd
   ls
   ```
   Should show `package.json`, `src` folder, etc.
3. **Try a fresh start:**
   ```powershell
   # Remove everything except source files
   Remove-Item -Recurse -Force node_modules
   Remove-Item package-lock.json
   npm install
   npm run dev
   ```

---

## Production Build

Once you have the app running in development mode, you may want to create a production build for deployment.

### Building for Production

Create an optimized production build:

```powershell
npm run build
```

**What this does:**
- Compiles and minifies your code
- Optimizes assets (images, CSS, etc.)
- Creates a `dist` folder with production-ready files

**Expected Output:**
```
vite v7.3.1 building for production...
✓ 45 modules transformed.
dist/index.html                   0.45 kB
dist/assets/index-abc123.js       45.2 kB
dist/assets/index-def456.css      2.1 kB
✓ built in 1.2s
```

**Verification:**
```powershell
Test-Path dist
```
Should return `True`.

### Previewing Production Build

Test the production build locally:

```powershell
npm run preview
```

This starts a local server with the production build. Open the URL shown in your browser.

**Note:** The preview server uses a different port (usually 4173) than the dev server.

### Deploying

The `dist` folder contains everything needed to deploy:

**Option 1: Static Hosting**
- Upload the contents of `dist` folder to:
  - GitHub Pages
  - Netlify
  - Vercel
  - Any static hosting service

**Option 2: Local Web Server**
- Copy `dist` folder contents to your web server
- Configure server to serve `index.html` for all routes

**Option 3: File System**
- The `dist` folder can be opened directly in a browser
- Note: Some features may not work due to browser security restrictions

---

## Next Steps

Now that your Planning Tool is running:

1. **Explore the Features:**
   - Switch between Daily and Weekly views
   - Add events with times
   - Mark tasks as complete
   - Navigate between dates

2. **Customize:**
   - Edit `src/App.css` to change colors and styling
   - Modify `src/data.json` for initial data structure
   - Explore the component files in `src/` folder

3. **Learn More:**
   - Read the [README.md](README.md) for feature details
   - Check React documentation: https://react.dev
   - Check Vite documentation: https://vitejs.dev

4. **Development Tips:**
   - Keep `npm run dev` running while developing
   - Changes to code automatically refresh in the browser
   - Press `Ctrl + C` in terminal to stop the dev server

5. **Save Your Work:**
   - The app saves data to browser local storage automatically
   - Use the Export button to save a backup file
   - Use Import to load saved data

---

## Quick Reference

### Essential Commands

```powershell
# Navigate to project
cd C:\Users\kangl\planning-tool

# Install dependencies (first time only)
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Important URLs

- **Development server:** http://localhost:5173 (default)
- **Production preview:** http://localhost:4173 (default)
- **Node.js download:** https://nodejs.org/

### Key Files

- `package.json` - Project configuration and dependencies
- `src/App.jsx` - Main application component
- `src/data.json` - Initial data structure
- `dist/` - Production build output (created after `npm run build`)

---

**Need Help?** Check the [Troubleshooting](#troubleshooting) section above or review the error messages in your terminal and browser console.
