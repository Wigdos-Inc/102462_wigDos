// Scene Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting
const light = new THREE.AmbientLight(0x777777); // Ambient light
scene.add(light);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(0, 10, 5);
scene.add(directionalLight);

const canvas = renderer.domElement;
canvas.style.position = 'fixed';  // or 'absolute'
canvas.style.top = '0';
canvas.style.left = '0';
canvas.style.zIndex = '1';  // LOW z-index, so your joystick can be above
canvas.style.pointerEvents = 'none';  // or 'none' if you want to block pointer on canvas
document.body.appendChild(canvas); // if you haven’t appended it yet
