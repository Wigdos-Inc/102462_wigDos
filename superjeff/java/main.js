const jumpSound = document.getElementById('jumpSound');
const gameover_audio = document.getElementById('gameover_aud');
// Movement Variables
let playerSpeed = 0.1;
let playerVelocity = new THREE.Vector3();
let gravity = -0.05;
let jumpForce = 1;

let isGameOver = false;

// Define initial rotation speed (for smooth turning)
const rotationSpeed = 0.1; // Adjust this value for more or less rotation speed

// Add a rotation target variable to keep track of the desired rotation angle
let targetRotationY = 0; // Initially, Jeff faces forward (0 radians)

// Goomba movement variables
let goombaSpeed = 0.05;
let goombaDirection = 1;  // 1 means moving right, -1 means moving left

// Player Lives
let lives = 3;
let gameOver = false;

checkLevel(true);
unloadLevel();
// Update Function
function update() {
    updateInputs();
    playBackgroundMusic();
    if (gameOver) return;

    checkLevel(false);

    // Horizontal Movement
    if (keys.left) mascotGroup.position.x -= playerSpeed;
    if (keys.right) mascotGroup.position.x += playerSpeed;

    //if (keys.left) mascotGroup.rotation.y = Math.PI;  // Rotate left
    //if (keys.right) mascotGroup.rotation.y = 0;       // Rotate right

    // Horizontal Movement
    if (keys.left) {
        mascotGroup.position.x -= playerSpeed;
        //mascotGroup.rotation.y = -45;  // Rotate left
        targetRotationY = Math.PI / -2;
    }
    if (keys.right) {
        mascotGroup.position.x += playerSpeed;
        //mascotGroup.rotation.y = 45;       // Rotate right
        targetRotationY = Math.PI / 2;
    }
    if (keys.up) {
        mascotGroup.position.x -= playerSpeed;
        //mascotGroup.rotation.y = Math.PI;  // Rotate left
        targetRotationY = Math.PI / 1;
    }
    if (keys.down) {
        mascotGroup.position.x += playerSpeed;
        //mascotGroup.rotation.y = 0;       // Rotate right
        targetRotationY = Math.PI / 180;
    }

    // Update rotation smoothly using lerp (Linear Interpolation)
    //targetRotationY = Math.PI / 1;
    mascotGroup.rotation.y = THREE.MathUtils.lerp(mascotGroup.rotation.y, targetRotationY, rotationSpeed);

    // Z-axis Movement
    if (keys.up) mascotGroup.position.z -= playerSpeed; // Move forward
    if (keys.down) mascotGroup.position.z += playerSpeed; // Move backward

    // Jumping
    if (keys.jump && isColliding) {
        playerVelocity.y = jumpForce;
    }

    // Apply gravity
    playerVelocity.y += gravity;
    mascotGroup.position.y += playerVelocity.y;

    // Simple ground collision
    //if (mascotGroup.position.y <= 1) {
    //    mascotGroup.position.y = 1;
    //    playerVelocity.y = 0;
    //}

    // Check for collision with the platform and keep Jeff grounded
    checkPlatformCollision();

    // Check if Jeff is on the ground or a platform
    //checkGround();

    // Check for falling off the platform (fall below y = -5)
    if (mascotGroup.position.y < -50) { // Jeff falls off the platform
        scatterMarbles();
        lives--;
        if (lives <= 0) {
            gameOver = true;
            document.getElementById('gameover').style.display = 'block';
        } else {
            mascotGroup.position.set(0, 1, 0); // Reset position to start point
        }
    }

    // Goomba Movement
    goombaGroup.position.x += goombaSpeed * goombaDirection;
    if (goombaGroup.position.x >= 9 || goombaGroup.position.x <= 1) {
        goombaDirection *= -1;  // Reverse direction when hitting the edge
    }

    // Check for collision between mascot and goomba (simple bounding box check)
    if (mascotGroup.position.x < goombaGroup.position.x + 0.5 &&
        mascotGroup.position.x > goombaGroup.position.x - 0.5 &&
        mascotGroup.position.y < goombaGroup.position.y + 1 &&
        mascotGroup.position.y + 5 > goombaGroup.position.y - 1) {
        // Jeff is hit by a goomba, scatter marbles
        scatterMarbles();
        lives--;
        if (lives <= 0) {
            gameOver = true;
            document.getElementById('gameover').style.display = 'block';
            gameover_audio.play();
        } else {
            mascotGroup.position.set(0, 1, 0); // Reset position to start point
        }
    }

    if(flagGroup.children[0] && !levelCompleted){
        if (mascotGroup.position.x < flagGroup.children[0].position.x + 0.5 &&
            mascotGroup.position.x > flagGroup.children[0].position.x - 0.5 &&
            mascotGroup.position.y < flagGroup.children[0].position.y + 1 &&
            mascotGroup.position.y + 5 > flagGroup.children[0].position.y - 1) {
            levelCompleted = true;
        }
    }

    // Set camera position behind and above Jeff
    //const jeffPosition = mascotGroup.position;
    //camera.position.x = jeffPosition.x + Math.sin(mouseX) * cameraDistance;
    //camera.position.y = jeffPosition.y + cameraHeight; // Keep above Jeff
    //camera.position.z = jeffPosition.z + Math.cos(mouseX) * cameraDistance;
            
    camera.lookAt(mascotGroup.position);

    updateCameraRotation();  // Update camera rotation based on inputs

    // Render Scene
    renderer.render(scene, camera);
}

// Restart the game
window.addEventListener('keydown', (event) => {
    if (event.key === 'r' || event.key === 'R') {
        gameOver = false;
        lives = 3;
        mascotGroup.position.set(0, 1, 0);
        goombaGroup.position.set(5, 1, 0);
        document.getElementById('gameover').style.display = 'none';
        // Clear marbles and reset them
        marbles.forEach(marble => {
            scene.remove(marble);
        });
        marbles.length = 0;
        for (let i = 0; i < 5; i++) {
            createMarble();
        }
    }
});

// Animation Loop
function animate() {
    requestAnimationFrame(animate);
    update();
}

// Resize handling
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});

animate();
