// Controls
let keys = { left: false, right: false, up: false, down: false, jump: false };

const keyState = {
    left: false,
    right: false,
    up: false,
    down: false,
};

// Mouse controls for camera rotation
let mouseX = 0;
let mouseY = 0;
let prevMouseX = 0;
let prevMouseY = 0;
let cameraSpeed = 0.1; // Speed of camera rotation (can be adjusted)

window.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {keyState.left = true;}
    if (event.key === 'ArrowRight') {keyState.right = true;}
    if (event.key === 'ArrowUp') {keyState.up = true;}
    if (event.key === 'ArrowDown') {keyState.down = true;}

    if (event.key === 'p' || event.key === 'P') levelCompleted = true;   // 'A' for left
    if (event.key === 'a' || event.key === 'A') keys.left = true;   // 'A' for left
    if (event.key === 'd' || event.key === 'D') keys.right = true;  // 'D' for right
    if (event.key === 'w' || event.key === 'W') keys.up = true;     // 'W' for up
    if (event.key === 's' || event.key === 'S') keys.down = true;   // 'S' for down
    if (event.key === ' ' && !keys.jump) {
        keys.jump = true;
        // Play the jump sound effect when Jeff jumps
        jumpSound.currentTime = 0;  // Rewind to start of the audio
        jumpSound.play();
    }
});

window.addEventListener('keyup', (event) => {
    if (event.key === 'ArrowLeft') {keyState.left = false;}
    if (event.key === 'ArrowRight') {keyState.right = false;}
    if (event.key === 'ArrowUp') {keyState.up = false;}
    if (event.key === 'ArrowDown') {keyState.down = false;}

    if (event.key === 'a' || event.key === 'A') keys.left = false;
    if (event.key === 'd' || event.key === 'D') keys.right = false;
    if (event.key === 'w' || event.key === 'W') keys.up = false;
    if (event.key === 's' || event.key === 'S') keys.down = false;
    if (event.key === ' ') keys.jump = false;
});

// Handle mouse movement
window.addEventListener('mousemove', function(event) {
    // Calculate mouse position relative to the center of the screen
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;  // Normalized to -1 to 1
    mouseY = -(event.clientY / window.innerHeight) * 2 + 1; // Normalized to -1 to 1
});