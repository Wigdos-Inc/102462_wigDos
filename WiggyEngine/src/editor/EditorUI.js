/**
 * Editor UI Manager - Handles main editor interface interactions
 */
class EditorUI {
    static currentProject = null;
    static isPlaying = false;
    static sceneEditor = null;
    static builder = null;

    // Initialize the editor UI
    static async initialize() {
        this.builder = new ProjectBuilder();
        const SplashAudio = new Engine.Audio('sounds/intro.mp3');
        await SplashAudio.init();
        SplashAudio.pitch = Math.random() * (2.0 - 0.5) + 0.5;

        //const editorAudio = new Engine.Audio('sounds/Wiggy Seashore Engine (2).mp3');
        //await editorAudio.init();

        //editorAudio.loop = true;
        //editorAudio.pitch = Math.random() * (2.0 - 0.5) + 0.5;
        //editorAudio.volume = 0.1;

        SplashAudio.play();

        // Show splash screen first
        this.showSplashScreen(() => {
            //editorAudio.play();

            this.setupEventListeners();
            this.setupToolButtons();
            this.initializeSceneEditor();
            if (typeof AssetManager !== 'undefined') {
                AssetManager.initialize();
            }
        
        // Initialize ScriptEditor
        if (typeof ScriptEditor !== 'undefined') {
            ScriptEditor.initialize();
        }
        
            // Only load default project if currentProject is not already set by ProjectManager
            if (!this.currentProject) {
                this.loadDefaultProject();
            } else {
                // Project was loaded by ProjectManager, refresh UI
                this.refreshProjectUI();
                GameObjectManager.refreshHierarchy();
                this.loadSceneIntoEditor();
            }
        });
    }
    
    // Initialize 3D scene editor
    static async initializeSceneEditor() {
        try {
            this.sceneEditor = new SceneEditor();
            await this.sceneEditor.initialize('webgl-canvas');
            this.sceneEditor.start();
            console.log('Scene editor initialized');
        } catch (error) {
            console.error('Failed to initialize scene editor:', error);
        }
    }

    // Set up event listeners for UI elements
    static setupEventListeners() {
        // Canvas resize handling
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
    }

    // Setup tool buttons in viewport
    static setupToolButtons() {
        const toolButtons = document.querySelectorAll('.tool-btn');
        toolButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remove active class from all buttons
                toolButtons.forEach(b => b.classList.remove('active'));
                // Add active class to clicked button
                e.target.classList.add('active');
                
                // Set the active tool
                const toolName = e.target.id.replace('-tool', '');
                this.setActiveTool(toolName);
            });
        });
    }

    // Handle keyboard shortcuts
    static handleKeyboardShortcuts(e) {
        if (e.ctrlKey || e.metaKey) {
            switch(e.code) {
                case 'KeyN':
                    e.preventDefault();
                    this.newProject();
                    break;
                case 'KeyO':
                    e.preventDefault();
                    this.openProject();
                    break;
                case 'KeyS':
                    e.preventDefault();
                    this.saveProject();
                    break;
                case 'Space':
                    e.preventDefault();
                    this.togglePlayMode();
                    break;
            }
        }

        // Tool shortcuts
        switch(e.code) {
            case 'KeyW':
                this.setActiveTool('move');
                break;
            case 'KeyE':
                this.setActiveTool('rotate');
                break;
            case 'KeyR':
                this.setActiveTool('scale');
                break;
        }
    }

    // Project management
    static newProject() {
        // Show ProjectManager's new project dialog
        ProjectManager.showNewProjectDialog();
    }

    static openProject() {
        // Show ProjectManager's load project dialog
        ProjectManager.showLoadProjectDialog();
    }

    static saveProject() {
        if (!this.currentProject) {
            this.showNotification('Geen project om op te slaan', 'warning');
            return;
        }
        
        // Update ProjectManager's current project
        ProjectManager.currentProject = this.currentProject;
        
        // Use ProjectManager to save compressed file
        ProjectManager.saveProjectToFile();
        
        this.showNotification('Project opgeslagen', 'success');
    }

    static exportProject() {
        if (!this.currentProject) {
            this.showNotification('Geen project om te exporteren', 'warning');
            return;
        }

        ProjectManager.currentProject = this.currentProject;
        ProjectManager.exportProjectToFile();
        this.showNotification('Project geëxporteerd als RBXL-bestand', 'success');
    }

    static buildProject() {
        if (!this.currentProject) {
            this.showNotification('Geen project om te bouwen', 'warning');
            return;
        }

        this.showNotification('Project wordt gebouwd...', 'info');
        
        // Start build process
        setTimeout(async () => {
            try {
                this.showNotification('Project wordt gebouwd...', 'info');
                
                // Create project builder instance
                const project = typeof ProjectManager !== 'undefined' && ProjectManager.normalizeProject
                    ? ProjectManager.normalizeProject(this.currentProject)
                    : this.currentProject;
                const buildResult = await this.builder.buildProject(project);
                
                if (buildResult.success) {
                    // Create downloadable HTML file
                    const htmlBlob = new Blob([buildResult.html], { type: 'text/html' });
                    const url = URL.createObjectURL(htmlBlob);
                    
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${project.name}_game.html`;
                    link.click();
                    
                    URL.revokeObjectURL(url);
                    this.showNotification(`Project succesvol gebouwd! ${buildResult.stats}`, 'success');
                    alert(`Game geëxporteerd als "${project.name}_game.html"\n${buildResult.stats}`);
                } else {
                    this.showNotification(`Build mislukt: ${buildResult.error}`, 'error');
                    alert('Build mislukt: ' + buildResult.error);
                }
            } catch (error) {
                console.error('Build error:', error);
                this.showNotification(`Build fout: ${error.message}`, 'error');
            }
        }, 2000);
    }

    // Play mode management
    static playProject() {
        this.togglePlayMode();
    }

    static togglePlayMode() {
        this.isPlaying = !this.isPlaying;
        
        const playButton = document.querySelector('[onclick="EditorUI.playProject()"]');
        if (this.isPlaying) {
            playButton.textContent = '⏸ Stop';
            playButton.style.backgroundColor = '#ff4444';
            this.showNotification('Spel gestart!', 'success');
            
            // Start the game
            const runtime = window.WiggyEngine || globalThis.WiggyEngine;
            if (runtime && typeof runtime.startPlayMode === 'function') {
                runtime.startPlayMode();

                const loadProj = async () => {
                    const project = typeof ProjectManager !== 'undefined' && ProjectManager.normalizeProject
                    ? ProjectManager.normalizeProject(this.currentProject)
                    : this.currentProject;
                    const projectData = await this.builder.getProject(project);

                    //const newWindow = window.open("", "_blank");
                    //newWindow.document.open();
                    //newWindow.document.write(getexportHTML(projectData.proj, projectData.buildDat, this.builder));
                    //newWindow.document.close();

                    this.Gameiframe = document.createElement("iframe");
                    this.Gameiframe.setAttribute('class', 'game-iframe');
                    this.Gameiframe.width = "1920";
                    this.Gameiframe.height = "1080";
                    this.Gameiframe.srcdoc = getexportHTML(projectData.proj, projectData.buildDat, this.builder);

                    document.body.appendChild(this.Gameiframe);
                }

                loadProj();
            } else {
                this.showNotification('Play mode is niet beschikbaar in deze build', 'warning');
            }
        } else {
            playButton.textContent = '▶ Afspelen';
            playButton.style.backgroundColor = '';
            this.showNotification('Spel gestopt!', 'info');
            
            // Stop the game
            const runtime = window.WiggyEngine || globalThis.WiggyEngine;
            if (runtime && typeof runtime.stopPlayMode === 'function') {
                runtime.stopPlayMode();

                if(this.Gameiframe) document.body.removeChild(this.Gameiframe);
            }
        }
    }

    // Tool management
    static setActiveTool(toolName) {
        // Update visual state
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.getElementById(`${toolName}-tool`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        // Set the tool in the engine
        console.log('Tool setting not implemented (engine removed)');
        
        this.showNotification(`Tool: ${toolName}`, 'info');
    }

    // Refresh project UI after loading
    static refreshProjectUI() {
        this.updateProjectTitle();
        this.refreshHierarchy();
    }
    
    // Load current project scene into 3D editor
    static loadSceneIntoEditor() {
        if (!this.sceneEditor || !this.currentProject) return;
        
        const scene = this.currentProject.scenes[0].gameObjects || [];
        
        this.sceneEditor.setScene(scene);
        console.log('Scene loaded into editor with', scene.length, 'objects');
    }

    // UI updates
    static updateProjectTitle() {
        if (this.currentProject) {
            document.title = `WiggyEngine - ${this.currentProject.name}`;
        }
    }

    static refreshHierarchy() {
        GameObjectManager.refreshHierarchy();
    }

    static refreshInspector() {
        Inspector.refresh();
    }

    static refreshAssetBrowser() {
        if (typeof AssetManager !== 'undefined') {
            AssetManager.refreshAssetBrowser();
        }
    }

    // Canvas management
    static resizeCanvas() {
        const canvas = document.getElementById('webgl-canvas');
        const container = document.getElementById('viewport-container');
        const controls = document.getElementById('viewport-controls');
        
        if (canvas && container && controls) {
            const containerHeight = container.clientHeight;
            const controlsHeight = controls.clientHeight;
            const newHeight = containerHeight - controlsHeight;
            
            canvas.width = container.clientWidth;
            canvas.height = newHeight;
            canvas.style.height = newHeight + 'px';
            
            // Notify the renderer about the resize
            // Renderer resize not implemented (engine removed)
            console.log('Canvas resized to:', canvas.width, 'x', newHeight);
        }
    }

    // Notification system
    static showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '10px 20px',
            borderRadius: '4px',
            color: 'white',
            backgroundColor: this.getNotificationColor(type),
            zIndex: '10000',
            opacity: '0',
            transition: 'opacity 0.3s ease'
        });
        
        // Add to DOM
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);
        
        // Remove after delay
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    static getNotificationColor(type) {
        switch(type) {
            case 'success': return '#44aa44';
            case 'error': return '#aa4444';
            case 'warning': return '#aaaa44';
            default: return '#4488aa';
        }
    }

    // Load default project on startup
    static loadDefaultProject() {
        this.currentProject = {
            name: 'UntitledProject',
            version: '1.0.0',
            scenes: [{
                name: 'Scene1',
                id: 'scene_default',
                gameObjects: [
                    {
                        id: 'camera_default',
                        name: 'Main Camera',
                        transform: {
                            position: { x: 0, y: 0, z: 5 },
                            rotation: { x: 0, y: 0, z: 0 },
                            scale: { x: 1, y: 1, z: 1 }
                        },
                        components: [{
                            id: 'component_camera',
                            type: 'camera',
                            name: 'Camera',
                            enabled: true
                        }]
                    },
                    {
                        id: 'light_default',
                        name: 'Directional Light',
                        transform: {
                            position: { x: 0, y: 3, z: 0 },
                            rotation: { x: 45, y: 30, z: 0 },
                            scale: { x: 1, y: 1, z: 1 }
                        },
                        components: [{
                            id: 'component_light',
                            type: 'light',
                            name: 'Light',
                            enabled: true
                        }]
                    }
                ]
            }],
            assets: [],
            scripts: [],
            settings: {
                resolution: { width: 1920, height: 1080 },
                renderPipeline: 'forward'
            }
        };
        
        if (typeof ProjectManager !== 'undefined' && ProjectManager.normalizeProject) {
            this.currentProject = ProjectManager.normalizeProject(this.currentProject);
        }

        this.updateProjectTitle();
        this.refreshHierarchy();
        this.refreshAssetBrowser();
    }
    
    static showSplashScreen(onComplete) {
        const splashHTML = getSplash('images/logo2.png');
        
        document.body.insertAdjacentHTML('beforeend', splashHTML);

        window.EditorUI = EditorUI;
        window.WiggyEngine = window.WiggyEngine || {
        startPlayMode() {
            console.log('WiggyEngine play mode shim: startPlayMode');
        },

        stopPlayMode() {
            console.log('WiggyEngine play mode shim: stopPlayMode');
        }
    };
        
        const progressBar = document.getElementById('splash-progress');
        let progress = 0;
        
        const progressInterval = setInterval(() => {
            progress += Math.random() * 15 + 5;
            if (progress >= 100) {
                progress = 100;
                clearInterval(progressInterval);
                
                progressBar.style.width = '100%';
                
                setTimeout(() => {
                    const splash = document.getElementById('splash-screen');
                    splash.style.animation = 'fadeOut 0.5s ease-in';
                    
                    setTimeout(() => {
                        splash.remove();
                        onComplete();
                    }, 500);
                }, 500);
            } else {
                progressBar.style.width = progress + '%';
            }
        }, 100);
    }
}
