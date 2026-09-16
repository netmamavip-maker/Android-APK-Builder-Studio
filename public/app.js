let currentProject = null;
let currentFile = null;
let projectStructure = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadProjects();
    addLog('info', 'Android APK Builder Studio initialized');
});

async function loadProjects() {
    try {
        const response = await fetch('/api/projects');
        const data = await response.json();

        if (data.success) {
            const projectList = document.getElementById('projectList');
            projectList.innerHTML = '';

            data.projects.forEach(project => {
                const item = document.createElement('div');
                item.className = 'project-item';
                item.textContent = project;
                item.onclick = () => selectProject(project);
                projectList.appendChild(item);
            });
        }
    } catch (error) {
        addLog('error', `Error loading projects: ${error.message}`);
    }
}

function showCreateProject() {
    document.getElementById('createProjectModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
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
            addLog('success', `Project created: ${projectName}`);
            closeModal('createProjectModal');
            loadProjects();
            selectProject(projectName);
            document.getElementById('projectNameInput').value = '';
            document.getElementById('packageNameInput').value = '';
            document.getElementById('appNameInput').value = '';
        } else {
            addLog('error', `Error: ${data.error}`);
        }
    } catch (error) {
        addLog('error', `Error creating project: ${error.message}`);
    }
}

async function selectProject(projectName) {
    currentProject = projectName;
    currentFile = null;

    // Update UI
    document.querySelectorAll('.project-item').forEach(item => {
        item.classList.remove('active');
        if (item.textContent === projectName) {
            item.classList.add('active');
        }
    });

    // Load project structure
    await loadProjectStructure();

    // Enable build/download buttons
    document.getElementById('buildBtn').disabled = false;
    document.getElementById('downloadBtn').disabled = false;

    addLog('info', `Loaded project: ${projectName}`);
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
        addLog('error', `Error loading project structure: ${error.message}`);
    }
}

function displayFileTree(items, parentPath = currentProject) {
    const fileTree = document.getElementById('fileTree');
    fileTree.innerHTML = '';

    items.forEach(item => {
        const element = document.createElement('div');
        element.className = item.type === 'folder' ? 'tree-item tree-folder' : 'tree-item tree-file';

        if (item.type === 'folder') {
            element.textContent = '📁 ' + item.name;
            element.style.cursor = 'pointer';
            element.onclick = (e) => {
                e.stopPropagation();
                const childTree = element.nextElementSibling;
                if (childTree && childTree.className === 'tree-children') {
                    childTree.style.display = childTree.style.display === 'none' ? 'block' : 'none';
                } else {
                    const childContainer = document.createElement('div');
                    childContainer.className = 'tree-children';
                    childContainer.style.marginLeft = '15px';
                    item.children.forEach(child => {
                        const childEl = document.createElement('div');
                        childEl.className = child.type === 'folder' ? 'tree-item tree-folder' : 'tree-item tree-file';
                        childEl.textContent = (child.type === 'folder' ? '📁 ' : '📄 ') + child.name;

                        if (child.type === 'file') {
                            childEl.onclick = () => selectFile(child.path);
                        }

                        childContainer.appendChild(childEl);
                    });
                    element.parentNode.insertBefore(childContainer, element.nextSibling);
                }
            };
        } else {
            element.textContent = '📄 ' + item.name;
            element.onclick = () => selectFile(item.path);
        }

        fileTree.appendChild(element);
    });
}

async function selectFile(filePath) {
    currentFile = filePath;
    document.getElementById('currentFile').textContent = filePath;

    try {
        const response = await fetch(`/api/project/${currentProject}/file?path=${filePath}`);
        const data = await response.json();

        if (data.success) {
            document.getElementById('codeEditor').value = data.content;
            document.querySelectorAll('.tree-item').forEach(item => item.classList.remove('active'));
        } else {
            addLog('error', `Error loading file: ${data.error}`);
        }
    } catch (error) {
        addLog('error', `Error loading file: ${error.message}`);
    }
}

async function saveCurrentFile() {
    if (!currentProject || !currentFile) {
        addLog('error', 'No file selected');
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
            addLog('success', `File saved: ${currentFile}`);
        } else {
            addLog('error', `Error saving file: ${data.error}`);
        }
    } catch (error) {
        addLog('error', `Error saving file: ${error.message}`);
    }
}

function newFile() {
    document.getElementById('newFileModal').style.display = 'block';
}

async function createNewFile(e) {
    e.preventDefault();

    const filePath = document.getElementById('newFilePathInput').value;

    try {
        const response = await fetch(`/api/project/${currentProject}/file/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath, content: '' })
        });

        const data = await response.json();

        if (data.success) {
            addLog('success', `File created: ${filePath}`);
            closeModal('newFileModal');
            document.getElementById('newFilePathInput').value = '';
            await loadProjectStructure();
        } else {
            addLog('error', `Error: ${data.error}`);
        }
    } catch (error) {
        addLog('error', `Error creating file: ${error.message}`);
    }
}

async function buildProject() {
    if (!currentProject) {
        addLog('error', 'No project selected');
        return;
    }

    addLog('info', `Building project: ${currentProject}...`);
    document.getElementById('buildBtn').disabled = true;

    try {
        const response = await fetch(`/api/project/${currentProject}/build`, {
            method: 'POST'
        });

        const data = await response.json();

        if (data.success) {
            addLog('info', data.message);
            // Poll for build completion
            setTimeout(() => {
                addLog('success', 'Build completed successfully!');
                document.getElementById('buildBtn').disabled = false;
            }, 5000);
        } else {
            addLog('error', `Build error: ${data.error}`);
            document.getElementById('buildBtn').disabled = false;
        }
    } catch (error) {
        addLog('error', `Error building project: ${error.message}`);
        document.getElementById('buildBtn').disabled = false;
    }
}

async function downloadAPK() {
    if (!currentProject) {
        addLog('error', 'No project selected');
        return;
    }

    addLog('info', `Downloading APK for ${currentProject}...`);

    try {
        window.location.href = `/api/project/${currentProject}/download`;
        addLog('success', 'APK download started!');
    } catch (error) {
        addLog('error', `Error downloading APK: ${error.message}`);
    }
}

function addLog(type, message) {
    const consoleOutput = document.getElementById('console');
    const line = document.createElement('div');
    line.className = `console-line console-${type}`;
    line.textContent = `[${type.toUpperCase()}] ${message}`;
    consoleOutput.appendChild(line);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

// Close modals when clicking outside
window.onclick = (event) => {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
};
