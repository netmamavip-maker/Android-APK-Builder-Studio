const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { exec, spawn } = require('child_process');
const cors = require('cors');
const os = require('os');
const tmp = require('tmp');

const app = express();
const PORT = process.env.PORT || 3000;
const PROJECTS_DIR = path.join(__dirname, 'projects');
const LOGS_DIR = path.join(__dirname, 'logs');

fs.ensureDirSync(PROJECTS_DIR);
fs.ensureDirSync(LOGS_DIR);

app.use(cors());
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));
app.use(express.static('public'));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const projectPath = path.join(PROJECTS_DIR, req.body.projectName || 'default');
        fs.ensureDirSync(projectPath);
        cb(null, projectPath);
    },
    filename: (req, file, cb) => cb(null, file.originalname)
});

const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

// CREATE PROJECT
app.post('/api/project/create', async (req, res) => {
    const { projectName, packageName, appName, minSdk, targetSdk } = req.body;
    
    if (!projectName || !packageName) {
        return res.status(400).json({ success: false, error: "Name required" });
    }
    
    const projectPath = path.join(PROJECTS_DIR, projectName);
    if (fs.existsSync(projectPath)) {
        return res.status(400).json({ success: false, error: "Project exists" });
    }
    
    try {
        createProjectStructure(projectPath, packageName, appName, minSdk || 21, targetSdk || 33);
        res.json({ success: true, projectName });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// LIST PROJECTS
app.get('/api/projects', (req, res) => {
    try {
        const projects = fs.readdirSync(PROJECTS_DIR)
            .filter(f => fs.statSync(path.join(PROJECTS_DIR, f)).isDirectory());
        res.json({ success: true, projects });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET STRUCTURE
app.get('/api/project/:projectName/structure', (req, res) => {
    const projectPath = path.join(PROJECTS_DIR, req.params.projectName);
    
    if (!fs.existsSync(projectPath)) {
        return res.status(404).json({ success: false, error: "Not found" });
    }
    
    try {
        const structure = getProjectStructure(projectPath);
        res.json({ success: true, structure });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// READ FILE
app.get('/api/project/:projectName/file', (req, res) => {
    const { projectName } = req.params;
    const filePath = req.query.path;
    const fullPath = path.join(PROJECTS_DIR, projectName, filePath);
    
    if (!fullPath.startsWith(path.join(PROJECTS_DIR, projectName))) {
        return res.status(403).json({ success: false, error: "Invalid path" });
    }
    
    if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ success: false, error: "File not found" });
    }
    
    try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        res.json({ success: true, content });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// SAVE FILE
app.post('/api/project/:projectName/file/save', (req, res) => {
    const { projectName } = req.params;
    const { filePath, content } = req.body;
    const fullPath = path.join(PROJECTS_DIR, projectName, filePath);
    
    if (!fullPath.startsWith(path.join(PROJECTS_DIR, projectName))) {
        return res.status(403).json({ success: false, error: "Invalid path" });
    }
    
    try {
        fs.ensureDirSync(path.dirname(fullPath));
        fs.writeFileSync(fullPath, content, 'utf-8');
        res.json({ success: true, message: "Saved" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// CREATE FILE
app.post('/api/project/:projectName/file/create', (req, res) => {
    const { projectName } = req.params;
    const { filePath, content = '' } = req.body;
    const fullPath = path.join(PROJECTS_DIR, projectName, filePath);
    
    if (!fullPath.startsWith(path.join(PROJECTS_DIR, projectName)) || fs.existsSync(fullPath)) {
        return res.status(400).json({ success: false, error: "Invalid or exists" });
    }
    
    try {
        fs.ensureDirSync(path.dirname(fullPath));
        fs.writeFileSync(fullPath, content, 'utf-8');
        res.json({ success: true, message: "Created" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE FILE
app.delete('/api/project/:projectName/file', (req, res) => {
    const { projectName } = req.params;
    const { path: filePath } = req.query;
    const fullPath = path.join(PROJECTS_DIR, projectName, filePath);
    
    if (!fullPath.startsWith(path.join(PROJECTS_DIR, projectName)) || !fs.existsSync(fullPath)) {
        return res.status(400).json({ success: false, error: "Invalid path" });
    }
    
    try {
        fs.unlinkSync(fullPath);
        res.json({ success: true, message: "Deleted" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// BUILD APK
app.post('/api/project/:projectName/build', (req, res) => {
    const projectPath = path.join(PROJECTS_DIR, req.params.projectName);
    
    if (!fs.existsSync(projectPath)) {
        return res.status(404).json({ success: false, error: "Not found" });
    }
    
    res.json({ success: true, message: "Building..." });
    
    buildAPK(projectPath, req.params.projectName, (error) => {
        if (error) console.error('Build error:', error.message);
    });
});

// BUILD STATUS
app.get('/api/project/:projectName/build-status', (req, res) => {
    const projectPath = path.join(PROJECTS_DIR, req.params.projectName);
    const apkPath = path.join(projectPath, 'app/build/outputs/apk/debug/app-debug.apk');
    
    if (fs.existsSync(apkPath)) {
        const stats = fs.statSync(apkPath);
        res.json({ success: true, built: true, size: (stats.size / 1024 / 1024).toFixed(2) + ' MB' });
    } else {
        res.json({ success: true, built: false });
    }
});

// DOWNLOAD APK
app.get('/api/project/:projectName/download', (req, res) => {
    const projectPath = path.join(PROJECTS_DIR, req.params.projectName);
    const apkPath = path.join(projectPath, 'app/build/outputs/apk/debug/app-debug.apk');
    
    if (!fs.existsSync(apkPath)) {
        return res.status(404).json({ success: false, error: "APK not found" });
    }
    
    res.download(apkPath, `${req.params.projectName}.apk`);
});

// DELETE PROJECT
app.delete('/api/project/:projectName', (req, res) => {
    const projectPath = path.join(PROJECTS_DIR, req.params.projectName);
    
    if (!fs.existsSync(projectPath)) {
        return res.status(404).json({ success: false, error: "Not found" });
    }
    
    try {
        fs.removeSync(projectPath);
        res.json({ success: true, message: "Deleted" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// UTILITY FUNCTIONS
function createProjectStructure(projectPath, packageName, appName, minSdk, targetSdk) {
    const packagePath = packageName.split('.').join('/');
    
    fs.ensureDirSync(path.join(projectPath, `app/src/main/java/${packagePath}`));
    fs.ensureDirSync(path.join(projectPath, 'app/src/main/res/layout'));
    fs.ensureDirSync(path.join(projectPath, 'app/src/main/res/values'));
    fs.ensureDirSync(path.join(projectPath, 'app/src/main/assets'));
    
    fs.writeFileSync(path.join(projectPath, 'app/src/main/AndroidManifest.xml'), `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="${packageName}">
    <uses-permission android:name="android.permission.INTERNET" />
    <application android:allowBackup="true" android:label="@string/app_name" android:theme="@style/AppTheme">
        <activity android:name=".MainActivity" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`);
    
    fs.writeFileSync(path.join(projectPath, `app/src/main/java/${packagePath}/MainActivity.java`), `package ${packageName};
import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
public class MainActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
    }
}`);
    
    fs.writeFileSync(path.join(projectPath, 'app/src/main/res/layout/activity_main.xml'), `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent" android:layout_height="match_parent"
    android:gravity="center" android:orientation="vertical">
    <TextView android:layout_width="wrap_content" android:layout_height="wrap_content"
        android:text="@string/hello" android:textSize="24sp" />
</LinearLayout>`);
    
    fs.writeFileSync(path.join(projectPath, 'app/src/main/res/values/strings.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">${appName}</string>
    <string name="hello">Hello ${appName}!</string>
</resources>`);
    
    fs.writeFileSync(path.join(projectPath, 'app/build.gradle'), `plugins {
    id 'com.android.application'
}
android {
    compileSdk ${targetSdk}
    defaultConfig {
        applicationId "${packageName}"
        minSdk ${minSdk}
        targetSdk ${targetSdk}
        versionCode 1
        versionName "1.0"
    }
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }
}
dependencies {
    implementation 'androidx.appcompat:appcompat:1.5.1'
    implementation 'com.google.android.material:material:1.7.0'
}`);
    
    fs.writeFileSync(path.join(projectPath, 'settings.gradle'), `pluginManagement {
    repositories {
        gradlePluginPortal()
        google()
        mavenCentral()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "${appName}"
include ':app'`);
    
    fs.writeFileSync(path.join(projectPath, 'local.properties'), 'sdk.dir=/usr/lib/android-sdk');
}

function getProjectStructure(dir) {
    const items = [];
    try {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            if (file.startsWith('.') || file === 'build' || file === 'node_modules') return;
            const filePath = path.join(dir, file);
            const stats = fs.statSync(filePath);
            const relativePath = filePath.replace(PROJECTS_DIR, '').substring(1);
            
            if (stats.isDirectory()) {
                items.push({ name: file, type: 'folder', path: relativePath, children: getProjectStructure(filePath) });
            } else {
                items.push({ name: file, type: 'file', path: relativePath, extension: path.extname(file) });
            }
        });
    } catch (err) {
        console.error('Error:', err.message);
    }
    return items;
}

function buildAPK(projectPath, projectName, callback) {
    const buildScript = `#!/bin/bash
cd "${projectPath}"
if [ ! -f "gradlew" ]; then
    gradle wrapper --gradle-version 7.5 2>&1 || true
fi
chmod +x gradlew
./gradlew clean assembleDebug --stacktrace 2>&1
APK_FILE="${projectPath}/app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK_FILE" ]; then
    echo "BUILD_SUCCESS:$APK_FILE"
else
    echo "BUILD_FAILED"
    exit 1
fi`;
    
    const tmpFile = tmp.fileSync({ suffix: '.sh' });
    fs.writeFileSync(tmpFile.name, buildScript);
    fs.chmodSync(tmpFile.name, '755');
    
    const child = spawn('bash', [tmpFile.name]);
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
        stdout += data.toString();
        console.log(data.toString());
    });
    
    child.stderr.on('data', (data) => {
        stderr += data.toString();
    });
    
    child.on('close', (code) => {
        try { fs.unlinkSync(tmpFile.name); } catch (err) { }
        
        if (code === 0 && stdout.includes('BUILD_SUCCESS')) {
            const apkPath = stdout.split('BUILD_SUCCESS:')[1]?.split('\n')[0]?.trim();
            callback(null, apkPath);
        } else {
            callback(new Error(stderr || 'Build failed'), null);
        }
    });
    
    setTimeout(() => {
        if (child && !child.killed) {
            child.kill('SIGKILL');
            callback(new Error('Build timeout'), null);
        }
    }, 600000);
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Not found' });
});

app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({ success: false, error: 'Server error' });
});

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n${'='.repeat(50)}`);
    console.log('Android APK Builder Studio - Premium Edition');
    console.log(`${'='.repeat(50)}`);
    console.log(`Port: ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Access: http://localhost:${PORT}`);
    console.log(`${'='.repeat(50)}\n`);
});

module.exports = app;
