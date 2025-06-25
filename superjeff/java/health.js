// Marbles (Array of small spheres)
const marbles = [];
function createMarble() {
    const marbleGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const marbleMaterial = new THREE.MeshStandardMaterial({ color: 0x0000ff });
    const marble = new THREE.Mesh(marbleGeometry, marbleMaterial);
    marble.position.set(mascotGroup.position.x, mascotGroup.position.y + 1, mascotGroup.position.z);  // Start at Jeff's position
    scene.add(marble);
    marbles.push(marble);
}

// Scattering Marbles
function scatterMarbles() {
    marbles.forEach(marble => {
        const direction = new THREE.Vector3(
            Math.random() * 2 - 1,
            Math.random() * 2 - 1,
            Math.random() * 2 - 1
        ).normalize();
        marble.velocity = direction.multiplyScalar(0.2);  // Give them some initial speed
    });
}

// Create initial marbles
for (let i = 0; i < 5; i++) {
    createMarble();
}