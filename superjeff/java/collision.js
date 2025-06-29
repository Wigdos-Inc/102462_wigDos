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
