class ProjectManager {
    static currentProject = null;
    static projectHistory = [];

    static initialize() {
        this.loadProjectHistory();
        this.showProjectSelection();
    }

    static showProjectSelection() {
        const existing = document.getElementById('project-selection');
        if (existing) existing.remove();

        const body = document.body;
        const overlay = document.createElement('div');
        overlay.id = 'project-selection';
        overlay.innerHTML = projectSelectionContainer;

        body.appendChild(overlay);
        this.populateRecentProjects();
    }

    static hideProjectSelection() {
        const overlay = document.getElementById('project-selection');
        if (overlay) overlay.remove();

        const mainLayout = document.getElementById('wiggy-engine');
        if (mainLayout) {
            mainLayout.style.display = 'flex';
        }
    }

    static showNewProjectDialog() {
        const existing = document.querySelector('.modal-overlay');
        if (existing) existing.remove();

        const dialog = document.createElement('div');
        dialog.className = 'modal-overlay';
        dialog.innerHTML = projectSettingsModal;
        document.body.appendChild(dialog);
    }
    
    // Show load project dialog
    static showLoadProjectDialog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.wigproj';
        input.onchange = (e) => {
            if (e.target.files.length > 0) {
                loadProjectFromFile(e.target.files[0]);
            }
        };
        input.click();
    }
    
    // Create new project
    static createNewProject() {
        const nameInput = document.getElementById('project-name');
        const templateSelect = document.getElementById('project-template');
        
        if (!nameInput) {
            // Called from test or without dialog - create with defaults
            this.createProjectWithData('Test Project', 'empty');
            return;
        }
        
        const name = nameInput.value.trim();
        const template = templateSelect.value;
        
        if (!name) {
            alert('Voer een project naam in');
            return;
        }
        
        this.createProjectWithData(name, template);
    }
    
    // Create project with specified data
    static createProjectWithData(name, template) {
        const project = this.normalizeProject({
            name: name,
            version: "1.0.0",
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            template: template,
            settings: {
                defaultScene: "Main Scene",
                targetPlatform: "web",
                buildSettings: {}
            },
            scenes: [{
                name: "Main Scene",
                id: this.generateId(),
                gameObjects: []
            }],
            assets: [],
            metadata: {
                editorVersion: "1.0.0",
                author: "WiggyEngine User"
            }
        });
        
        this.currentProject = project;
        this.addToProjectHistory(project);
        
        // Close dialogs and start editor
        document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
        this.hideProjectSelection();
        
        // Initialize editor with new project
        EditorUI.currentProject = project;
        EditorUI.initialize();
        
        console.log('New project created:', project);
    }
    
    // Save current project to a file
    static async saveProjectToFile(format = 'wigp') {
        if (!this.currentProject) {
            alert('Geen project om op te slaan');
            return;
        }
        
        try {
            const normalizedProject = this.normalizeProject({
                ...this.currentProject,
                modified: new Date().toISOString()
            });
            this.currentProject = normalizedProject;
            
            let dataBlob;
            let fileName;

            if (format === 'rbxl') {
                const xmlProject = this.serializeRbxlProject(normalizedProject);
                dataBlob = new Blob([xmlProject], { type: 'application/xml' });
                fileName = `${normalizedProject.name}.rbxl`;
            } else {
                const compressed = WiggyCompression.compress(normalizedProject);
                console.log(`Compression: ${compressed.originalSize} -> ${compressed.compressedSize} bytes (ratio: ${compressed.ratio}:1)`);
                
                const fileData = {
                    type: 'WiggyEngine Project',
                    version: '1.0.0',
                    compression: 'WiggyLZ77+Huffman',
                    data: compressed
                };
                
                const finalData = new Uint8Array(new TextEncoder().encode(JSON.stringify(fileData)));
                dataBlob = new Blob([finalData], { type: 'application/octet-stream' });
                fileName = `${normalizedProject.name}.wigp`;
            }
            
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            link.click();
            
            URL.revokeObjectURL(url);
            console.log(`Project '${normalizedProject.name}' exported as ${fileName}`);
            
        } catch (error) {
            console.error('Failed to save project:', error);
            alert('Kon project niet opslaan: ' + error.message);
        }
    }
    
    // Validate project structure
    static validateProject(project) {
        return project && 
               typeof project.name === 'string' &&
               project.version &&
               project.scenes &&
               Array.isArray(project.scenes) &&
               project.scenes.length > 0;
    }

    static normalizeProject(project) {
        const safeProject = project || {};
        const scenes = Array.isArray(safeProject.scenes) ? safeProject.scenes : [];

        return {
            name: safeProject.name || 'UntitledProject',
            version: safeProject.version || '1.0.0',
            created: safeProject.created || new Date().toISOString(),
            modified: safeProject.modified || new Date().toISOString(),
            template: safeProject.template || 'empty',
            settings: {
                defaultScene: safeProject.settings?.defaultScene || 'Main Scene',
                targetPlatform: safeProject.settings?.targetPlatform || 'web',
                buildSettings: safeProject.settings?.buildSettings || {},
                ...(safeProject.settings || {})
            },
            scenes: scenes.map(scene => ({
                id: scene.id || this.generateId(),
                name: scene.name || 'Main Scene',
                gameObjects: Array.isArray(scene.gameObjects) ? scene.gameObjects.map(gameObject => ({
                    id: gameObject.id || this.generateId(),
                    name: gameObject.name || 'GameObject',
                    transform: gameObject.transform || {
                        position: { x: 0, y: 0, z: 0 },
                        rotation: { x: 0, y: 0, z: 0 },
                        scale: { x: 1, y: 1, z: 1 }
                    },
                    components: Array.isArray(gameObject.components) ? gameObject.components.map(component => {
                        if (typeof component === 'string') {
                            return {
                                id: this.generateId(),
                                type: component.toLowerCase(),
                                name: component,
                                enabled: true
                            };
                        }

                        return {
                            id: component.id || this.generateId(),
                            type: component.type || 'unknown',
                            name: component.name || component.type || 'Component',
                            enabled: component.enabled !== false,
                            code: component.code,
                            ...component
                        };
                    }) : []
                })) : []
            })),
            assets: Array.isArray(safeProject.assets) ? safeProject.assets : [],
            metadata: {
                editorVersion: safeProject.metadata?.editorVersion || '1.0.0',
                author: safeProject.metadata?.author || 'WiggyEngine User',
                projectFileType: safeProject.metadata?.projectFileType || 'wiggy'
            }
        };
    }

    static exportProjectToFile() {
        return this.saveProjectToFile('rbxl');
    }
    
    // Add project to history
    static addToProjectHistory(project) {
        const history = this.projectHistory.filter(p => p.name !== project.name);
        history.unshift({
            name: project.name,
            path: `${project.name}.wigp`,
            lastOpened: new Date().toISOString(),
            template: project.template || 'unknown'
        });
        
        // Keep only last 10 projects
        this.projectHistory = history.slice(0, 10);
        this.saveProjectHistory();
    }
    
    // Load project history from localStorage
    static loadProjectHistory() {
        try {
            const stored = localStorage.getItem('wiggyengine_project_history');
            if (stored) {
                this.projectHistory = JSON.parse(stored);
            }
        } catch (error) {
            console.warn('Could not load project history:', error);
            this.projectHistory = [];
        }
    }
    
    // Save project history to localStorage
    static saveProjectHistory() {
        try {
            localStorage.setItem('wiggyengine_project_history', JSON.stringify(this.projectHistory));
        } catch (error) {
            console.warn('Could not save project history:', error);
        }
    }
    
    // Populate recent projects list
    static populateRecentProjects() {
        const container = document.getElementById('recent-projects-list');
        if (!container) return;
        
        if (this.projectHistory.length === 0) {
            container.innerHTML = '<p class="no-projects">Geen recente projecten</p>';
            return;
        }
        
        container.innerHTML = this.projectHistory.map(project => `
            <div class="recent-project-item" onclick="ProjectManager.openRecentProject('${project.name}')">
                <div class="project-info">
                    <h4>${project.name}</h4>
                    <p>Template: ${project.template}</p>
                    <small>Laatst geopend: ${new Date(project.lastOpened).toLocaleDateString()}</small>
                </div>
                <div class="project-actions">
                    <button onclick="event.stopPropagation(); ProjectManager.removeFromHistory('${project.name}')">×</button>
                </div>
            </div>
        `).join('');
    }
    
    // Open recent project (placeholder - would need file system access)
    static openRecentProject(projectName) {
        alert(`Recent project opening niet geïmplementeerd voor: ${projectName}\nGebruik "Project Openen" om bestanden vanaf schijf te laden.`);
    }
    
    // Remove project from history
    static removeFromHistory(projectName) {
        this.projectHistory = this.projectHistory.filter(p => p.name !== projectName);
        this.saveProjectHistory();
        this.populateRecentProjects();
    }
    
    // Add project selection styles
    static addProjectSelectionStyles() {
        return;
    }
    
    // Generate unique ID
    static generateId() {
        return 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }
}

window.ProjectManager = ProjectManager;
