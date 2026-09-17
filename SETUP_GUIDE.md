# Android APK Builder Studio - Premium Edition Setup Guide

## Step 1: Download Files

Download these 6 files:
1. server.js
2. package.json
3. index.html
4. style.css
5. app.js
6. .env
7. .gitignore

---

## Step 2: Create Project Folder

```bash
mkdir apk-builder-studio-premium
cd apk-builder-studio-premium
```

---

## Step 3: Create Folder Structure

```bash
mkdir public
mkdir projects
mkdir logs
```

---

## Step 4: Place Files

```
apk-builder-studio-premium/
├── server.js          ← Download
├── package.json       ← Download
├── .env               ← Download
├── .gitignore         ← Download
├── public/
│   ├── index.html     ← Download
│   ├── style.css      ← Download
│   └── app.js         ← Download
├── projects/          ← Auto-created
└── logs/              ← Auto-created
```

---

## Step 5: Install Dependencies

```bash
npm install
```

---

## Step 6: Run Locally

```bash
npm start
```

Output:
```
==================================================
Android APK Builder Studio - Premium Edition
==================================================
Port: 3000
Access: http://localhost:3000
==================================================
```

Open: http://localhost:3000

---

## Step 7: Deploy to Render

### 7.1 Push to GitHub

```bash
git init
git add .
git commit -m "APK Builder Premium"
git remote add origin https://github.com/YOUR_USERNAME/apk-builder-studio.git
git branch -M main
git push -u origin main
```

### 7.2 Create Render Account

Go to https://render.com and sign up with GitHub

### 7.3 Create Web Service

1. Click "New +" > "Web Service"
2. Connect GitHub repo
3. Settings:
   - Name: apk-builder-studio
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance: Free

### 7.4 Add Environment Variables

In Render Dashboard:
```
NODE_ENV = production
PORT = 3000
```

### 7.5 Deploy

Click "Create Web Service"

Wait 3-5 minutes → Live at: https://apk-builder-studio.onrender.com

---

## Features

✅ Premium UI with gradients
✅ Dark/Light mode
✅ File management
✅ Code editor
✅ Real gradle builds
✅ APK generation
✅ Local storage
✅ Professional design

---

## Usage

### Create Project
1. Click "New Project"
2. Fill: Name, Package, App Name
3. Click "Create"

### Edit Files
1. Select project from sidebar
2. Click file in left panel
3. Edit in center editor
4. Click "Save"

### Build APK
1. Click "Build APK"
2. Wait for completion
3. Click "Download"

---

## Troubleshooting

**Port in use:**
```bash
PORT=3001 npm start
```

**Module error:**
```bash
rm -rf node_modules
npm install
```

**Render build fails:**
Check logs in Render Dashboard > Logs

---

## Support

For issues, check:
- Render Dashboard logs
- Browser console (F12)
- Server logs in terminal

---

## Files Included

| File | Purpose |
|------|---------|
| server.js | Backend API |
| index.html | UI Interface |
| style.css | Premium Design |
| app.js | Frontend Logic |
| package.json | Dependencies |
| .env | Config Variables |
| .gitignore | Git Rules |

---

## Version

**APK Builder Studio Premium v1.0.0**

Built for professional Android development from browser.

---

## Next Steps

1. Download all 6 files ✓
2. Create folder structure ✓
3. Install npm packages ✓
4. Run locally: `npm start` ✓
5. Deploy to Render ✓
6. Share URL ✓

Done! 🚀

