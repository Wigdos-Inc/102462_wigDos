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
        this.loadScene(scene);
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
    
    async addGameObject(gameObject) {
        if (this.scene) {
            //console.log(gameObject);

            let mesh = null;
            switch(gameObject.type.toLowerCase()) {
                case 'cube': mesh = new Engine.Mesh({gl: this.renderer.gl}, Engine.GeometryBuilder.createBox());break;
                case 'sphere': mesh = new Engine.Mesh({gl: this.renderer.gl}, Engine.GeometryBuilder.createSphere());break;
                case 'plane': mesh = new Engine.Mesh({gl: this.renderer.gl}, Engine.GeometryBuilder.createPlane());break;
                case 'glb': {
                    const glbParser = new Engine.GLBParser({gl: this.renderer.gl}, this.camera);
                    const glb = await glbParser.loadGLB(gameObject.link);

                    const sortedMeshes = [];
                    for (const mesh of Object.values(glb.meshes)) {
                        if (!sortedMeshes[mesh[0].materialIndex]) {
                            sortedMeshes[mesh[0].materialIndex] = {meshes: [], geometries: []};
                        }

                        sortedMeshes[mesh[0].materialIndex].meshes.push(mesh[0]);
                    }

                    for (const geometry of Object.values(glb.geometries)) {
                        sortedMeshes[geometry.materialIndex].geometries.push(geometry);
                    }

                    mesh = [];
                    for (let i = 0; i < sortedMeshes.length; i++) {
                        const meshData = glbParser.ConvertToFlatMesh(sortedMeshes[i]);
                        mesh[i] = new Engine.Mesh({gl: this.renderer.gl}, meshData);
                    }
                    break;
                }
                case 'camera': mesh = new Engine.Mesh({gl: this.renderer.gl}, Engine.GeometryBuilder.createCone());break;
            }

            if (!mesh) return;

            if (mesh.length > 1) {
                for (let i = 0; i < mesh.length; i++) {
                    const pos = gameObject.transform.position;
                    const rot = gameObject.transform.rotation;
                    const scl = gameObject.transform.scale;
                        
                    mesh[i].position = new Engine.Vec3(pos.x, pos.y, pos.z);
                    mesh[i].rotation = new Engine.Vec3(rot.x, rot.y, rot.z);
                    mesh[i].scale = new Engine.Vec3(scl.x, scl.y, scl.z);
                    mesh[i].id = gameObject.id;
                    mesh[i].material_id = i;

                    if (this.scene.objects) {
                        this.scene.objects.push(mesh[i]);
                    } else {
                        this.scene.objects = [];
                        this.scene.objects.push(mesh[i]);
                    }
                }

                return mesh.length;
            }
            else {
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
                        mesh.rotation = new Engine.Vec3(deg2rad(rot.x), deg2rad(rot.y), deg2rad(rot.z));
                        mesh.scale = new Engine.Vec3(scl.x, scl.y, scl.z);
                        mesh.id = gameObject.id;

                        mesh.updateMatrix();
            
                        this.scene.objects[i] = mesh;
                    }
                }
            }
        }
    }

    updateComponent(currentObject, component, index) {
        //console.log(currentObject, component, index);

        if (this.scene) {
            const id = currentObject.id;
            if (id == -1) return;

            for (let i = 0; i < this.scene.objects.length; i++) {
                const mesh = this.scene.objects[i];
                if (this.scene.objects[i].id == id) {
                    if (component.type == "MeshRenderer") {
                        if (component.lenMeshes) {
                            for (let i = 0; i < component.lenMeshes; i++) {
                                mesh.materialType = component.materials[i].material;
                                if (AssetManager.getAssetById(component.materials[i].materialDefinition.diffuseTexture) && mesh.material_id == i) {
                                    mesh.setTexture(AssetManager.getAssetById(component.materials[i].materialDefinition.diffuseTexture).dataUrl, component.materials[i].material == "transparent" ? 1:0);
                                }
                            }
                        }
                        else {
                            mesh.materialType = component.material;
                            if (AssetManager.getAssetById(component.materialDefinition.diffuseTexture)) {
                                mesh.setTexture(AssetManager.getAssetById(component.materialDefinition.diffuseTexture).dataUrl, component.material == "transparent" ? 1:0);
                            }
                            console.log(mesh)
                        }
                    }
                }
            }
        }
    }
    
    removeGameObject(gameObject) {
        if (this.scene) {
            const index = gameObject.id;
            if (index !== -1) {
                for (let i = 0; i < this.scene.objects.length; i++) {
                    if (this.scene.objects[i].id == index) {
                        this.scene.objects.splice(i, 1);
                    }
                }
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

    async loadScene(scene) {
        for(const object of scene) {
            for(const component of object.components) {
                switch (component.type) {
                    case 'MeshRenderer': {
                        object.type = component.mesh;
                        if (component.glbfile) {
                            const file = new Uint8Array(component.glbfile.bytes);
                            const blob = new Blob([file], { type: component.glbfile.type });
                            const url = URL.createObjectURL(blob);

                            object.link = url;
                        }
                        break;
                    }

                    case 'Camera': object.type = 'Camera';
                }
            }

            await this.addGameObject(object);
            this.updateGameObject(object);
        }

        for(const object of scene) {
            for(const component of object.components) {
                this.updateComponent(object, component);
            }
        }
    }
}

function deg2rad(x) {
        return x * (3.14 / 180);
}
