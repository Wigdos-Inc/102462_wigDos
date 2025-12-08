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
    }
    
    async initialize(canvasId) {
        try {
            // Initialize renderer (using Renderer2)
            this.renderer = new Renderer2();
            await this.renderer.initialize(canvasId);
            
            // Setup editor camera
            this.setupEditorCamera();
            
            // Setup input handling
            this.setupInputHandling(canvasId);
            
            this.isInitialized = true;
            console.log('SceneEditor initialized successfully');
            
        } catch (error) {
            console.error('SceneEditor initialization failed:', error);
            throw error;
        }
    }
    
    setupEditorCamera() {
        this.editorCamera = new Camera();
        this.editorCamera.position = new Vector3(0, 5, 10);
        this.editorCamera.target = new Vector3(0, 0, 0);
        this.editorCamera.up = new Vector3(0, 1, 0);
        this.editorCamera.fov = 45;
        this.editorCamera.isControlled = true;
    }
    
    setupInputHandling(canvasId) {
        const canvas = document.getElementById(canvasId);
        
        if (!canvas) {
            console.error('❌ Canvas not found with ID:', canvasId);
            return;
        }
        
        console.log('✅ Setting up input handling for canvas:', canvas);
        console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
        console.log('Canvas position:', canvas.getBoundingClientRect());
        
        // Test basic mouse events first
        canvas.addEventListener('click', (e) => {
            console.log('🔥 Basic canvas click detected!', e);
        });
        
        // Test if canvas can receive focus
        canvas.setAttribute('tabindex', '0');
        canvas.style.outline = 'none';
        
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            this.input.keys.add(e.key.toLowerCase());
            
            // ESC key to exit mouse lock
            if (e.key === 'Escape') {
                console.log('ESC pressed - exiting mouse lock');
                this.exitMouseLock();
            }
            
            // Editor shortcuts (only when not mouse locked)
            if (!this.isMouseLocked) {
                if (e.key === 'g' && this.renderer) {
                    this.renderer.setGridVisible(!this.renderer.gridVisible);
                }
                
                if (e.key === '1') {
                    this.renderer.setRenderMode('3d');
                }
                
                if (e.key === '2') {
                    this.renderer.setRenderMode('2d');
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.input.keys.delete(e.key.toLowerCase());
        });
        
        // Mouse lock controls with multiple event handlers
        canvas.onclick = (e) => {
            console.log('🎯 Canvas onclick - event:', e);
            console.log('Requesting pointer lock on canvas:', canvas);
            e.preventDefault();
            e.stopPropagation();
            this.requestMouseLock(canvas);
            return false;
        };
        
        // Also try with mouseup for better compatibility
        canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0 && !this.isMouseLocked) { // Left click only
                console.log('🎯 Left mouse up - requesting pointer lock');
                e.preventDefault();
                e.stopPropagation();
                this.requestMouseLock(canvas);
            }
        });
        
        // Try with double-click as fallback
        canvas.addEventListener('dblclick', (e) => {
            console.log('🎯 Double click - requesting pointer lock');
            e.preventDefault();
            e.stopPropagation();
            this.requestMouseLock(canvas);
        });
        
        // Handle pointer lock change with better browser compatibility
        const handlePointerLockChange = () => {
            const lockElement = document.pointerLockElement || 
                               document.mozPointerLockElement || 
                               document.webkitPointerLockElement;
            
            this.isMouseLocked = lockElement === canvas;
            console.log('🔄 Pointer lock changed:', this.isMouseLocked);
            console.log('Lock element:', lockElement);
            
            if (this.isMouseLocked) {
                canvas.style.cursor = 'none';
                console.log('✅ Mouse locked - use mouse to look around, ESC to exit');
            } else {
                canvas.style.cursor = 'default';
                console.log('❌ Mouse unlocked');
            }
        };
        
        document.addEventListener('pointerlockchange', handlePointerLockChange);
        document.addEventListener('mozpointerlockchange', handlePointerLockChange);
        document.addEventListener('webkitpointerlockchange', handlePointerLockChange);
        
        // Handle pointer lock error with better browser compatibility
        const handlePointerLockError = () => {
            console.error('❌ Pointer lock failed!');
            this.isMouseLocked = false;
        };
        
        document.addEventListener('pointerlockerror', handlePointerLockError);
        document.addEventListener('mozpointerlockerror', handlePointerLockError);
        document.addEventListener('webkitpointerlockerror', handlePointerLockError);
        
        // Mouse movement for locked mode
        canvas.onmousemove = (e) => {
            if (this.isMouseLocked) {
                // Use movementX/Y for locked mouse movement
                const deltaX = e.movementX || 0;
                const deltaY = e.movementY || 0;
                
                if (deltaX !== 0 || deltaY !== 0) {
                    console.log('Mouse movement (locked):', deltaX, deltaY);
                    this.rotateCameraWithMouseMovement(deltaX, deltaY);
                }
            } else {
                // Original Unity-style camera controls for unlocked mode
                if (isRightDragging && this.editorCamera) {
                    const deltaX = e.clientX - lastX;
                    const deltaY = e.clientY - lastY;
                    
                    console.log('Right drag delta:', deltaX, deltaY);
                    this.rotateCameraWithMouse(deltaX, deltaY);
                    
                    lastX = e.clientX;
                    lastY = e.clientY;
                } else if (isMiddleDragging && this.editorCamera) {
                    const deltaX = e.clientX - lastX;
                    const deltaY = e.clientY - lastY;
                    
                    console.log('Middle drag delta:', deltaX, deltaY);
                    this.panCameraWithMouse(deltaX, deltaY);
                    
                    lastX = e.clientX;
                    lastY = e.clientY;
                }
            }
        };
        
        // Keep original mouse controls for when not locked
        let isRightDragging = false;
        let isMiddleDragging = false;
        let lastX = 0;
        let lastY = 0;
        
        canvas.onmousedown = (e) => {
            if (this.isMouseLocked) return;
            
            console.log('Mouse button pressed:', e.button);
            if (e.button === 2) { // Right mouse button - rotate camera
                console.log('Starting right drag');
                isRightDragging = true;
                lastX = e.clientX;
                lastY = e.clientY;
                e.preventDefault();
                canvas.style.cursor = 'grabbing';
            } else if (e.button === 1) { // Middle mouse button - pan camera
                console.log('Starting middle drag');
                isMiddleDragging = true;
                lastX = e.clientX;
                lastY = e.clientY;
                e.preventDefault();
                canvas.style.cursor = 'move';
            }
            return false;
        };
        
        canvas.onmouseup = (e) => {
            if (this.isMouseLocked) return;
            
            console.log('Mouse button released:', e.button);
            if (e.button === 2) {
                isRightDragging = false;
                canvas.style.cursor = 'default';
            } else if (e.button === 1) {
                isMiddleDragging = false;
                canvas.style.cursor = 'default';
            }
        };
        
        // Prevent right-click context menu on canvas
        canvas.oncontextmenu = (e) => {
            e.preventDefault();
            return false;
        };
        
        // Mouse wheel for Unity-style zoom
        canvas.onwheel = (e) => {
            e.preventDefault();
            console.log('Mouse wheel:', e.deltaY);
            
            if (this.editorCamera) {
                const zoomSpeed = 0.1;
                const direction = e.deltaY > 0 ? 1 : -1;
                
                // Calculate zoom direction towards/away from target
                const currentDistance = this.editorCamera.position.distance(this.editorCamera.target);
                const forward = this.editorCamera.target.subtract(this.editorCamera.position).normalize();
                
                // Calculate new distance with minimum limit
                const minDistance = 0.5;
                const maxDistance = 100;
                const newDistance = Math.max(minDistance, Math.min(maxDistance, currentDistance - (direction * zoomSpeed * currentDistance)));
                
                // Update camera position maintaining direction but changing distance
                this.editorCamera.position = this.editorCamera.target.add(forward.multiply(-newDistance));
                console.log('Zoom - new distance:', newDistance);
            }
            return false;
        };
    }
    
    // Mouse lock methods
    requestMouseLock(canvas) {
        console.log('Requesting mouse lock...');
        console.log('Canvas element:', canvas);
        console.log('Canvas has requestPointerLock:', !!canvas.requestPointerLock);
        
        // Check for browser compatibility
        if (canvas.requestPointerLock) {
            console.log('Using standard requestPointerLock');
            canvas.requestPointerLock();
        } else if (canvas.mozRequestPointerLock) {
            console.log('Using mozRequestPointerLock');
            canvas.mozRequestPointerLock();
        } else if (canvas.webkitRequestPointerLock) {
            console.log('Using webkitRequestPointerLock');
            canvas.webkitRequestPointerLock();
        } else {
            console.error('❌ Pointer lock not supported by this browser');
            alert('Pointer lock not supported by this browser');
        }
    }
    
    exitMouseLock() {
        console.log('Exiting mouse lock...');
        if (document.exitPointerLock) {
            document.exitPointerLock();
        } else if (document.mozExitPointerLock) {
            document.mozExitPointerLock();
        } else if (document.webkitExitPointerLock) {
            document.webkitExitPointerLock();
        }
        console.log('Mouse lock exit requested');
    }
    
    rotateCameraWithMouse(deltaX, deltaY) {
        if (!this.editorCamera) {
            console.log('No editor camera for rotation');
            return;
        }
        
        console.log('Rotating camera with delta:', deltaX, deltaY);
        console.log('Camera position before:', this.editorCamera.position);
        console.log('Camera target:', this.editorCamera.target);
        
        const rotationSpeed = 0.005;
        
        // Get the distance from camera to target
        const distance = this.editorCamera.position.distance(this.editorCamera.target);
        const currentOffset = this.editorCamera.position.subtract(this.editorCamera.target);
        
        // Horizontal rotation (yaw) around world Y-axis
        const yawAngle = -deltaX * rotationSpeed;
        
        // Vertical rotation (pitch) around camera's right vector
        const pitchAngle = -deltaY * rotationSpeed;
        
        // Calculate current pitch to clamp it
        const currentPitch = Math.atan2(currentOffset.y, Math.sqrt(currentOffset.x * currentOffset.x + currentOffset.z * currentOffset.z));
        const maxPitch = Math.PI / 2 - 0.1; // Prevent gimbal lock
        const minPitch = -Math.PI / 2 + 0.1;
        const newPitch = Math.max(minPitch, Math.min(maxPitch, currentPitch + pitchAngle));
        
        // Calculate new camera position using spherical coordinates
        const horizontalDistance = distance * Math.cos(newPitch);
        const verticalDistance = distance * Math.sin(newPitch);
        
        // Apply yaw rotation
        const currentYaw = Math.atan2(currentOffset.x, currentOffset.z);
        const newYaw = currentYaw + yawAngle;
        
        // Calculate new offset
        const newOffset = new Vector3(
            horizontalDistance * Math.sin(newYaw),
            verticalDistance,
            horizontalDistance * Math.cos(newYaw)
        );
        
        // Update camera position
        this.editorCamera.position = this.editorCamera.target.add(newOffset);
        console.log('Camera position after:', this.editorCamera.position);
    }
    
    rotateCameraWithMouseMovement(deltaX, deltaY) {
        if (!this.editorCamera) {
            console.log('No editor camera for mouse movement rotation');
            return;
        }
        
        console.log('Rotating camera with mouse movement:', deltaX, deltaY);
        
        // First-person style rotation using mouse sensitivity
        const yaw = -deltaX * this.mouseSensitivity;
        const pitch = deltaY * this.mouseSensitivity; // Reversed Y axis for natural feel
        
        // Get current camera direction
        const forward = this.editorCamera.target.subtract(this.editorCamera.position).normalize();
        const right = forward.cross(this.editorCamera.up).normalize();
        const up = right.cross(forward).normalize();
        
        // Calculate current pitch and yaw
        const currentPitch = Math.asin(-forward.y);
        const currentYaw = Math.atan2(forward.x, forward.z);
        
        // Apply rotation limits
        const maxPitch = Math.PI / 2 - 0.1;
        const minPitch = -Math.PI / 2 + 0.1;
        const newPitch = Math.max(minPitch, Math.min(maxPitch, currentPitch + pitch));
        const newYaw = currentYaw + yaw;
        
        // Calculate new forward direction
        const newForward = new Vector3(
            Math.sin(newYaw) * Math.cos(newPitch),
            -Math.sin(newPitch),
            Math.cos(newYaw) * Math.cos(newPitch)
        );
        
        // Update camera target to maintain same distance
        const distance = this.editorCamera.position.distance(this.editorCamera.target);
        this.editorCamera.target = this.editorCamera.position.add(newForward.multiply(distance));
        
        console.log('New camera target:', this.editorCamera.target);
    }
    
    panCameraWithMouse(deltaX, deltaY) {
        if (!this.editorCamera) return;
        
        const panSpeed = 0.01;
        
        // Get camera's right and up vectors
        const forward = this.editorCamera.target.subtract(this.editorCamera.position).normalize();
        const right = forward.cross(this.editorCamera.up).normalize();
        const up = right.cross(forward).normalize();
        
        // Calculate pan movement
        const panMovement = right.multiply(-deltaX * panSpeed).add(up.multiply(deltaY * panSpeed));
        
        // Move both camera position and target
        this.editorCamera.position = this.editorCamera.position.add(panMovement);
        this.editorCamera.target = this.editorCamera.target.add(panMovement);
    }
    
    setScene(scene) {
        this.scene = scene;
        console.log('Scene set with', scene ? scene.objects.length : 0, 'objects');
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
            this.editorCamera.update(0.016, { // Assume 60fps
                isKeyPressed: (key) => this.input.keys.has(key)
            });
        }
        
        // Render scene
        if (this.renderer && this.scene && this.editorCamera) {
            this.renderer.render(this.scene, this.editorCamera);
        }
        
        requestAnimationFrame(() => this.renderLoop());
    }
    
    // Editor API
    selectGameObject(gameObject) {
        this.selectedGameObject = gameObject;
        if (this.renderer) {
            this.renderer.selectObject(gameObject);
        }
        console.log('Selected:', gameObject ? gameObject.name : 'none');
    }
    
    addGameObject(gameObject) {
        if (this.scene) {
            this.scene.objects.push(gameObject);
        }
    }
    
    removeGameObject(gameObject) {
        if (this.scene) {
            const index = this.scene.objects.indexOf(gameObject);
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
        const targetPos = new Vector3(position.x, position.y, position.z);
        
        // Position camera to look at the object
        const distance = 10;
        const offset = new Vector3(distance, distance * 0.7, distance);
        
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