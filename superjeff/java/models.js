// Create the mascot (Jeff)
const mascotGroup = new THREE.Group();

// Body
const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 8);
const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x00bfff });
const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
body.position.y = 2;
mascotGroup.add(body);

// Head (Sphere)
const headGeometry = new THREE.SphereGeometry(0.75, 16, 16);
const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffcc00 });
const head = new THREE.Mesh(headGeometry, headMaterial);
head.position.y = 3.25;
mascotGroup.add(head);

//Nose
const noseGeometry = new THREE.CylinderGeometry(0.1, 0.1, 2, 8);
const noseMaterial = new THREE.MeshStandardMaterial({ color: 0xffcc00 });
const nose = new THREE.Mesh(noseGeometry, noseMaterial);
nose.position.set(0,3.3,0.5);
nose.rotation.x = Math.PI / 2;
mascotGroup.add(nose);

// Hair (a few small spheres)
const hairMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 }); // Brown hair color
const hair1 = new THREE.Mesh(new THREE.CylinderGeometry(0.0, 0.2, 2, 8), hairMaterial);
hair1.position.set(0, 4.5, 0.6);
hair1.rotation.set(Math.PI / 5,0,0);
mascotGroup.add(hair1);

// Eyes (White spheres)
const eyeGeometry = new THREE.SphereGeometry(0.1, 16, 16);
const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
leftEye.position.set(-0.2, 3.5, 0.6);
rightEye.position.set(0.2, 3.5, 0.6);
mascotGroup.add(leftEye);
mascotGroup.add(rightEye);

// Pupils (Smaller black spheres)
const pupilGeometry = new THREE.SphereGeometry(0.05, 8, 8);
const pupilMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
leftPupil.position.set(-0.2, 3.5, 0.8);
rightPupil.position.set(0.2, 3.5, 0.8);
mascotGroup.add(leftPupil);
mascotGroup.add(rightPupil);

// Mouth (A simple cylinder for a smiling mouth)
const mouthGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.1, 3);
const mouthMaterial = new THREE.MeshStandardMaterial({ color: 0xAA0000 });
const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
mouth.rotation.x = Math.PI / 2;
mouth.position.set(0, 3, 0.7);
mascotGroup.add(mouth);

// Arms (Cylinders)
const armGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1.5);
const armMaterial = new THREE.MeshStandardMaterial({ color: 0x00bfff });
const leftArm = new THREE.Mesh(armGeometry, armMaterial);
const rightArm = new THREE.Mesh(armGeometry, armMaterial);
leftArm.position.set(-1, 3, 0);
rightArm.position.set(1, 3, 0);
leftArm.rotation.z = Math.PI / 4;
rightArm.rotation.z = -Math.PI / 4;
mascotGroup.add(leftArm);
mascotGroup.add(rightArm);

// Legs (Cylinders)
const legGeometry = new THREE.CylinderGeometry(0.2, 0.2, 2);
const legMaterial = new THREE.MeshStandardMaterial({ color: 0x00bfff });
const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
leftLeg.position.set(-0.5, 0.5, 0);
rightLeg.position.set(0.5, 0.5, 0);
mascotGroup.add(leftLeg);
mascotGroup.add(rightLeg);

// Shirt Text (Using TextGeometry for the word "Jeff")
const loader = new THREE.FontLoader();
loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function (font) {
    const textGeometry = new THREE.TextGeometry('Jeff', {
        font: font,
        size: 0.3,
        height: 0.1,
    });
    const textMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.set(-0.25, 1.5, 0.6);  // Position on the body
    mascotGroup.add(textMesh);
});

// Position the mascot properly
mascotGroup.position.y = 1;  // Center the mascot on the ground
scene.add(mascotGroup);

// Create Goomba-like enemy
const goombaGroup = new THREE.Group();

// Goomba Body (a slightly flattened sphere)
const goombaBodyGeometry = new THREE.SphereGeometry(0.5, 16, 16);
const goombaBodyMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
const goombaBody = new THREE.Mesh(goombaBodyGeometry, goombaBodyMaterial);
goombaBody.position.y = 1;
goombaGroup.add(goombaBody);

// Goomba Eyes (small white spheres)
const goombaEyeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
const goombaEyeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
const goombaLeftEye = new THREE.Mesh(goombaEyeGeometry, goombaEyeMaterial);
const goombaRightEye = new THREE.Mesh(goombaEyeGeometry, goombaEyeMaterial);
goombaLeftEye.position.set(-0.2, 1.2, 0.5);
goombaRightEye.position.set(0.2, 1.2, 0.5);
goombaGroup.add(goombaLeftEye);
goombaGroup.add(goombaRightEye);

// Goomba Pupils (smaller black spheres)
const goombaPupilGeometry = new THREE.SphereGeometry(0.05, 8, 8);
const goombaPupilMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
const goombaLeftPupil = new THREE.Mesh(goombaPupilGeometry, goombaPupilMaterial);
const goombaRightPupil = new THREE.Mesh(goombaPupilGeometry, goombaPupilMaterial);
goombaLeftPupil.position.set(-0.2, 1.2, 0.6);
goombaRightPupil.position.set(0.2, 1.2, 0.6);
goombaGroup.add(goombaLeftPupil);
goombaGroup.add(goombaRightPupil);

goombaGroup.position.set(5, 1, 0);  // Place the Goomba on the platform
scene.add(goombaGroup);

function createMrMeatballHead() {
    // Create a larger sphere for the meatball body
    const meatballGeometry = new THREE.SphereGeometry(2, 32, 32); // Larger meatball (radius = 2)
    const meatballMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513 }); // Brown color for the meatball
    const meatball = new THREE.Mesh(meatballGeometry, meatballMaterial);

    // Create a moustache using a torus geometry (to simulate the large moustache)
    const moustacheGeometry = new THREE.TorusGeometry(1, 0.2, 16, 100); // Wider moustache for the larger meatball
    const moustacheMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 }); // Black moustache color
    const moustache = new THREE.Mesh(moustacheGeometry, moustacheMaterial);
    moustache.position.set(0, -0.7, 1.8); // Move the moustache slightly under the eyes

    // Create eyes (two small white spheres)
    const eyeGeometry = new THREE.SphereGeometry(0.3, 16, 16); // Small spheres for the eyes
    const eyeMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff }); // White color for eyes
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);

    // Position the eyes on the face
    leftEye.position.set(-0.7, 1.0, 2.0); // Left eye slightly above the center
    rightEye.position.set(0.7, 1.0, 2.0); // Right eye slightly above the center

    // Add pupils (small black spheres)
    const pupilGeometry = new THREE.SphereGeometry(0.1, 8, 8); // Smaller spheres for pupils
    const pupilMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 }); // Black color for pupils
    const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);

    // Position the pupils in the center of the eyes
    leftPupil.position.set(-0.7, 1.0, 2.3); // Left pupil slightly inside the left eye
    rightPupil.position.set(0.7, 1.0, 2.3); // Right pupil slightly inside the right eye

    // Create a group to combine the meatball, moustache, eyes, and pupils
    const mrMeatballHead = new THREE.Group();
    mrMeatballHead.add(meatball);
    mrMeatballHead.add(moustache);
    mrMeatballHead.add(leftEye);
    mrMeatballHead.add(rightEye);
    mrMeatballHead.add(leftPupil);
    mrMeatballHead.add(rightPupil);

    // Position Mr. Meatball Head in the scene
    mrMeatballHead.position.set(5, 1, -10); // Position him at x=5, y=1, z=5 (adjust as needed)

    // Scale up the entire group to make the villain bigger
    mrMeatballHead.scale.set(1.5, 1.5, 1.5); // Increase size by 1.5x

    // Add Mr. Meatball Head to the scene
    scene.add(mrMeatballHead);

    return mrMeatballHead;
}

// Create Mr. Meatball Head in the scene
const mrMeatball = createMrMeatballHead();

// Floor (Platform)
const floorGeometry = new THREE.BoxGeometry(20, 1, 20);
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.position.y = -1;
scene.add(floor);