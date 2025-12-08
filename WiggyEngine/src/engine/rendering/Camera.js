/**
 * Scene Camera - Handles camera positioning and projection for 3D/2D rendering
 */
class Camera {
    constructor() {
        this.position = new Vector3(0, 5, 10);
        this.target = new Vector3(0, 0, 0);
        this.up = new Vector3(0, 1, 0);
        
        // 3D settings
        this.fov = 45;
        this.near = 0.1;
        this.far = 1000;
        
        // 2D settings
        this.zoom = 1;
        this.orthographic = false;
        
        // Editor controls
        this.movementSpeed = 10;
        this.rotationSpeed = 1;
        this.isControlled = false;
    }
    
    // Update camera for editor controls
    update(deltaTime, input) {
        if (!this.isControlled) return;
        
        const speed = this.movementSpeed * deltaTime;
        
        // WASD movement for Unity-style scene view
        if (input.isKeyPressed('w') || input.isKeyPressed('W')) {
            const forward = this.target.subtract(this.position).normalize();
            this.position = this.position.add(forward.multiply(speed));
            this.target = this.target.add(forward.multiply(speed));
        }
        
        if (input.isKeyPressed('s') || input.isKeyPressed('S')) {
            const backward = this.position.subtract(this.target).normalize();
            this.position = this.position.add(backward.multiply(speed));
            this.target = this.target.add(backward.multiply(speed));
        }
        
        if (input.isKeyPressed('a') || input.isKeyPressed('A')) {
            const forward = this.target.subtract(this.position).normalize();
            const right = forward.cross(this.up).normalize();
            this.position = this.position.subtract(right.multiply(speed));
            this.target = this.target.subtract(right.multiply(speed));
        }
        
        if (input.isKeyPressed('d') || input.isKeyPressed('D')) {
            const forward = this.target.subtract(this.position).normalize();
            const right = forward.cross(this.up).normalize();
            this.position = this.position.add(right.multiply(speed));
            this.target = this.target.add(right.multiply(speed));
        }
        
        // Q and E for up/down movement
        if (input.isKeyPressed('q') || input.isKeyPressed('Q')) {
            this.position = this.position.add(this.up.multiply(speed));
            this.target = this.target.add(this.up.multiply(speed));
        }
        
        if (input.isKeyPressed('e') || input.isKeyPressed('E')) {
            this.position = this.position.subtract(this.up.multiply(speed));
            this.target = this.target.subtract(this.up.multiply(speed));
        }
    }
    
    // Set camera to look at specific position
    lookAt(target) {
        this.target = target;
    }
    
    // Move camera to position
    setPosition(position) {
        this.position = position;
    }
    
    // Get view matrix
    getViewMatrix() {
        return Matrix4.lookAt(this.position, this.target, this.up);
    }
    
    // Get projection matrix
    getProjectionMatrix(aspect) {
        if (this.orthographic) {
            const size = 10 / this.zoom;
            return Matrix4.orthographic(
                -size * aspect, size * aspect,
                -size, size,
                this.near, this.far
            );
        } else {
            return Matrix4.perspective(this.fov, aspect, this.near, this.far);
        }
    }
}