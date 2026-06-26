// Orbit camera controlls for Engine //

let isMouseLocked = false;
let isRightDragging = false;
let isMiddleDragging = false;
let lastX = 0;
let lastY = 0;
let currentCamera = null;

let inputkeys = new Set();

export function setCurrentCamera(camera) {
    currentCamera = camera;
}

export function getKeys() {
    return { isKeyPressed: (key) => inputkeys.has(key) };
}

export function OrbitInit() {
    canvas.onmousedown = (e) => {
        if (isMouseLocked) return;
            
        //console.log('Mouse button pressed:', e.button);
        if (e.button === 2) { // Right mouse button - rotate camera
            isRightDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
            e.preventDefault();
            canvas.style.cursor = 'grabbing';
        } else if (e.button === 1) { // Middle mouse button - pan camera
            isMiddleDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
            e.preventDefault();
            canvas.style.cursor = 'move';
        }
        return false;
    };
        
    canvas.onmouseup = (e) => {
        if (isMouseLocked) return;
            
        if (e.button === 2) {
            isRightDragging = false;
            canvas.style.cursor = 'default';
        } else if (e.button === 1) {
            isMiddleDragging = false;
            canvas.style.cursor = 'default';
        }
    };

    // Mouse movement for locked mode
    canvas.onmousemove = (e) => {
        if (isMouseLocked) {
            // Use movementX/Y for locked mouse movement
            const deltaX = e.movementX || 0;
            const deltaY = e.movementY || 0;
                
            if (deltaX !== 0 || deltaY !== 0) {
                rotateCameraWithMouseMovement(currentCamera, deltaX, deltaY);
            }
        } else {
            // Original Unity-style camera controls for unlocked mode
            if (isRightDragging && currentCamera) {
                const deltaX = e.clientX - lastX;
                const deltaY = e.clientY - lastY;
                    
                rotateCameraWithMouse(currentCamera, deltaX, deltaY);
                    
                lastX = e.clientX;
                lastY = e.clientY;
            } else if (isMiddleDragging && currentCamera) {
                const deltaX = e.clientX - lastX;
                const deltaY = e.clientY - lastY;
                    
                panCameraWithMouse(currentCamera, deltaX, deltaY);
                    
                lastX = e.clientX;
                lastY = e.clientY;
            }
        }
    };

    document.addEventListener("keydown", (e) => {
        inputkeys.add(e.key.toLowerCase());
    });

    document.addEventListener("keyup", (e) => {
        inputkeys.delete(e.key.toLowerCase());
    });
}

function panCameraWithMouse(camera, deltaX, deltaY) {
    if (!camera) return;
        
    const panSpeed = 0.01;
        
    // Get camera's right and up vectors
    const forward = camera.target.sub(camera.position).normalize();
    const right = forward.cross(camera.up).normalize();
    const up = right.cross(forward).normalize();
        
    // Calculate pan movement
    const panMovement = right.mul(-deltaX * panSpeed).add(up.mul(deltaY * panSpeed));
        
    // Move both camera position and target
    camera.position = camera.position.add(panMovement);
    camera.target = camera.target.add(panMovement);
}

function rotateCameraWithMouseMovement(camera, deltaX, deltaY) {
    if (!camera) {
        console.log('No editor camera for mouse movement rotation');
        return;
    }
        
    console.log('Rotating camera with mouse movement:', deltaX, deltaY);
        
    // First-person style rotation using mouse sensitivity
    const yaw = -deltaX * this.mouseSensitivity;
    const pitch = deltaY * this.mouseSensitivity; // Reversed Y axis for natural feel
        
    // Get current camera direction
    const forward = camera.target.sub(camera.position).normalize();
    const right = forward.cross(camera.up).normalize();
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
    const newForward = new Engine.Vec3(
        Math.sin(newYaw) * Math.cos(newPitch),
        -Math.sin(newPitch),
        Math.cos(newYaw) * Math.cos(newPitch)
    );
        
    // Update camera target to maintain same distance
    const distance = camera.position.distance(camera.target);
    camera.target = camera.position.add(newForward.mul(distance));
}

function rotateCameraWithMouse(camera, deltaX, deltaY) {
    if (!camera) {
        console.log('No editor camera for rotation');
        return;
    }
        
    const rotationSpeed = 0.005;
        
    // Get the distance from camera to target
    const distance = camera.position.distance(camera.target);
    const currentOffset = camera.position.sub(camera.target);
        
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
    const newOffset = new Engine.Vec3(
        horizontalDistance * Math.sin(newYaw),
        verticalDistance,
        horizontalDistance * Math.cos(newYaw)
    );
        
    // Update camera position
    camera.position = camera.target.add(newOffset);
}
