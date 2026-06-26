/**
 * Scene Editor - Integrates rendering with the editor UI
 */
class SceneEditor {
    constructor() {
        this.renderer = null;
        this.camera = null;
        this.scene = null;
        this.isInitialized = false;
        this.isRunning = false;
        
        // Editor state
        this.selectedGameObject = null;
        this.editorCamera = null;
        
        // Input handling
        this.input = {
            keys: new Set(),
            mouseX: 0,
            mouseY: 0,
            mouseDown: false
        };
        
        // Mouse lock state
        this.isMouseLocked = false;
        this.mouseSensitivity = 0.002;

        this.selectedObjects = new Set();
    }
    
    async initialize(canvasId) {
        try {
            // Initialize renderer (using Renderer2)
            this.renderer = new Engine.WebGLRenderer(canvas);
            //await this.renderer.initialize(canvasId);
            
            // Setup editor camera
            this.setupEditorCamera();
            
            this.isInitialized = true;
            console.log('SceneEditor initialized successfully');
            
        } catch (error) {
            console.error('SceneEditor initialization failed:', error);
            throw error;
        }
    }
    
    setupEditorCamera() {
        this.editorCamera = new Engine.FreeCamera;
        Engine.Orbit.setCurrentCamera(this.editorCamera);
        Engine.Orbit.OrbitInit();

        this.editorCamera.position = new Engine.Vec3(0, 5, 10);
        this.editorCamera.target = new Engine.Vec3(0, 0, 0);
        this.editorCamera.up = new Engine.Vec3(0, 1, 0);
        this.editorCamera.fov = 45;

        this.editorCamera.isControlled = true;
    }
    
    setScene(scene) {
        this.scene = scene;
        console.log('Scene set with', scene ? scene.length : 0, 'objects');
    }
    
    start() {
        if (!this.isInitialized) {
            console.error('SceneEditor not initialized');
            return;
        }
        
        this.isRunning = true;
        this.renderLoop();
        console.log('SceneEditor started');
    }
    
    stop() {
        this.isRunning = false;
        console.log('SceneEditor stopped');
    }
    
    renderLoop() {
        if (!this.isRunning) return;
        
        // Update camera with input
        if (this.editorCamera) {
            this.editorCamera.update(0.016, Engine.Orbit.getKeys());
        }
        
        // Render scene
        if (this.renderer && this.scene && this.editorCamera) {
            this.renderer.render(this.scene.objects, this.editorCamera);
        }
        
        requestAnimationFrame(() => this.renderLoop());
    }

    selectObject(gameObject) {
        this.selectedObjects.clear();
        if (gameObject) {
            this.selectedObjects.add(gameObject);
        }
    }
    
    // Editor API
    selectGameObject(gameObject) {
        this.selectedGameObject = gameObject;
        this.selectObject(gameObject);
        
        console.log('Selected:', gameObject ? gameObject.name : 'none');
    }
    
    addGameObject(gameObject) {
        if (this.scene) {
            const mesh = new Engine.Mesh({gl: this.renderer.gl}, Engine.GeometryBuilder.createBox());
            const pos = gameObject.transform.position;
            const rot = gameObject.transform.rotation;
            const scl = gameObject.transform.scale;
                        
            mesh.position = new Engine.Vec3(pos.x, pos.y, pos.z);
            mesh.rotation = new Engine.Vec3(rot.x, rot.y, rot.z);
            mesh.scale = new Engine.Vec3(scl.x, scl.y, scl.z);
            mesh.id = gameObject.id;

            if (this.scene.objects) {
                this.scene.objects.push(mesh);
            } else {
                this.scene.objects = [];
                this.scene.objects.push(mesh);
            }
        }
    }

    updateGameObject(gameObject) {
        if (this.scene) {
            const index = gameObject.id;
            if (index !== -1) {
                for (let i = 0; i < this.scene.objects.length; i++) {
                    if (this.scene.objects[i].id == index) {
                        const mesh = this.scene.objects[i];
                        const pos = gameObject.transform.position;
                        const rot = gameObject.transform.rotation;
                        const scl = gameObject.transform.scale;

                        mesh.position = new Engine.Vec3(pos.x, pos.y, pos.z);
                        mesh.rotation = new Engine.Vec3(rot.x, rot.y, rot.z);
                        mesh.scale = new Engine.Vec3(scl.x, scl.y, scl.z);
                        mesh.id = gameObject.id;

                        mesh.updateMatrix();
            
                        this.scene.objects[i] = mesh;
                    }
                }
            }
        }
    }
    
    removeGameObject(gameObject) {
        if (this.scene) {
            const index = gameObject.id;
            if (index !== -1) {
                this.scene.objects.splice(index, 1);
            }
        }
    }
    
    setRenderMode(mode) {
        if (this.renderer) {
            this.renderer.setRenderMode(mode);
        }
    }
    
    setWireframeMode(enabled) {
        if (this.renderer) {
            this.renderer.wireframeMode = enabled;
        }
    }
    
    setGridVisible(visible) {
        if (this.renderer) {
            this.renderer.setGridVisible(visible);
        }
    }
    
    focusOnGameObject(gameObject) {
        if (!gameObject || !gameObject.transform || !this.editorCamera) return;
        
        const position = gameObject.transform.position;
        const targetPos = new Engine.Vec3(position.x, position.y, position.z);
        
        // Position camera to look at the object
        const distance = 10;
        const offset = new Engine.Vec3(distance, distance * 0.7, distance);
        
        this.editorCamera.position = targetPos.add(offset);
        this.editorCamera.target = targetPos;
    }
    
    resize(width, height) {
        if (this.renderer) {
            this.renderer.resize(width, height);
        }
    }
    
    getPerformanceInfo() {
        if (this.renderer) {
            return this.renderer.getPerformanceInfo ? this.renderer.getPerformanceInfo() : {};
        }
        return {};
    }
}
