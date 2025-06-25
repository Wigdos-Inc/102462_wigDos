// Collision data for Jungle Level
const jungleLevelCollisions = [
    { xMin: -10, xMax: 10, zMin: -10, zMax: 10, y: 0, width: 10, depth: 6 },
    { xMin: 3, xMax: 9, zMin: 3, zMax: 9, y: 3, width: 6, depth: 6 },
    { xMin: -5, xMax: 1, zMin: -5, zMax: 1, y: 5, width: 6, depth: 6 },
    { xMin: 8, xMax: 12, zMin: -12, zMax: -8, y: 7, width: 6, depth: 6 }
];

// Collision data for Desert Level (example)
const desertLevelCollisions = [
    { xMin: -20, xMax: 20, zMin: -15, zMax: 15, y: 0, width: 40, depth: 30 },
    { xMin: 5, xMax: 10, zMin: 5, zMax: 10, y: 2, width: 5, depth: 5 }
];

// Collision data for Waterfall Level (example)
const waterfallLevelCollisions = [
    { xMin: -10, xMax: 10, zMin: -5, zMax: 5, y: 0, width: 20, depth: 10 },
    { xMin: -5, xMax: 5, zMin: -10, zMax: -5, y: 2, width: 10, depth: 5 }
];

// Store the active level's collision data
let activeLevelCollisions = jungleLevelCollisions;  // Default to Jungle level
let isColliding = false;

// Function to check collisions with the active level's platforms
function checkPlatformCollision() {
    activeLevelCollisions.forEach(platform => {
        // Check if Jeff's position is within the platform's bounds in x and z
        if (mascotGroup.position.x > platform.xMin && mascotGroup.position.x < platform.xMax &&
            mascotGroup.position.z > platform.zMin && mascotGroup.position.z < platform.zMax) {

            // Check if Jeff is below the platform (colliding with it)
            if (mascotGroup.position.y <= platform.y) {
                mascotGroup.position.y = platform.y;  // Align Jeff on top of the platform
                playerVelocity.y = 0;  // Stop falling
                isColliding = true;
            }
            else{
                isColliding = false;
            }
        }
    });
}

function checkGround() {
    // Placeholder for platform detection logic (you can later check if mascotGroup is above any platform)
    if (mascotGroup.position.y <= 1) {
        mascotGroup.position.y = 1;  // Keep Jeff on the ground
        playerVelocity.y = 0;        // Stop falling if on ground
    }
}