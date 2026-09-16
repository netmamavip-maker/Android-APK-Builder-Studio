const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const archiver = require('archiver');
const path = require('path');
const fs = require('fs-extra');
const { exec, spawn } = require('child_process');
const tmp = require('tmp');
const cors = require('cors');
const os = require('os');

// ============================================================================
// CONFIG & SETUP
// ============================================================================

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const PROJECTS_DIR = path.join(__dirname, 'projects');
const LOGS_DIR = path.join(__dirname, 'logs');

// Ensure directories exist
fs.ensureDirSync(PROJECTS_DIR);
fs.ensureDirSync(LOGS_DIR);

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));
app.use(express.static('public'));

// Logger setup
const logFile = path.join(LOGS_DIR, 'app.log');

function log(level, message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);
    
    try {
        fs.appendFileSync(logFile, logMessage + '\n');
    } catch (err) {
        console.error('Error writing to log:', err);
    }
}

// Error handling wrapper
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

// ============================================================================
// MULTER CONFIG - File Upload
// ============================================================================

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        try {
            const projectPath = path.join(PROJECTS_DIR, req.body.projectName || 'default');
            fs.ensureDirSync(projectPath);
            cb(null, projectPath);
        } catch (err) {
            cb(err);
        }
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }
});

// ============================================================================
// API ENDPOINTS
// ============================================================================

// 1. CREATE NEW PROJECT
app.post('/api/project/create', asyncHandler(async (req, res) => {
    const { projectName, packageName, appName, minSdk, targetSdk } = req.body;

    // Validation
    if (!projectName || !projectName.trim()) {
        log('warning', 'Project creation failed: empty project name');
        return res.status(400).json({ 
            success: false, 
            error: "Project name required" 
        });
    }

    if (!packageName || !packageName.trim()) {
        log('warning', 'Project creation failed: empty package name');
        return res.status(400).json({ 
            success: false, 
            error: "Package name required" 
        });
    }

    // Validate package name format
    if (!/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$/.test(packageName)) {
        return res.status(400).json({ 
            success: false, 
            error: "Invalid package name format (e.g., com.example.app)" 
        });
    }

    const projectPath = path.join(PROJECTS_DIR, projectName);

    if (fs.existsSync(projectPath)) {
        log('warning', `Project creation failed: ${projectName} already exists`);
        return res.status(400).json({ 
            success: false, 
            error: "Project already exists" 
        });
    }

    try {
        createProjectStructure(
            projectPath, 
            packageName, 
            appName || projectName, 
            minSdk || 21, 
            targetSdk || 33
        );
        
        log('info', `Project created: ${projectName} (${packageName})`);
        res.json({ 
            success: true, 
            projectName, 
            message: "Project created successfully" 
        });
    } catch (error) {
        log('error', `Project creation error: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}));

// 2. LIST ALL PROJECTS
app.get('/api/projects', asyncHandler(async (req, res) => {
    try {
        const projects = fs.readdirSync(PROJECTS_DIR)
            .filter(file => {
                const filePath = path.join(PROJECTS_DIR, file);
                return fs.statSync(filePath).isDirectory();
            })
            .sort();

        log('info', `Listed ${projects.length} projects`);
        res.json({ success: true, projects });
    } catch (error) {
        log('error', `Error listing projects: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}));

// 3. GET PROJECT STRUCTURE
app.get('/api/project/:projectName/structure', asyncHandler(async (req, res) => {
    const projectPath = path.join(PROJECTS_DIR, req.params.projectName);

    if (!fs.existsSync(projectPath)) {
        log('warning', `Project not found: ${req.params.projectName}`);
        return res.status(404).json({ 
            success: false, 
            error: "Project not found" 
        });
    }

    try {
        const structure = getProjectStructure(projectPath);
        res.json({ success: true, structure });
    } catch (error) {
        log('error', `Error getting project structure: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}));

// 4. READ FILE CONTENT
app.get('/api/project/:projectName/file', asyncHandler(async (req, res) => {
    const { projectName } = req.params;
    const filePath = req.query.path;

    if (!filePath) {
        return res.status(400).json({ 
            success: false, 
            error: "File path required" 
        });
    }

    const fullPath = path.join(PROJECTS_DIR, projectName, filePath);

    // Security check - prevent path traversal
    if (!fullPath.startsWith(path.join(PROJECTS_DIR, projectName))) {
        log('warning', `Security: Attempted path traversal: ${filePath}`);
        return res.status(403).json({ 
            success: false, 
            error: "Invalid file path" 
        });
    }

    if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ 
            success: false, 
            error: "File not found" 
        });
    }

    try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        res.json({ success: true, content });
    } catch (error) {
        log('error', `Error reading file: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}));

// 5. SAVE FILE CONTENT
app.post('/api/project/:projectName/file/save', asyncHandler(async (req, res) => {
    const { projectName } = req.params;
    const { filePath, content } = req.body;

    if (!filePath || content === undefined) {
        return res.status(400).json({ 
            success: false, 
            error: "File path and content required" 
        });
    }

    const fullPath = path.join(PROJECTS_DIR, projectName, filePath);

    // Security check
    if (!fullPath.startsWith(path.join(PROJECTS_DIR, projectName))) {
        log('warning', `Security: Attempted path traversal on save: ${filePath}`);
        return res.status(403).json({ 
            success: false, 
            error: "Invalid file path" 
        });
    }

    try {
        fs.ensureDirSync(path.dirname(fullPath));
        fs.writeFileSync(fullPath, content, 'utf-8');
        log('info', `File saved: ${projectName}/${filePath}`);
        res.json({ success: true, message: "File saved successfully" });
    } catch (error) {
        log('error', `Error saving file: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}));

// 6. CREATE NEW FILE
app.post('/api/project/:projectName/file/create', asyncHandler(async (req, res) => {
    const { projectName } = req.params;
    const { filePath, content = '' } = req.body;

    if (!filePath) {
        return res.status(400).json({ 
            success: false, 
            error: "File path required" 
        });
    }

    const fullPath = path.join(PROJECTS_DIR, projectName, filePath);

    // Security check
    if (!fullPath.startsWith(path.join(PROJECTS_DIR, projectName))) {
        return res.status(403).json({ 
            success: false, 
            error: "Invalid file path" 
        });
    }

    if (fs.existsSync(fullPath)) {
        return res.status(400).json({ 
            success: false, 
            error: "File already exists" 
        });
    }

    try {
        fs.ensureDirSync(path.dirname(fullPath));
        fs.writeFileSync(fullPath, content, 'utf-8');
        log('info', `File created: ${projectName}/${filePath}`);
        res.json({ success: true, message: "File created successfully" });
    } catch (error) {
        log('error', `Error creating file: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}));

// 7. DELETE FILE
app.delete('/api/project/:projectName/file', asyncHandler(async (req, res) => {
    const { projectName } = req.params;
    const { filePath } = req.query;

    if (!filePath) {
        return res.status(400).json({ 
            success: false, 
            error: "File path required" 
        });
    }

    const fullPath = path.join(PROJECTS_DIR, projectName, filePath);

    if (!fullPath.startsWith(path.join(PROJECTS_DIR, projectName))) {
        return res.status(403).json({ 
            success: false, 
            error: "Invalid file path" 
        });
    }

    if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ 
            success: false, 
            error: "File not found" 
        });
    }

    try {
        fs.unlinkSync(fullPath);
        log('info', `File deleted: ${projectName}/${filePath}`);
        res.json({ success: true, message: "File deleted" });
    } catch (error) {
        log('error', `Error deleting file: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}));

// 8. BUILD APK
app.post('/api/project/:projectName/build', asyncHandler(async (req, res) => {
    const projectPath = path.join(PROJECTS_DIR, req.params.projectName);
    const projectName = req.params.projectName;

    if (!fs.existsSync(projectPath)) {
        log('warning', `Build failed: Project not found: ${projectName}`);
        return res.status(404).json({ 
            success: false, 
            error: "Project not found" 
        });
    }

    log('info', `Build started: ${projectName}`);
    res.json({ 
        success: true, 
        message: "Build process started" 
    });

    // Run build asynchronously
    buildAPK(projectPath, projectName, (error, apkPath) => {
        if (error) {
            log('error', `Build failed for ${projectName}: ${error.message}`);
        } else {
            log('info', `Build successful for ${projectName}: ${apkPath}`);
        }
    });
}));

// 9. GET BUILD STATUS
app.get('/api/project/:projectName/build-status', asyncHandler(async (req, res) => {
    const projectPath = path.join(PROJECTS_DIR, req.params.projectName);
    const apkPath = path.join(projectPath, 'app/build/outputs/apk/debug/app-debug.apk');

    if (fs.existsSync(apkPath)) {
        const stats = fs.statSync(apkPath);
        res.json({ 
            success: true, 
            built: true, 
            size: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
            timestamp: stats.mtime
        });
    } else {
        res.json({ 
            success: true, 
            built: false, 
            message: "APK not built yet" 
        });
    }
}));

// 10. DOWNLOAD APK
app.get('/api/project/:projectName/download', asyncHandler(async (req, res) => {
    const projectPath = path.join(PROJECTS_DIR, req.params.projectName);
    const apkPath = path.join(projectPath, 'app/build/outputs/apk/debug/app-debug.apk');

    if (!fs.existsSync(apkPath)) {
        log('warning', `Download failed: APK not found for ${req.params.projectName}`);
        return res.status(404).json({ 
            success: false, 
            error: "APK not found. Build the project first." 
        });
    }

    try {
        log('info', `APK downloaded: ${req.params.projectName}`);
        res.download(apkPath, `${req.params.projectName}.apk`);
    } catch (error) {
        log('error', `Error downloading APK: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}));

// 11. DELETE PROJECT
app.delete('/api/project/:projectName', asyncHandler(async (req, res) => {
    const projectPath = path.join(PROJECTS_DIR, req.params.projectName);

    if (!fs.existsSync(projectPath)) {
        return res.status(404).json({ 
            success: false, 
            error: "Project not found" 
        });
    }

    try {
        fs.removeSync(projectPath);
        log('info', `Project deleted: ${req.params.projectName}`);
        res.json({ success: true, message: "Project deleted successfully" });
    } catch (error) {
        log('error', `Error deleting project: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}));

// 12. SYSTEM INFO
app.get('/api/system/info', asyncHandler(async (req, res) => {
    const info = {
        platform: os.platform(),
        nodeVersion: process.version,
        environment: NODE_ENV,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        diskSpace: getDiskSpace(PROJECTS_DIR)
    };

    res.json({ success: true, ...info });
}));

// 13. SERVE MAIN PAGE
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create complete Android project structure
 */
function createProjectStructure(projectPath, packageName, appName, minSdk, targetSdk) {
    const packagePath = packageName.split('.').join('/');

    // Create directory structure
    fs.ensureDirSync(path.join(projectPath, 'app/src/main/java', packagePath));
    fs.ensureDirSync(path.join(projectPath, 'app/src/main/res/layout'));
    fs.ensureDirSync(path.join(projectPath, 'app/src/main/res/values'));
    fs.ensureDirSync(path.join(projectPath, 'app/src/main/assets'));
    fs.ensureDirSync(path.join(projectPath, 'app/src/test/java'));

    // Create AndroidManifest.xml
    const manifestContent = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${packageName}">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:allowBackup="true"
        android:label="@string/app_name"
        android:theme="@style/AppTheme"
        android:supportsRtl="true">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:label="@string/app_name">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

    </application>

</manifest>`;

    fs.writeFileSync(path.join(projectPath, 'app/src/main/AndroidManifest.xml'), manifestContent);

    // Create MainActivity.java
    const mainActivityContent = `package ${packageName};

import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
    }
}`;

    fs.writeFileSync(
        path.join(projectPath, `app/src/main/java/${packagePath}/MainActivity.java`),
        mainActivityContent
    );

    // Create activity_main.xml
    const layoutContent = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:gravity="center">

    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="@string/hello"
        android:textSize="24sp"
        android:textColor="#000000" />

</LinearLayout>`;

    fs.writeFileSync(path.join(projectPath, 'app/src/main/res/layout/activity_main.xml'), layoutContent);

    // Create strings.xml
    const stringsContent = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">${appName}</string>
    <string name="hello">Hello ${appName}!</string>
</resources>`;

    fs.writeFileSync(path.join(projectPath, 'app/src/main/res/values/strings.xml'), stringsContent);

    // Create colors.xml
    const colorsContent = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="colorPrimary">#3F51B5</color>
    <color name="colorPrimaryDark">#303F9F</color>
    <color name="colorAccent">#FF4081</color>
</resources>`;

    fs.writeFileSync(path.join(projectPath, 'app/src/main/res/values/colors.xml'), colorsContent);

    // Create styles.xml
    const stylesContent = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.Light.DarkActionBar">
        <item name="colorPrimary">@color/colorPrimary</item>
        <item name="colorPrimaryDark">@color/colorPrimaryDark</item>
        <item name="colorAccent">@color/colorAccent</item>
    </style>
</resources>`;

    fs.writeFileSync(path.join(projectPath, 'app/src/main/res/values/styles.xml'), stylesContent);

    // Create app-level build.gradle
    const buildGradleContent = `plugins {
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
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
            debuggable false
        }
        debug {
            debuggable true
            minifyEnabled false
        }
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }

    packagingOptions {
        exclude 'META-INF/proguard/androidx-*.pro'
        exclude 'META-INF/MANIFEST.MF'
    }
}

dependencies {
    // AndroidX
    implementation 'androidx.appcompat:appcompat:1.5.1'
    implementation 'androidx.constraintlayout:constraintlayout:2.1.4'
    implementation 'com.google.android.material:material:1.7.0'

    // Testing
    testImplementation 'junit:junit:4.13.2'
    androidTestImplementation 'androidx.test.ext:junit:1.1.5'
    androidTestImplementation 'androidx.test.espresso:espresso-core:3.5.1'
}`;

    fs.writeFileSync(path.join(projectPath, 'app/build.gradle'), buildGradleContent);

    // Create proguard-rules.pro
    const proguardContent = `# Keep the BuildConfig
-keep class ${packageName}.BuildConfig { *; }

# Keep custom application classes
-keep class ${packageName}.** { *; }`;

    fs.writeFileSync(path.join(projectPath, 'app/proguard-rules.pro'), proguardContent);

    // Create project-level settings.gradle
    const settingsContent = `pluginManagement {
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
include ':app'`;

    fs.writeFileSync(path.join(projectPath, 'settings.gradle'), settingsContent);

    // Create local.properties
    const localPropsContent = `sdk.dir=/usr/lib/android-sdk`;
    fs.writeFileSync(path.join(projectPath, 'local.properties'), localPropsContent);

    // Create gradle.properties
    const gradlePropsContent = `org.gradle.jvmargs=-Xmx4096m -XX:MaxPermSize=512m
org.gradle.parallel=true
org.gradle.daemon=true
android.useAndroidX=true
android.enableJetifier=true`;

    fs.writeFileSync(path.join(projectPath, 'gradle.properties'), gradlePropsContent);
}

/**
 * Get project file tree structure
 */
function getProjectStructure(dir, prefix = '') {
    const items = [];

    try {
        const files = fs.readdirSync(dir);

        files.forEach(file => {
            // Skip hidden files and build directories
            if (file.startsWith('.') || file === 'build' || file === 'node_modules') {
                return;
            }

            const filePath = path.join(dir, file);
            const stats = fs.statSync(filePath);
            const relativePath = filePath.replace(PROJECTS_DIR, '').substring(1);

            if (stats.isDirectory()) {
                items.push({
                    name: file,
                    type: 'folder',
                    path: relativePath,
                    children: getProjectStructure(filePath, prefix + '  ')
                });
            } else {
                items.push({
                    name: file,
                    type: 'file',
                    path: relativePath,
                    extension: path.extname(file),
                    size: (stats.size / 1024).toFixed(2) + ' KB'
                });
            }
        });
    } catch (err) {
        log('error', `Error reading directory: ${err.message}`);
    }

    return items;
}

/**
 * Build APK using Gradle
 */
function buildAPK(projectPath, projectName, callback) {
    const buildScript = `#!/bin/bash
set -e

cd "${projectPath}"

# Check if gradlew exists, if not create it
if [ ! -f "gradlew" ]; then
    echo "Creating gradle wrapper..."
    gradle wrapper --gradle-version 7.5 2>&1 || true
fi

# Make gradlew executable
chmod +x gradlew

# Clean previous builds
echo "Cleaning previous builds..."
./gradlew clean --stacktrace 2>&1 || true

# Build APK
echo "Building APK..."
./gradlew assembleDebug --stacktrace 2>&1

# Check if APK was created
APK_FILE="${projectPath}/app/build/outputs/apk/debug/app-debug.apk"
if [ -f "\$APK_FILE" ]; then
    echo "BUILD_SUCCESS:\$APK_FILE"
else
    echo "BUILD_FAILED: APK not found at \$APK_FILE"
    exit 1
fi
`;

    const tmpFile = tmp.fileSync({ suffix: '.sh', unsafeCleanup: true });
    fs.writeFileSync(tmpFile.name, buildScript);
    fs.chmodSync(tmpFile.name, '755');

    log('info', `Build script created: ${tmpFile.name}`);

    const child = spawn('bash', [tmpFile.name], {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 600000 // 10 minutes timeout
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        log('build', output.trim());
    });

    child.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        log('build-error', output.trim());
    });

    child.on('close', (code) => {
        try {
            fs.unlinkSync(tmpFile.name);
        } catch (err) {
            // Ignore cleanup errors
        }

        if (code === 0 && stdout.includes('BUILD_SUCCESS')) {
            const apkPath = stdout.split('BUILD_SUCCESS:')[1]?.split('\n')[0]?.trim();
            callback(null, apkPath);
        } else {
            callback(new Error(stderr || `Build failed with code ${code}`), null);
        }
    });

    // Timeout handling
    setTimeout(() => {
        if (child && !child.killed) {
            child.kill('SIGKILL');
            log('error', `Build timeout for ${projectName}`);
            callback(new Error('Build timeout - took too long'), null);
        }
    }, 600000);
}

/**
 * Get disk space usage
 */
function getDiskSpace(dir) {
    try {
        let totalSize = 0;
        
        function getSize(filepath) {
            const stats = fs.statSync(filepath);
            if (stats.isDirectory()) {
                fs.readdirSync(filepath).forEach(file => {
                    getSize(path.join(filepath, file));
                });
            } else {
                totalSize += stats.size;
            }
        }
        
        if (fs.existsSync(dir)) {
            getSize(dir);
        }
        
        return (totalSize / 1024 / 1024).toFixed(2) + ' MB';
    } catch (err) {
        return 'Unknown';
    }
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        error: 'Endpoint not found' 
    });
});

// Global error handler
app.use((err, req, res, next) => {
    log('error', `Unhandled error: ${err.message}`);
    
    res.status(500).json({ 
        success: false, 
        error: NODE_ENV === 'production' 
            ? 'Internal server error' 
            : err.message 
    });
});

// Unhandled promise rejection
process.on('unhandledRejection', (reason, promise) => {
    log('error', `Unhandled Rejection: ${reason}`);
});

// Uncaught exception
process.on('uncaughtException', (error) => {
    log('error', `Uncaught Exception: ${error.message}`);
    process.exit(1);
});

// ============================================================================
// SERVER START
// ============================================================================

const server = app.listen(PORT, '0.0.0.0', () => {
    log('info', '========================================');
    log('info', 'Android APK Builder Studio');
    log('info', '========================================');
    log('info', `Environment: ${NODE_ENV}`);
    log('info', `Port: ${PORT}`);
    log('info', `Node Version: ${process.version}`);
    log('info', `Platform: ${os.platform()}`);
    
    if (NODE_ENV === 'production') {
        log('info', 'Access at: https://your-domain.com');
    } else {
        log('info', `Access at: http://localhost:${PORT}`);
    }
    
    log('info', '========================================');
    log('info', 'Server ready to accept connections');
});

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        log('error', `Port ${PORT} already in use`);
    } else {
        log('error', `Server error: ${error.message}`);
    }
    process.exit(1);
});

module.exports = server;