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

function isMobile() {
  return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

const joystick_L = document.getElementById('joystick-base');
const joystick_L_THUMB = document.getElementById('joystick-thumb');
const jumpMobile = document.getElementById('jumpMobile');

let onMobile = true;
if (!isMobile()){
    joystick_L.style.display = 'none';
    jumpMobile.style.display = 'none';
    onMobile = false;
}

// Handle mouse movement
window.addEventListener('mousemove', function(event) {
    if(!onMobile){
        mouseX = (event.clientX / window.innerWidth) * 2 - 1;  // Normalized to -1 to 1
        mouseY = -(event.clientY / window.innerHeight) * 2 + 1; // Normalized to -1 to 1
    }
});

const maxDist = 50;
let dragging = false, origin = {}, delta = {x: 0, y: 0};

function getInput() {
    return { x: delta.x / maxDist, y: delta.y / maxDist };
}

function  updateJoystick(touch) {
    let dx = touch.clientX - origin.x;
    let dy = touch.clientY - origin.y;
    let dist = Math.min(Math.hypot(dx, dy), maxDist);
    let angle = Math.atan2(dy, dx);
    delta.x = dist * Math.cos(angle);
    delta.y = dist * Math.sin(angle);
    joystick_L_THUMB.style.transition = '0s';
    joystick_L_THUMB.style.transform = `translate(calc(-50% + ${delta.x}px), calc(-50% + ${delta.y}px))`;
}

joystick_L.addEventListener('touchstart', e => {
    e.preventDefault();
    dragging = true;
    let rect = joystick_L.getBoundingClientRect();
    origin = { x: rect.left + rect.width/2, y: rect.top + rect.height/2 };
    updateJoystick(e.touches[0]);
});

joystick_L.addEventListener('touchmove', e => {
    if (!dragging) return;
    e.preventDefault();
    updateJoystick(e.touches[0]);
});

joystick_L.addEventListener('touchend', () => {
    dragging = false;
     delta = { x: 0, y: 0 };
    joystick_L_THUMB.style.transition = '0.3s';
    joystick_L_THUMB.style.transform = 'translate(-50%, -50%)';
});

jumpMobile.addEventListener('touchstart', () => {
    if (!onMobile){return;}
    keys.jump = true;
    jumpSound.currentTime = 0;
    jumpSound.play();
});
jumpMobile.addEventListener('touchend', () => {
    if (!onMobile){return;}
    keys.jump = false;
});

function updateInputs(){
    if (!onMobile){return;}
    const input = getInput();

    if (input.x < -0.2) keys.left = true;
    else if (input.x > 0.2) keys.right = true;
    if (input.y < -0.2) keys.up = true;
    else if (input.y > 0.2) keys.down = true;
    else{
        keys.up = false;
        keys.down = false;
        keys.right = false;
        keys.left = false;
    }
}