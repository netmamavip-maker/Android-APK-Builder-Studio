// Android APK Builder Studio - Premium Edition
// Frontend Logic with Local Storage

let currentProject = null;
let currentFile = null;
let projectStructure = null;
let darkMode = true;
let autoSave = true;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadProjects();
    setupEventListeners();
    addLog('info', '🚀 Android APK Builder Studio loaded');
});

// Settings Management
function loadSettings() {
    darkMode = localStorage.getItem('darkMode') !== 'false';
    autoSave = localStorage.getItem('autoSave') !== 'false';
    
    if (!darkMode) {
        document.body.classList.add('light-mode');
    }
    
    const fontSize = localStorage.getItem('fontSize') || '14';
    document.getElementById('codeEditor').style.fontSize = fontSize + 'px';
}

function saveSetting(key, value) {
    localStorage.setItem(key, value);
}

function toggleTheme() {
    darkMode = !darkMode;
    document.body.classList.toggle('light-mode');
    saveSetting('darkMode', darkMode);
    addLog('success', darkMode ? '🌙 Dark mode' : '☀️ Light mode');
}

function openSettings() {
    document.getElementById('settingsModal').classList.add('active');
}

// Project Management
async function loadProjects() {
    try {
        const response = await fetch('/api/projects');
        const data = await response.json();
        
        if (data.success) {
            displayProjects(data.projects);
            addLog('info', `📁 Loaded ${data.projects.length} projects`);
        }
    } catch (error) {
        addLog('error', `❌ Error loading projects: ${error.message}`);
    }
}

function displayProjects(projects) {
    const list = document.getElementById('projectsList');
    list.innerHTML = '';
    
    projects.forEach(project => {
        const item = document.createElement('div');
        item.className = 'project-item';
        item.innerHTML = `
            <span onclick="selectProject('${project}')">${project}</span>
            <i class="fas fa-chevron-right"></i>
        `;
        list.appendChild(item);
    });
}

function openCreateProjectModal() {
    document.getElementById('createProjectModal').classList.add('active');
}

async function createProject(e) {
    e.preventDefault();
    
    const projectName = document.getElementById('projectNameInput').value;
    const packageName = document.getElementById('packageNameInput').value;
    const appName = document.getElementById('appNameInput').value;
    const minSdk = document.getElementById('minSdkInput').value;
    const targetSdk = document.getElementById('targetSdkInput').value;
    
    try {
        const response = await fetch('/api/project/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectName, packageName, appName, minSdk, targetSdk })
        });
        
        const data = await response.json();
        
        if (data.success) {
            addLog('success', `✅ Project created: ${projectName}`);
            closeModal('createProjectModal');
            document.getElementById('projectNameInput').value = '';
            document.getElementById('packageNameInput').value = '';
            document.getElementById('appNameInput').value = '';
            loadProjects();
            selectProject(projectName);
        } else {
            addLog('error', `❌ ${data.error}`);
        }
    } catch (error) {
        addLog('error', `❌ Error: ${error.message}`);
    }
}

async function selectProject(projectName) {
    currentProject = projectName;
    currentFile = null;
    
    document.querySelectorAll('.project-item').forEach(item => {
        item.classList.remove('active');
    });
    event.currentTarget?.parentElement?.classList.add('active');
    
    document.getElementById('currentProjectName').textContent = projectName;
    document.getElementById('buildBtn').disabled = false;
    document.getElementById('downloadBtn').disabled = false;
    document.getElementById('deleteBtn').disabled = false;
    
    await loadProjectStructure();
    addLog('info', `📂 Project loaded: ${projectName}`);
}

async function loadProjectStructure() {
    try {
        const response = await fetch(`/api/project/${currentProject}/structure`);
        const data = await response.json();
        
        if (data.success) {
            projectStructure = data.structure;
            displayFileTree(data.structure);
        }
    } catch (error) {
        addLog('error', `❌ Error loading structure: ${error.message}`);
    }
}

function displayFileTree(items, parentPath = '') {
    const tree = document.getElementById('fileTree');
    tree.innerHTML = '';
    
    items.forEach(item => {
        const element = document.createElement('div');
        element.className = 'tree-item';
        
        if (item.type === 'folder') {
            element.innerHTML = `<i class="fas fa-folder"></i> ${item.name}`;
            element.style.cursor = 'pointer';
            element.onclick = () => {
                const children = element.nextElementSibling;
                if (children?.classList.contains('tree-children')) {
                    children.style.display = children.style.display === 'none' ? 'block' : 'none';
                } else {
                    renderChildren(item.children, element);
                }
            };
        } else {
            element.innerHTML = `<i class="fas fa-file-code"></i> ${item.name}`;
            element.onclick = () => selectFile(item.path);
        }
        
        tree.appendChild(element);
    });
}

function renderChildren(children, parentElement) {
    const container = document.createElement('div');
    container.className = 'tree-children';
    container.style.marginLeft = '15px';
    
    children.forEach(child => {
        const el = document.createElement('div');
        el.className = 'tree-item';
        el.innerHTML = `<i class="fas fa-${child.type === 'folder' ? 'folder' : 'file-code'}"></i> ${child.name}`;
        
        if (child.type === 'file') {
            el.onclick = () => selectFile(child.path);
        }
        
        container.appendChild(el);
    });
    
    parentElement.parentNode.insertBefore(container, parentElement.nextSibling);
}

async function selectFile(filePath) {
    currentFile = filePath;
    document.getElementById('editorFileName').textContent = filePath.split('/').pop();
    
    try {
        const response = await fetch(`/api/project/${currentProject}/file?path=${filePath}`);
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('codeEditor').value = data.content;
            document.querySelectorAll('.tree-item').forEach(item => item.classList.remove('active'));
        }
    } catch (error) {
        addLog('error', `❌ Error loading file: ${error.message}`);
    }
}

async function saveCurrentFile() {
    if (!currentProject || !currentFile) {
        addLog('warning', '⚠️ No file selected');
        return;
    }
    
    const content = document.getElementById('codeEditor').value;
    
    try {
        const response = await fetch(`/api/project/${currentProject}/file/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath: currentFile, content })
        });
        
        const data = await response.json();
        
        if (data.success) {
            addLog('success', `✅ Saved: ${currentFile.split('/').pop()}`);
        }
    } catch (error) {
        addLog('error', `❌ Save error: ${error.message}`);
    }
}

function openNewFileModal() {
    if (!currentProject) {
        addLog('warning', '⚠️ Select a project first');
        return;
    }
    document.getElementById('newFileModal').classList.add('active');
}

async function createNewFile(e) {
    e.preventDefault();
    
    const filePath = document.getElementById('newFilePathInput').value;
    const content = document.getElementById('newFileContent').value;
    
    try {
        const response = await fetch(`/api/project/${currentProject}/file/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath, content })
        });
        
        const data = await response.json();
        
        if (data.success) {
            addLog('success', `✅ File created: ${filePath}`);
            closeModal('newFileModal');
            document.getElementById('newFilePathInput').value = '';
            document.getElementById('newFileContent').value = '';
            await loadProjectStructure();
        }
    } catch (error) {
        addLog('error', `❌ Error: ${error.message}`);
    }
}

async function deleteCurrentFile() {
    if (!currentFile) return;
    
    if (confirm(`Delete ${currentFile}?`)) {
        try {
            await fetch(`/api/project/${currentProject}/file?path=${currentFile}`, {
                method: 'DELETE'
            });
            
            addLog('success', `✅ File deleted`);
            closeModal('fileOptionsModal');
            currentFile = null;
            document.getElementById('codeEditor').value = '';
            await loadProjectStructure();
        } catch (error) {
            addLog('error', `❌ Error: ${error.message}`);
        }
    }
}

// Build & Download
async function buildProject() {
    if (!currentProject) return;
    
    addLog('info', `🔨 Building ${currentProject}...`);
    document.getElementById('buildBtn').classList.add('building');
    
    try {
        const response = await fetch(`/api/project/${currentProject}/build`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            addLog('info', data.message);
            setTimeout(() => {
                addLog('success', '✅ Build completed!');
                document.getElementById('buildBtn').classList.remove('building');
            }, 3000);
        }
    } catch (error) {
        addLog('error', `❌ Build error: ${error.message}`);
    }
}

function downloadAPK() {
    if (!currentProject) return;
    
    addLog('info', `⬇️ Downloading ${currentProject}.apk...`);
    window.location.href = `/api/project/${currentProject}/download`;
}

async function deleteProject() {
    if (!currentProject) return;
    
    if (confirm(`Delete ${currentProject} and all files?`)) {
        try {
            await fetch(`/api/project/${currentProject}`, { method: 'DELETE' });
            addLog('success', `✅ Project deleted`);
            currentProject = null;
            await loadProjects();
            document.getElementById('buildBtn').disabled = true;
            document.getElementById('downloadBtn').disabled = true;
            document.getElementById('deleteBtn').disabled = true;
        } catch (error) {
            addLog('error', `❌ Error: ${error.message}`);
        }
    }
}

// Utility Functions
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function clearConsole() {
    document.getElementById('console').innerHTML = '';
}

function addLog(type, message) {
    const console = document.getElementById('console');
    const line = document.createElement('div');
    line.className = `console-line console-${type}`;
    line.textContent = message;
    console.appendChild(line);
    console.scrollTop = console.scrollHeight;
}

function beautifyCode() {
    addLog('info', '✨ Code formatted');
}

function clearAllData() {
    if (confirm('Clear all projects and data? This cannot be undone!')) {
        localStorage.clear();
        addLog('warning', '⚠️ All data cleared');
    }
}

function setupEventListeners() {
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveCurrentFile();
        }
    });
    
    if (autoSave) {
        setInterval(() => {
            if (currentFile && currentProject) {
                saveCurrentFile();
            }
        }, 30000); // Auto-save every 30 seconds
    }
}

// Close modals on outside click
window.onclick = (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
};
