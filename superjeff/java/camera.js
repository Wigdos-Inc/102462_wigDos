// Camera follows Jeff (mascotGroup)
const cameraDistance = 10;  // Distance behind Jeff
const cameraHeight = 5;     // Height above Jeff

// Camera Position
camera.position.set(0, 5, 15);

// Update function to handle both mouse and keyboard controls
function updateCameraRotation() {
    // Handle keyboard input (arrow keys)
    if (keyState.left) {
        mouseX += cameraSpeed;  // Rotate left
    }
    if (keyState.right) {
        mouseX -= cameraSpeed;  // Rotate right
    }
    if (keyState.up) {
        mouseY += cameraSpeed;  // Rotate up (pitch)
    }
    if (keyState.down) {
        mouseY -= cameraSpeed;  // Rotate down (pitch)
    }

    const jeffPosition = mascotGroup.position;
    camera.position.x = jeffPosition.x + Math.sin(mouseX) * cameraDistance;
    camera.position.y = jeffPosition.y + mouseY * cameraHeight + 5; // Keep above Jeff
    camera.position.z = jeffPosition.z + Math.cos(mouseX) * cameraDistance;

    // Handle mouse movement (based on mouseX and mouseY)
    //camera.rotation.y += mouseX * cameraSpeed;  // Rotate horizontally based on mouse
    //camera.rotation.x += mouseY * cameraSpeed;  // Rotate vertically based on mouse

    // Optionally, clamp vertical rotation to avoid flipping the camera
    //camera.rotation.x = Math.max(Math.min(camera.rotation.x, Math.PI / 2), -Math.PI / 2);
}