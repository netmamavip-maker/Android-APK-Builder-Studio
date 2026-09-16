# Android APK Builder Studio
# THIS APPS DEVELOPMENT BY DADA. 

A web-based Android APK builder that works like Android Studio in your browser. Create, edit, and compile Android applications directly from any device with internet access.

---

## Table of Contents

1. [Features](#features)
2. [Requirements](#requirements)
3. [Installation](#installation)
4. [Local Development](#local-development)
5. [Deployment](#deployment)
6. [How to Create Apps](#how-to-create-apps)
7. [File Structure](#file-structure)
8. [API Reference](#api-reference)
9. [Troubleshooting](#troubleshooting)
10. [FAQs](#faqs)
11. [License](#license)

---

## Features

✅ **Web-based Android Studio** - Full IDE in browser  
✅ **Project Management** - Create, edit, delete projects  
✅ **Code Editor** - Edit Java, XML, Gradle files  
✅ **File Explorer** - Complete project structure  
✅ **Real Gradle Builds** - Actual APK compilation  
✅ **Dark Theme** - Professional UI similar to Android Studio  
✅ **Mobile Responsive** - Works on phones and tablets  
✅ **Auto-build Gradle Wrapper** - No manual setup needed  
✅ **Build Console** - Real-time build logs  
✅ **APK Download** - Download compiled APK directly  
✅ **One-click Deployment** - Deploy to Render, Heroku, AWS  

---

## Requirements

### For Local Development

- **Node.js** v14+ (https://nodejs.org)
- **npm** (included with Node.js)
- **Git** (https://git-scm.com)
- **Internet connection**

### For Building APKs

- **Java JDK** 8+ (optional, for local gradle builds)
- **Android SDK** (optional, for actual compilation)

### For Deployment

- **GitHub account** (for version control)
- **Render account** (for free hosting) - https://render.com

---

## Installation

### Step 1: Clone or Download Project

```bash
# Option A: Clone from GitHub
git clone https://github.com/YOUR_USERNAME/apk-builder-studio.git
cd apk-builder-studio

# Option B: Create from scratch
mkdir apk-builder-studio
cd apk-builder-studio
```

### Step 2: Create Folder Structure

```bash
# Create required directories
mkdir public
mkdir projects
mkdir logs

# Create files from downloads
# - Copy server.js
# - Copy package.json
# - Copy .gitignore
# - Copy .env
```

### Step 3: Install Dependencies

```bash
npm install
```

This installs:
- express (web server)
- body-parser (JSON parser)
- cors (cross-origin support)
- multer (file upload)
- archiver (file compression)
- tmp (temporary files)
- fs-extra (file system utilities)

### Step 4: Add Frontend Files

Place these files in `public/` folder:
- index.html
- style.css
- app.js

---

## Local Development

### Start the Server

```bash
npm start
```

Expected output:
```
========================================
Android APK Builder Studio
========================================
Environment: development
Port: 3000
Node Version: v16.x.x
Platform: darwin
========================================
Server ready to accept connections
Access at: http://localhost:3000
```

### Access the Application

Open browser:
```
http://localhost:3000
```

### Development Mode (Auto-restart)

```bash
npm run dev
```

This uses `nodemon` to auto-restart server on file changes.

### Stop the Server

Press `Ctrl + C` in terminal

---

## Deployment

### Option 1: Deploy to Render.com (Recommended - FREE)

#### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/apk-builder-studio.git
git branch -M main
git push -u origin main
```

#### Step 2: Create Render Account

1. Go to https://render.com
2. Click "Sign Up"
3. Choose "GitHub"
4. Authorize and complete setup

#### Step 3: Create Web Service

1. Click "New +" in Render Dashboard
2. Select "Web Service"
3. Connect GitHub and select your repository
4. Fill in:
   - **Name:** apk-builder-studio
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
5. Click "Create Web Service"

#### Step 4: Wait for Deployment

- Render builds and deploys automatically
- Takes 2-5 minutes
- URL: https://apk-builder-studio.onrender.com

#### Step 5: Monitor Logs

Render Dashboard > Your Service > Logs

---

### Option 2: Deploy to Heroku

#### Step 1: Install Heroku CLI

```bash
# macOS
brew install heroku/brew/heroku

# Linux
curl https://cli-assets.heroku.com/install.sh | sh

# Windows
Download from https://devcenter.heroku.com/articles/heroku-cli
```

#### Step 2: Login to Heroku

```bash
heroku login
```

#### Step 3: Create Heroku App

```bash
heroku create apk-builder-studio
```

#### Step 4: Add Procfile

Create file: `Procfile`

```
web: node server.js
```

#### Step 5: Deploy

```bash
git push heroku main
```

#### Step 6: View Live App

```bash
heroku open
```

---

### Option 3: Deploy to AWS EC2

#### Step 1: Create EC2 Instance

- Image: Ubuntu 20.04 LTS
- Instance Type: t2.micro (free tier)
- Security Group: Allow HTTP (80), HTTPS (443), SSH (22)

#### Step 2: SSH into Instance

```bash
ssh -i your-key.pem ubuntu@your-instance-ip
```

#### Step 3: Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### Step 4: Clone Project

```bash
git clone https://github.com/YOUR_USERNAME/apk-builder-studio.git
cd apk-builder-studio
npm install
```

#### Step 5: Install PM2

```bash
sudo npm install -g pm2
pm2 start server.js --name "apk-builder"
pm2 startup
pm2 save
```

#### Step 6: Install Nginx

```bash
sudo apt-get install nginx
```

#### Step 7: Configure Nginx

Edit `/etc/nginx/sites-available/default`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Step 8: Restart Nginx

```bash
sudo systemctl restart nginx
```

#### Step 9: Get SSL Certificate

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## How to Create Apps

### Step 1: Create New Project

1. Open application: http://localhost:3000
2. Click "+ New Project"
3. Fill in:
   - **Project Name:** MyFirstApp
   - **Package Name:** com.example.myfirstapp
   - **App Name:** My First App
   - **Min SDK:** 21
   - **Target SDK:** 33
4. Click "Create"

### Step 2: Edit Source Code

**Left panel (File Tree):**
- Click on any file to open it
- Shows complete project structure

**Middle panel (Code Editor):**
- Edit Java, XML, or Gradle files
- Full syntax highlighting (optional)

**Right panel (Build Console):**
- Shows build progress and logs
- Error messages and warnings

### Step 3: Example - Hello World App

#### Edit MainActivity.java

File path: `app/src/main/java/com/example/myfirstapp/MainActivity.java`

```java
package com.example.myfirstapp;

import android.os.Bundle;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        TextView textView = findViewById(R.id.helloText);
        textView.setText("Hello from APK Builder!");
    }
}
```

#### Edit activity_main.xml

File path: `app/src/main/res/layout/activity_main.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:gravity="center"
    android:orientation="vertical">

    <TextView
        android:id="@+id/helloText"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Hello World!"
        android:textSize="24sp" />

</LinearLayout>
```

### Step 4: Add Permissions (if needed)

Edit: `app/src/main/AndroidManifest.xml`

```xml
<!-- Add before <application> tag -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

### Step 5: Save All Files

1. Select each file
2. Click "💾 Save"
3. Or press Ctrl+S (if implemented)

### Step 6: Build APK

1. Click "🔨 Build APK"
2. Wait for build to complete (shows in console)
3. Check for errors

### Step 7: Download APK

1. Click "⬇️ Download APK"
2. APK file downloads to your computer

### Step 8: Install on Device

1. Transfer APK to Android device (USB or cloud)
2. Open file manager
3. Tap on APK file
4. Click "Install"
5. Launch app

---

## File Structure

```
apk-builder-studio/
│
├── server.js                    # Backend server (400+ lines)
├── package.json                 # Dependencies configuration
├── .env                         # Environment variables
├── .gitignore                   # Git ignore rules
├── README.md                    # This file
├── Procfile                     # Heroku deployment
│
├── public/                      # Frontend files
│   ├── index.html              # Main UI interface (700+ lines)
│   ├── style.css               # Dark theme styling (500+ lines)
│   ├── app.js                  # Frontend logic (400+ lines)
│   └── favicon.ico             # Browser icon
│
├── projects/                    # User projects (auto-created)
│   ├── MyFirstApp/
│   │   ├── app/
│   │   │   ├── src/
│   │   │   │   ├── main/
│   │   │   │   │   ├── AndroidManifest.xml
│   │   │   │   │   ├── java/
│   │   │   │   │   │   └── com/example/myfirstapp/
│   │   │   │   │   │       └── MainActivity.java
│   │   │   │   │   └── res/
│   │   │   │   │       ├── layout/
│   │   │   │   │       │   └── activity_main.xml
│   │   │   │   │       └── values/
│   │   │   │   │           ├── strings.xml
│   │   │   │   │           ├── colors.xml
│   │   │   │   │           └── styles.xml
│   │   │   │   └── test/
│   │   │   ├── build/          # Build outputs (auto-generated)
│   │   │   │   └── outputs/
│   │   │   │       └── apk/
│   │   │   │           └── debug/
│   │   │   │               └── app-debug.apk
│   │   │   ├── build.gradle
│   │   │   └── proguard-rules.pro
│   │   ├── settings.gradle
│   │   ├── local.properties
│   │   ├── gradle.properties
│   │   └── gradlew
│   │
│   └── AnotherProject/         # Additional projects
│       └── (same structure)
│
├── logs/                        # Application logs (auto-created)
│   └── app.log
│
├── node_modules/               # npm dependencies (auto-created)
│   └── (100+ packages)
│
└── .git/                       # Git repository (if using git)
```

---

## API Reference

### Projects

**GET** `/api/projects`
- List all projects
- Response: `{ success: true, projects: ["App1", "App2"] }`

**POST** `/api/project/create`
- Create new project
- Body: `{ projectName, packageName, appName, minSdk, targetSdk }`
- Response: `{ success: true, projectName, message }`

**DELETE** `/api/project/:projectName`
- Delete project
- Response: `{ success: true, message }`

### Files

**GET** `/api/project/:projectName/structure`
- Get project file tree
- Response: `{ success: true, structure: [...] }`

**GET** `/api/project/:projectName/file?path=...`
- Read file content
- Response: `{ success: true, content }`

**POST** `/api/project/:projectName/file/save`
- Save file content
- Body: `{ filePath, content }`
- Response: `{ success: true, message }`

**POST** `/api/project/:projectName/file/create`
- Create new file
- Body: `{ filePath, content }`
- Response: `{ success: true, message }`

**DELETE** `/api/project/:projectName/file?path=...`
- Delete file
- Response: `{ success: true, message }`

### Build

**POST** `/api/project/:projectName/build`
- Start APK build
- Response: `{ success: true, message }`

**GET** `/api/project/:projectName/build-status`
- Get build status
- Response: `{ success: true, built: true/false, ... }`

**GET** `/api/project/:projectName/download`
- Download APK file
- Returns: APK file

### System

**GET** `/api/system/info`
- Get system information
- Response: `{ platform, nodeVersion, environment, ... }`

---

## Troubleshooting

### Port 3000 Already in Use

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# OR use different port
PORT=3001 npm start
```

### npm install Fails

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### Module Not Found Errors

```bash
# Check package.json has all dependencies
cat package.json

# Reinstall specific module
npm install express

# Verify installation
npm list
```

### Build Fails with Gradle Error

1. Check build console for error message
2. Common issues:
   - Invalid Java syntax in MainActivity.java
   - Missing XML closing tags in layout files
   - Incorrect package name reference
3. Fix code and rebuild

### APK Not Generated

1. Check build console logs
2. Verify:
   - AndroidManifest.xml exists
   - build.gradle has correct syntax
   - No Java compilation errors
3. Click "Build APK" again

### Server Crashes on Startup

```bash
# Check logs
cat logs/app.log

# Verify Node.js version
node --version

# Should be v14 or higher
```

### Render Deployment Fails

1. Check Render Dashboard logs
2. Verify GitHub push was successful
3. Ensure all files committed:
   ```bash
   git status
   git add .
   git commit -m "fix"
   git push
   ```
4. Render auto-redeploys

### File not saving

1. Click "💾 Save" button
2. Check browser console (F12) for errors
3. Verify file path is correct
4. Try refreshing page

---

## FAQs

### Q: Do I need Android Studio installed?

**A:** No! That's the whole point. This web app replaces Android Studio.

### Q: Can I build real working APKs?

**A:** Yes! The APKs are real and installable on Android devices.

### Q: How large can projects be?

**A:** File upload limit is 100MB. Sufficient for most apps.

### Q: Can I use external libraries?

**A:** Yes! Edit `build.gradle` and add dependencies.

### Q: Is my code stored on your servers?

**A:** No! All code stored locally in `projects/` folder on your server.

### Q: Can multiple people use this?

**A:** Yes! Each person creates their own projects.

### Q: Does it work on mobile?

**A:** Yes! Responsive design works on phones and tablets.

### Q: Can I deploy the app to Play Store?

**A:** Yes! Build in Release mode and sign APK, then upload to Play Store.

### Q: How do I backup my projects?

**A:** Entire `projects/` folder contains all projects. Backup that folder.

### Q: Can I import existing Android projects?

**A:** You'd need to manually recreate structure. Direct import not supported yet.

### Q: What's the maximum build time?

**A:** 10 minutes timeout. Most builds complete in 1-3 minutes.

---

## Performance Tips

1. **Close unused projects** - Frees up server memory
2. **Delete old builds** - `projects/ProjectName/app/build/` folder
3. **Use free tier wisely** - Render free tier sleeps after 15 minutes
4. **Keep code clean** - Reduces compile time
5. **Monitor logs** - Check `logs/app.log` for issues

---

## Security Notes

1. **Don't commit .env file** - Already in .gitignore
2. **Don't share project URLs** - Anyone with URL can access
3. **API Keys** - Store in .env file, never in code
4. **Passwords** - Use environment variables
5. **Backups** - Regularly backup `projects/` folder

---

## Updates & Maintenance

### Check for Updates

```bash
npm outdated
```

### Update Dependencies

```bash
npm update
```

### Update Specific Package

```bash
npm install express@latest
```

---

## Contributing

To contribute improvements:

1. Fork repository
2. Create feature branch
3. Make changes
4. Push and create Pull Request

---

## Support & Help

- **Issues:** GitHub Issues
- **Questions:** Discussion forum
- **Email:** dadavip2022@gmail.com

---

## License

MIT License - Free to use for personal and commercial projects

---

## Changelog

### Version 1.0.0 (Initial Release)

- ✅ Full Android Studio web interface
- ✅ Project creation and management
- ✅ Code editor with file explorer
- ✅ Real Gradle builds
- ✅ APK generation and download
- ✅ Deployment to Render/Heroku/AWS

---

## Credits

Built with:
- Express.js (Backend)
- Node.js (Runtime)
- Gradle (Build system)
- Android SDK

---

## Contact

For questions or suggestions, reach out to:
- Email: dadavip2022@gmail.com

---

**Release Date:** 17 September 2026
**Last Updated:** 17 September 2026
**Version:** 1.0.0