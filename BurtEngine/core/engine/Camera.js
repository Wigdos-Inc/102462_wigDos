import {Vec3} from './Vec3.js';
import {Mat4} from './Mat4.js';

export class Camera {
  constructor() {
    this.position = new Vec3(0, 5, 10);
    this.target = new Vec3(0, 0, 0);
    this.up = new Vec3(0, 1, 0);
    this.fov = Math.PI / 3;
    this.aspect = 1;
    this.near = 0.1;
    this.far = 1000;
  }
  
  lookAt(target) {
    this.target = target;
  }
  
  getViewMatrix() {
    return Mat4.lookAt(this.position, this.target, this.up);
  }
  
  getProjectionMatrix() {
    return Mat4.perspective(this.fov, this.aspect, this.near, this.far);
  }
}

export class FreeCamera {
    constructor() {
        this.position = new Vec3(0, 5, 10);
        this.target = new Vec3(0, 0, 0);
        this.up = new Vec3(0, 1, 0);
        
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
            const forward = this.target.sub(this.position).normalize();
            this.position = this.position.add(forward.mul(speed));
            this.target = this.target.add(forward.mul(speed));
        }
        
        if (input.isKeyPressed('s') || input.isKeyPressed('S')) {
            const backward = this.position.sub(this.target).normalize();
            this.position = this.position.add(backward.mul(speed));
            this.target = this.target.add(backward.mul(speed));
        }
        
        if (input.isKeyPressed('a') || input.isKeyPressed('A')) {
            const forward = this.target.sub(this.position).normalize();
            const right = forward.cross(this.up).normalize();
            this.position = this.position.sub(right.mul(speed));
            this.target = this.target.sub(right.mul(speed));
        }
        
        if (input.isKeyPressed('d') || input.isKeyPressed('D')) {
            const forward = this.target.sub(this.position).normalize();
            const right = forward.cross(this.up).normalize();
            this.position = this.position.add(right.mul(speed));
            this.target = this.target.add(right.mul(speed));
        }
        
        // Q and E for up/down movement
        if (input.isKeyPressed('q') || input.isKeyPressed('Q')) {
            this.position = this.position.add(this.up.mul(speed));
            this.target = this.target.add(this.up.mul(speed));
        }
        
        if (input.isKeyPressed('e') || input.isKeyPressed('E')) {
            this.position = this.position.sub(this.up.mul(speed));
            this.target = this.target.sub(this.up.mul(speed));
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
        return Mat4.lookAt(this.position, this.target, this.up);
    }
    
    // Get projection matrix
    getProjectionMatrix(aspect) {
        if (this.orthographic) {
            const size = 10 / this.zoom;
            return Mat4.orthographic(
                -size * aspect, size * aspect,
                -size, size,
                this.near, this.far
            );
        } else {
            return Mat4.perspective(this.fov, aspect, this.near, this.far);
        }
    }
}
