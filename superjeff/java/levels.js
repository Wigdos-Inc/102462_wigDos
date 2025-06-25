let currentLevel = 0; // Track the current level
let levelCompleted = false;

function loadAndResizeImage(imageUrl, size) {
    const image = new Image();
    image.src = imageUrl;

    return new Promise((resolve) => {
        image.onload = () => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = size;
            canvas.height = size;
            // Draw the image onto the canvas (this will scale it to fit the square canvas)
            context.drawImage(image, 0, 0, size, size);
            resolve(canvas);
        };
    });
}

function showLoadingScreen() {
    document.getElementById('loadingScreen').style.display = 'block';
}

function hideLoadingScreen() {
    document.getElementById('loadingScreen').style.display = 'none';
}

// Function to unload the current level
function unloadLevel() {
    // Traverse through all objects in the scene
    scene.children.forEach(function (child) {
        if (child instanceof THREE.Mesh) {
            // Remove mesh objects from the scene
            if(child.parent){
                child.parent.remove(child);
            }
            scene.remove(child);
        }
    });

    // Optionally, reset any level-specific variables (e.g., player speed, mascot, goomba positions)
    playerSpeed = 0;      // Reset player speed to default
    goombaSpeed = 0;      // Reset goomba speed to default
    mascotGroup.position.set(0, -100, 0);  // Move mascot off-screen
    goombaGroup.position.set(0, -100, 0);  // Move goomba off-screen

    // Optionally, if you have other groups like physics objects or animations, clear them as well
    // e.g., reset any physics engines, animations, etc.

     // If you have any specific cleanup for textures, sounds, etc., handle it here
     // Example: if there are textures loaded dynamically, you might want to dispose of them
    // Example: if you have any loaded assets or sounds, stop them and clear references
}

// Function to load the Jungle level (Easy)
function loadJungleLevel() {
    // Remove all existing objects in the scene
    unloadLevel();
    
    // Set up the skybox
    // Example usage: Resize the images to 1024x1024
    const size = 1024;
    const loader = new THREE.CubeTextureLoader();
    const texture = loader.load([
        loadAndResizeImage('https://upload.wikimedia.org/wikipedia/commons/b/be/Bliss_location%2C_Sonoma_Valley_in_2006.jpg', size),
        loadAndResizeImage('https://upload.wikimedia.org/wikipedia/commons/b/be/Bliss_location%2C_Sonoma_Valley_in_2006.jpg', size),
        loadAndResizeImage('https://upload.wikimedia.org/wikipedia/commons/b/be/Bliss_location%2C_Sonoma_Valley_in_2006.jpg', size),
        loadAndResizeImage('https://upload.wikimedia.org/wikipedia/commons/b/be/Bliss_location%2C_Sonoma_Valley_in_2006.jpg', size),
        loadAndResizeImage('https://upload.wikimedia.org/wikipedia/commons/b/be/Bliss_location%2C_Sonoma_Valley_in_2006.jpg', size),
        loadAndResizeImage('https://upload.wikimedia.org/wikipedia/commons/b/be/Bliss_location%2C_Sonoma_Valley_in_2006.jpg', size)
    ]);

    // Disable mipmaps
    texture.generateMipmaps = false;

    // Set the skybox background
    scene.background = texture;

    // Create ground and multiple platforms with varying heights
    createTerrain();

    // Add jungle-themed obstacles and environment (trees, plants, waterfalls, etc.)
    addJungleObstacles();

    // Set player speed and other difficulty-related parameters for the Jungle level
    playerSpeed = 0.1;  // Easy speed
    goombaSpeed = 0.05; // Slow enemies

    // Set up Jeff and other entities in the Jungle environment
    mascotGroup.position.set(0, 1, 0); // Starting on the first platform
    goombaGroup.position.set(5, 1, 0); // Positioned on the second platform

    scene.add(mascotGroup);  // Add mascot to the scene
    scene.add(goombaGroup);  // Add goomba to the scene
}

// Function to create terrain with multiple floors and platforms
function createTerrain() {
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 }); // Jungle green
    const platformMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Wood brown

    // Create a large base floor (main ground)
    const largeFloorGeometry = new THREE.BoxGeometry(40, 1, 40);
    const largeFloor = new THREE.Mesh(largeFloorGeometry, floorMaterial);
    largeFloor.position.y = -1;
    scene.add(largeFloor);

    // Platform 1 (ground level)
    const platform1 = new THREE.Mesh(new THREE.BoxGeometry(6, 1, 6), platformMaterial);
    platform1.position.set(0, 1, 0);
    scene.add(platform1);

    // Platform 2 (slightly elevated)
    const platform2 = new THREE.Mesh(new THREE.BoxGeometry(6, 1, 6), platformMaterial);
    platform2.position.set(5, 3, 5);
    scene.add(platform2);

    // Platform 3 (higher up)
    const platform3 = new THREE.Mesh(new THREE.BoxGeometry(6, 1, 6), platformMaterial);
    platform3.position.set(-5, 5, -5);
    scene.add(platform3);

    // A raised platform in the far distance
    const platform4 = new THREE.Mesh(new THREE.BoxGeometry(6, 1, 6), platformMaterial);
    platform4.position.set(10, 7, -10);
    scene.add(platform4);

    // Bridge or Ramp (from platform1 to platform2)
    const rampGeometry = new THREE.BoxGeometry(1, 0.5, 3);
    const ramp = new THREE.Mesh(rampGeometry, platformMaterial);
    ramp.position.set(2.5, 2, 2.5);
    ramp.rotation.x = Math.PI / 4;
    scene.add(ramp);
}

// Function to add jungle obstacles (trees, rocks, waterfalls, etc.)
function addJungleObstacles() {
    // Trees
    const treeGeometry = new THREE.CylinderGeometry(0.5, 1, 5, 8);
    const treeMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    
    // Add trees at various points
    const tree1 = new THREE.Mesh(treeGeometry, treeMaterial);
    tree1.position.set(4, 2.5, 4);
    scene.add(tree1);

    const tree2 = new THREE.Mesh(treeGeometry, treeMaterial);
    tree2.position.set(-4, 2.5, -4);
    scene.add(tree2);

    // Add bushes or smaller plants
    const plantGeometry = new THREE.CylinderGeometry(0.3, 0.5, 1, 8);
    const plantMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
    const plant = new THREE.Mesh(plantGeometry, plantMaterial);
    plant.position.set(-6, 1, 6);
    scene.add(plant);

    // Waterfall (with flowing water effect)
    const waterfallGeometry = new THREE.CylinderGeometry(1, 1, 10, 32);
    const waterfallMaterial = new THREE.MeshStandardMaterial({ color: 0x1E90FF, transparent: true, opacity: 0.6 });
    const waterfall = new THREE.Mesh(waterfallGeometry, waterfallMaterial);
    waterfall.position.set(8, 5, -8);
    waterfall.rotation.x = Math.PI / 2;
    scene.add(waterfall);

    // Rocks (as obstacles or environmental objects)
    const rockGeometry = new THREE.SphereGeometry(1, 8, 8);
    const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
    rock.position.set(6, 1, -3);
    scene.add(rock);

    const rock2 = new THREE.Mesh(rockGeometry, rockMaterial);
    rock2.position.set(-8, 1, 8);
    scene.add(rock2);
}

// Function to load the Wild West level (Medium)
function loadWildWestLevel() {
    // Remove all existing objects in the scene
    unloadLevel();

    // Set up the floor
    const floorGeometry = new THREE.BoxGeometry(20, 1, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xC0C0C0 }); // Desert-like ground
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.position.y = -1;
    scene.add(floor);

    // Add Wild West-themed obstacles (cacti, rocks, etc.)
    const cactusGeometry = new THREE.CylinderGeometry(0.2, 0.5, 3, 8);
    const cactusMaterial = new THREE.MeshStandardMaterial({ color: 0x006400 });
    const cactus = new THREE.Mesh(cactusGeometry, cactusMaterial);
    cactus.position.set(2, 1.5, 3);
    scene.add(cactus);

    // Set player speed and enemy speed for the Wild West level
    playerSpeed = 0.15;  // Medium speed
    goombaSpeed = 0.1;   // Medium speed for enemies

    // Set up Jeff and other entities in the Wild West environment
    mascotGroup.position.set(0, 1, 0);
    goombaGroup.position.set(5, 1, 0);

    mascotGroup.position.set(0, 1, 0);
    goombaGroup.position.set(5, 1, 0);
    scene.add(mascotGroup);  // Ensure mascot is added
    scene.add(goombaGroup);  // Ensure goomba is added
}

// Function to load the Toy level (Hard)
function loadToyLevel() {
    // Remove all existing objects in the scene
    unloadLevel();

    // Set up the floor
    const floorGeometry = new THREE.BoxGeometry(20, 1, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD700 }); // Toy-like ground
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.position.y = -1;
    scene.add(floor);

    // Add Toy-themed obstacles (giant toys, building blocks, etc.)
    const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
    const blockMaterial = new THREE.MeshStandardMaterial({ color: 0xFF6347 });
    const block = new THREE.Mesh(blockGeometry, blockMaterial);
    block.position.set(3, 0.5, 3);
    scene.add(block);

    // Set player speed and enemy speed for the Toy level
    playerSpeed = 0.2;  // Fast player speed
    goombaSpeed = 0.2;  // Fast enemies

    // Set up Jeff and other entities in the Toy environment
    mascotGroup.position.set(0, 1, 0);
    goombaGroup.position.set(5, 1, 0);

    mascotGroup.position.set(0, 1, 0);
    goombaGroup.position.set(5, 1, 0);
    scene.add(mascotGroup);  // Ensure mascot is added
    scene.add(goombaGroup);  // Ensure goomba is added
}

function changeLevel(level) {
    showLoadingScreen(); // Show loading screen
    setTimeout(() => {  // Wait for a brief moment before loading the next level
        if (level === 1) {
            loadJungleLevel();
        } else if (level === 2) {
            loadWildWestLevel();
        } else if (level === 3) {
            loadToyLevel();
        }

        hideLoadingScreen(); // Hide loading screen after level setup
    }, 1000); // Simulate loading delay (1 second)
}

function checkLevel(force){
    // Example of progressing levels after the player dies or completes a level:
    if (lives <= 0) {
        gameOver = true;
        document.getElementById('gameover').style.display = 'block';
    } else if(levelCompleted || force){
        levelCompleted = false;
        currentLevel++;  // Move to the next level
        if (currentLevel > 3) {
            currentLevel = 1; // Restart from level 1
        }
        changeLevel(currentLevel);
    }
}