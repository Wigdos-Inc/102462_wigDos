import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

/**
 * SuperJeff Character Model
 * Converted from WebGL to Three.js
 */
export class SuperJeffModel {
    constructor() {
        this.group = new THREE.Group();
        this.parts = {};
        this.animationState = {
            time: 0,
            bob: 0,
            armSwing: 0,
            legSwing: 0,
            stretch: 1,
            armSpread: 0
        };
        this.state = 'idle'; // idle, driving, attacking
        this.stateTimer = 0;
        
        this.createModel();
    }

    createModel() {
        // Neck
        const neckGeometry = new THREE.CylinderGeometry(0.12, 0.14, 0.15, 12);
        const skinMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xf2d938,
            roughness: 0.6,
            metalness: 0.1
        });
        this.parts.neck = new THREE.Mesh(neckGeometry, skinMaterial);
        this.parts.neck.position.set(0, 0.475, 0);
        this.parts.neck.castShadow = true;
        this.group.add(this.parts.neck);

        // Head (more human-like rounded)
        const headGeometry = new THREE.SphereGeometry(0.22, 24, 24);
        headGeometry.scale(1, 1.1, 0.95);
        const headMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xf2d938,
            roughness: 0.5,
            metalness: 0.1
        });
        this.parts.head = new THREE.Mesh(headGeometry, headMaterial);
        this.parts.head.position.set(0, 0.65, 0);
        this.parts.head.castShadow = true;
        this.group.add(this.parts.head);

        // Hair (single hair strand)
        const hairGroup = new THREE.Group();
        
        const hairMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x0a0a0a,
            roughness: 0.8,
            metalness: 0.2
        });
        
        // Single hair strand (thin cylinder with slight curve)
        const singleHairGeometry = new THREE.CylinderGeometry(0.005, 0.005, 0.12, 6);
        const singleHair = new THREE.Mesh(singleHairGeometry, hairMaterial);
        singleHair.position.set(0, 0.28, 0);
        singleHair.rotation.z = 0.1; // Slight tilt for character
        singleHair.castShadow = true;
        hairGroup.add(singleHair);
        
        hairGroup.position.set(0, 0.65, 0);
        this.parts.hair = hairGroup;
        this.group.add(hairGroup);

        // Torso (more anatomical)
        const torsoGeometry = new THREE.CapsuleGeometry(0.18, 0.35, 8, 16);
        const shirtMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2659d9,
            roughness: 0.7,
            metalness: 0.1
        });
        this.parts.body = new THREE.Mesh(torsoGeometry, shirtMaterial);
        this.parts.body.position.set(0, 0.2, 0);
        this.parts.body.castShadow = true;
        this.group.add(this.parts.body);

        // Shoulders
        const shoulderGeometry = new THREE.SphereGeometry(0.1, 12, 12);
        const leftShoulder = new THREE.Mesh(shoulderGeometry, shirtMaterial);
        leftShoulder.position.set(-0.28, 0.35, 0);
        leftShoulder.castShadow = true;
        this.group.add(leftShoulder);
        
        const rightShoulder = new THREE.Mesh(shoulderGeometry, shirtMaterial);
        rightShoulder.position.set(0.28, 0.35, 0);
        rightShoulder.castShadow = true;
        this.group.add(rightShoulder);

        // Arms (upper and lower segments for better movement)
        // Left Upper Arm
        const upperArmGeometry = new THREE.CapsuleGeometry(0.06, 0.25, 6, 12);
        this.parts.leftUpperArm = new THREE.Mesh(upperArmGeometry, shirtMaterial);
        this.parts.leftUpperArm.position.set(-0.35, 0.25, 0);
        this.parts.leftUpperArm.castShadow = true;
        this.group.add(this.parts.leftUpperArm);

        // Left Lower Arm/Hand
        const lowerArmGeometry = new THREE.CapsuleGeometry(0.055, 0.22, 6, 12);
        const handMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xf2d938,
            roughness: 0.6,
            metalness: 0.1
        });
        this.parts.leftLowerArm = new THREE.Mesh(lowerArmGeometry, handMaterial);
        this.parts.leftLowerArm.position.set(-0.35, 0.0, 0);
        this.parts.leftLowerArm.castShadow = true;
        this.group.add(this.parts.leftLowerArm);

        // Right Upper Arm
        this.parts.rightUpperArm = new THREE.Mesh(upperArmGeometry.clone(), shirtMaterial);
        this.parts.rightUpperArm.position.set(0.35, 0.25, 0);
        this.parts.rightUpperArm.castShadow = true;
        this.group.add(this.parts.rightUpperArm);

        // Right Lower Arm/Hand
        this.parts.rightLowerArm = new THREE.Mesh(lowerArmGeometry.clone(), handMaterial);
        this.parts.rightLowerArm.position.set(0.35, 0.0, 0);
        this.parts.rightLowerArm.castShadow = true;
        this.group.add(this.parts.rightLowerArm);

        // Attack effect (improved)
        const punchGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const punchMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffff00,
            transparent: true,
            opacity: 0
        });
        this.parts.punchEffect = new THREE.Mesh(punchGeometry, punchMaterial);
        this.parts.punchEffect.position.set(0.35, 0.15, 0.5);
        this.group.add(this.parts.punchEffect);

        // Legs (upper and lower segments)
        const pantsMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x1a3399,
            roughness: 0.8,
            metalness: 0.1
        });
        
        // Left Upper Leg
        const upperLegGeometry = new THREE.CapsuleGeometry(0.09, 0.3, 8, 12);
        this.parts.leftUpperLeg = new THREE.Mesh(upperLegGeometry, pantsMaterial);
        this.parts.leftUpperLeg.position.set(-0.1, -0.05, 0);
        this.parts.leftUpperLeg.castShadow = true;
        this.group.add(this.parts.leftUpperLeg);

        // Left Lower Leg
        const lowerLegGeometry = new THREE.CapsuleGeometry(0.07, 0.3, 8, 12);
        this.parts.leftLowerLeg = new THREE.Mesh(lowerLegGeometry, pantsMaterial);
        this.parts.leftLowerLeg.position.set(-0.1, -0.35, 0);
        this.parts.leftLowerLeg.castShadow = true;
        this.group.add(this.parts.leftLowerLeg);

        // Right Upper Leg
        this.parts.rightUpperLeg = new THREE.Mesh(upperLegGeometry.clone(), pantsMaterial);
        this.parts.rightUpperLeg.position.set(0.1, -0.05, 0);
        this.parts.rightUpperLeg.castShadow = true;
        this.group.add(this.parts.rightUpperLeg);

        // Right Lower Leg
        this.parts.rightLowerLeg = new THREE.Mesh(lowerLegGeometry.clone(), pantsMaterial);
        this.parts.rightLowerLeg.position.set(0.1, -0.35, 0);
        this.parts.rightLowerLeg.castShadow = true;
        this.group.add(this.parts.rightLowerLeg);

        // Shoes
        const shoeGeometry = new THREE.BoxGeometry(0.12, 0.08, 0.18);
        shoeGeometry.translate(0, -0.04, 0.03);
        const shoeMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2a2a2a,
            roughness: 0.7,
            metalness: 0.3
        });
        
        this.parts.leftShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
        this.parts.leftShoe.position.set(-0.1, -0.52, 0);
        this.parts.leftShoe.castShadow = true;
        this.group.add(this.parts.leftShoe);

        this.parts.rightShoe = new THREE.Mesh(shoeGeometry.clone(), shoeMaterial);
        this.parts.rightShoe.position.set(0.1, -0.52, 0);
        this.parts.rightShoe.castShadow = true;
        this.group.add(this.parts.rightShoe);

        // Facial features
        this.createEye(-0.09);
        this.createEye(0.09);

        // Nose (more subtle)
        const noseGeometry = new THREE.SphereGeometry(0.035, 12, 12);
        noseGeometry.scale(1, 1.2, 0.8);
        const noseMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xe6cc2e,
            roughness: 0.5,
            metalness: 0.1
        });
        this.parts.nose = new THREE.Mesh(noseGeometry, noseMaterial);
        this.parts.nose.position.set(0, 0.63, 0.21);
        this.parts.nose.castShadow = true;
        this.group.add(this.parts.nose);

        // Mouth (smile)
        const mouthCurve = new THREE.EllipseCurve(0, 0, 0.08, 0.04, 0, Math.PI, false, 0);
        const mouthPoints = mouthCurve.getPoints(20);
        const mouthGeometry = new THREE.BufferGeometry().setFromPoints(mouthPoints);
        const mouthMaterial = new THREE.LineBasicMaterial({ color: 0x331a1a, linewidth: 3 });
        this.parts.mouth = new THREE.Line(mouthGeometry, mouthMaterial);
        this.parts.mouth.position.set(0, 0.58, 0.21);
        this.parts.mouth.rotation.x = Math.PI;
        this.group.add(this.parts.mouth);

        // Eyebrows
        this.createEyebrow(-0.09);
        this.createEyebrow(0.09);
    }

    createEyebrow(xOffset) {
        const browCurve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(-0.04, 0, 0),
            new THREE.Vector3(0, 0.02, 0),
            new THREE.Vector3(0.04, 0, 0)
        );
        const browPoints = browCurve.getPoints(10);
        const browGeometry = new THREE.BufferGeometry().setFromPoints(browPoints);
        const browMaterial = new THREE.LineBasicMaterial({ color: 0x0a0a0a, linewidth: 2 });
        const brow = new THREE.Line(browGeometry, browMaterial);
        brow.position.set(xOffset, 0.71, 0.19);
        this.group.add(brow);
        
        if (xOffset < 0) {
            this.parts.leftBrow = brow;
        } else {
            this.parts.rightBrow = brow;
        }
    }

    createEye(xOffset) {
        // Eye socket (slight indent)
        const socketGeometry = new THREE.SphereGeometry(0.075, 16, 16);
        socketGeometry.scale(1, 1.1, 0.3);
        const socketMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xe8c830,
            roughness: 0.6,
            metalness: 0.1
        });
        const socket = new THREE.Mesh(socketGeometry, socketMaterial);
        socket.position.set(xOffset, 0.66, 0.19);
        this.group.add(socket);

        // White of eye
        const eyeWhiteGeometry = new THREE.SphereGeometry(0.065, 16, 16);
        eyeWhiteGeometry.scale(1, 1.1, 0.4);
        const eyeWhiteMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffff,
            roughness: 0.3,
            metalness: 0.1
        });
        const eyeWhite = new THREE.Mesh(eyeWhiteGeometry, eyeWhiteMaterial);
        eyeWhite.position.set(xOffset, 0.66, 0.20);
        eyeWhite.castShadow = true;
        this.group.add(eyeWhite);

        // Iris (colored part)
        const irisGeometry = new THREE.SphereGeometry(0.035, 16, 16);
        irisGeometry.scale(1, 1, 0.5);
        const irisMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x1a5ccc,
            roughness: 0.4,
            metalness: 0.2
        });
        const iris = new THREE.Mesh(irisGeometry, irisMaterial);
        iris.position.set(xOffset, 0.66, 0.23);
        this.group.add(iris);

        // Pupil
        const pupilGeometry = new THREE.SphereGeometry(0.02, 12, 12);
        pupilGeometry.scale(1, 1, 0.5);
        const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const pupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        pupil.position.set(xOffset, 0.66, 0.24);
        this.group.add(pupil);

        // Eye highlight (makes it look alive)
        const highlightGeometry = new THREE.SphereGeometry(0.01, 8, 8);
        const highlightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const highlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
        highlight.position.set(xOffset + 0.015, 0.67, 0.245);
        this.group.add(highlight);

        if (xOffset < 0) {
            this.parts.leftEye = eyeWhite;
            this.parts.leftPupil = pupil;
            this.parts.leftIris = iris;
        } else {
            this.parts.rightEye = eyeWhite;
            this.parts.rightPupil = pupil;
            this.parts.rightIris = iris;
        }
    }

    update(deltaTime, speed = 0, steering = 0) {
        this.animationState.time += deltaTime;
        this.stateTimer += deltaTime;

        // Animation based on speed
        const moveSpeed = Math.abs(speed);
        const bobSpeed = moveSpeed > 0.1 ? 8 : 2;
        const bobAmount = moveSpeed > 0.1 ? 0.05 : 0.02;
        
        this.animationState.bob = Math.sin(this.animationState.time * bobSpeed) * bobAmount;
        this.animationState.armSwing = Math.sin(this.animationState.time * bobSpeed) * 0.5;
        this.animationState.legSwing = Math.sin(this.animationState.time * bobSpeed) * 0.5;

        // Driving stretch effect
        if (moveSpeed > 0.5) {
            this.animationState.stretch = 1 + moveSpeed * 0.1;
            this.animationState.armSpread = moveSpeed * 0.05;
        } else {
            this.animationState.stretch = 1;
            this.animationState.armSpread = 0;
        }

        // Apply animations
        this.applyAnimations(steering);
    }

    applyAnimations(steering) {
        const { bob, armSwing, legSwing, stretch, armSpread } = this.animationState;

        // Head bob and slight forward lean when moving fast
        this.parts.head.position.y = 0.65 + bob;
        this.parts.neck.position.y = 0.475 + bob * 0.8;

        // Hair follows head
        this.parts.hair.position.y = 0.65 + bob;

        // Body subtle movement
        this.parts.body.position.y = 0.2 + bob * 0.5;
        this.parts.body.scale.y = stretch;

        // Arms swing naturally (both upper and lower parts)
        const armY = this.state === 'attacking' ? 0.35 : 0.25;
        const lowerArmY = this.state === 'attacking' ? 0.15 : 0.0;
        
        // Left arm
        this.parts.leftUpperArm.position.set(
            -0.35 - armSpread,
            armY + bob * 0.7,
            armSwing * 0.15
        );
        this.parts.leftUpperArm.rotation.x = armSwing * 0.3;
        
        this.parts.leftLowerArm.position.set(
            -0.35 - armSpread,
            lowerArmY + bob * 0.5,
            armSwing * 0.2
        );
        this.parts.leftLowerArm.rotation.x = armSwing * 0.5;
        
        // Right arm
        const rightArmZ = this.state === 'attacking' ? 0.5 : -armSwing * 0.15;
        this.parts.rightUpperArm.position.set(
            0.35 + armSpread,
            armY + bob * 0.7,
            rightArmZ
        );
        this.parts.rightUpperArm.rotation.x = this.state === 'attacking' ? -0.5 : -armSwing * 0.3;
        
        this.parts.rightLowerArm.position.set(
            0.35 + armSpread,
            lowerArmY + bob * 0.5,
            rightArmZ + (this.state === 'attacking' ? 0.15 : 0)
        );
        this.parts.rightLowerArm.rotation.x = this.state === 'attacking' ? -0.8 : -armSwing * 0.5;

        // Attack effect
        if (this.state === 'attacking' && this.stateTimer > 0.3) {
            this.parts.punchEffect.material.opacity = 0.7;
            this.parts.punchEffect.position.set(0.45 + armSpread, lowerArmY + bob * 0.5, 0.8);
            this.parts.punchEffect.scale.setScalar(1 + Math.sin(this.stateTimer * 20) * 0.2);
        } else {
            this.parts.punchEffect.material.opacity = 0;
        }

        // Legs swing (upper and lower parts for realistic walk)
        // Left leg
        this.parts.leftUpperLeg.position.set(
            -0.1,
            -0.05 + bob * 0.3,
            legSwing * 0.15
        );
        this.parts.leftUpperLeg.rotation.x = legSwing * 0.4;
        
        this.parts.leftLowerLeg.position.set(
            -0.1,
            -0.35 + bob * 0.2,
            legSwing * 0.1
        );
        this.parts.leftLowerLeg.rotation.x = Math.max(0, legSwing * 0.6);
        
        this.parts.leftShoe.position.set(
            -0.1,
            -0.52 + bob * 0.1,
            legSwing * 0.18
        );
        this.parts.leftShoe.rotation.x = legSwing * 0.2;

        // Right leg
        this.parts.rightUpperLeg.position.set(
            0.1,
            -0.05 + bob * 0.3,
            -legSwing * 0.15
        );
        this.parts.rightUpperLeg.rotation.x = -legSwing * 0.4;
        
        this.parts.rightLowerLeg.position.set(
            0.1,
            -0.35 + bob * 0.2,
            -legSwing * 0.1
        );
        this.parts.rightLowerLeg.rotation.x = Math.max(0, -legSwing * 0.6);
        
        this.parts.rightShoe.position.set(
            0.1,
            -0.52 + bob * 0.1,
            -legSwing * 0.18
        );
        this.parts.rightShoe.rotation.x = -legSwing * 0.2;

        // Mouth expression during attack
        if (this.state === 'attacking') {
            this.parts.mouth.position.y = 0.60;
            this.parts.mouth.scale.y = 1.2;
        } else {
            this.parts.mouth.position.y = 0.58;
            this.parts.mouth.scale.y = 1.0;
        }

        // Lean into turns
        this.group.rotation.z = -steering * 0.15;
        
        // Slight head turn with steering
        this.parts.head.rotation.y = steering * 0.3;
    }

    setState(newState) {
        if (this.state !== newState) {
            this.state = newState;
            this.stateTimer = 0;
        }
    }

    getGroup() {
        return this.group;
    }
}

/**
 * Carl Character Model
 * Alternative character with different appearance
 */
export class CarlModel {
    constructor() {
        this.group = new THREE.Group();
        this.parts = {};
        this.animationState = {
            time: 0,
            bob: 0,
            armSwing: 0,
            legSwing: 0,
            stretch: 1,
            armSpread: 0
        };
        this.state = 'idle'; // idle, driving, attacking
        this.stateTimer = 0;
        
        this.createModel();
    }

    createModel() {
        // Purple octopus body - main round blob
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x9370db,
            roughness: 0.5,
            metalness: 0.1
        });
        
        // Main body (round blob)
        const bodyGeometry = new THREE.SphereGeometry(0.28, 32, 32);
        bodyGeometry.scale(1, 0.95, 1);
        this.parts.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.parts.body.position.set(0, 0.35, 0);
        this.parts.body.castShadow = true;
        this.group.add(this.parts.body);

        // Lighter purple belly with swirls
        const bellyGeometry = new THREE.SphereGeometry(0.2, 24, 24);
        bellyGeometry.scale(0.9, 0.8, 0.6);
        const bellyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xb19cd9,
            roughness: 0.6,
            metalness: 0.1
        });
        this.parts.head = new THREE.Mesh(bellyGeometry, bellyMaterial);
        this.parts.head.position.set(0, 0.3, 0.15);
        this.parts.head.castShadow = true;
        this.group.add(this.parts.head);
        
        // Neck connector (hidden part)
        this.parts.neck = new THREE.Group();
        this.parts.neck.position.set(0, 0.5, 0);
        this.group.add(this.parts.neck);

        // Spikes on top of head
        const spineGroup = new THREE.Group();
        const spineMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x6a4c9c,
            roughness: 0.7,
            metalness: 0.2
        });
        
        // Create spikes on top
        const spinePositions = [
            { x: -0.08, z: 0 },
            { x: -0.04, z: 0.05 },
            { x: 0, z: 0 },
            { x: 0.04, z: 0.05 },
            { x: 0.08, z: 0 },
            { x: -0.06, z: -0.05 },
            { x: 0.06, z: -0.05 }
        ];
        
        spinePositions.forEach(pos => {
            const spineGeometry = new THREE.ConeGeometry(0.025, 0.1, 6);
            const spine = new THREE.Mesh(spineGeometry, spineMaterial);
            spine.position.set(pos.x, 0.6, pos.z);
            spine.castShadow = true;
            spineGroup.add(spine);
        });
        
        this.parts.hair = spineGroup;
        this.group.add(spineGroup);

        // Octopus tentacles (8 tentacles around body)
        const tentacleMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x7b5fb8,
            roughness: 0.6,
            metalness: 0.1
        });
        
        const tentacleCount = 8;
        const tentacles = [];
        
        for (let i = 0; i < tentacleCount; i++) {
            const angle = (i / tentacleCount) * Math.PI * 2;
            const tentacleGeometry = new THREE.CapsuleGeometry(0.035, 0.35, 6, 12);
            const tentacle = new THREE.Mesh(tentacleGeometry, tentacleMaterial);
            
            const radius = 0.2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            
            tentacle.position.set(x, 0.25, z);
            tentacle.rotation.z = -angle + Math.PI / 2;
            tentacle.rotation.x = 0.4;
            tentacle.castShadow = true;
            this.group.add(tentacle);
            tentacles.push(tentacle);
            
            // Add suction cups (blue circles on tentacles)
            const suctionMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x4169e1,
                roughness: 0.7,
                metalness: 0.1
            });
            
            for (let j = 0; j < 3; j++) {
                const suctionGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.01, 8);
                const suction = new THREE.Mesh(suctionGeometry, suctionMaterial);
                const offset = (j - 1) * 0.12;
                suction.position.set(
                    x + Math.cos(angle) * offset * 0.3,
                    0.15 - j * 0.08,
                    z + Math.sin(angle) * offset * 0.3
                );
                suction.rotation.x = Math.PI / 2;
                this.group.add(suction);
            }
        }
        
        // Store tentacles for animation
        this.parts.leftUpperArm = tentacles[6];
        this.parts.leftLowerArm = tentacles[7];
        this.parts.rightUpperArm = tentacles[1];
        this.parts.rightLowerArm = tentacles[2];

        // Attack effect (purple glow)
        const punchGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const punchMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x9370db,
            transparent: true,
            opacity: 0
        });
        this.parts.punchEffect = new THREE.Mesh(punchGeometry, punchMaterial);
        this.parts.punchEffect.position.set(0.25, 0.35, 0.5);
        this.group.add(this.parts.punchEffect);

        // Stubby legs at bottom
        const legMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xb19cd9,
            roughness: 0.6,
            metalness: 0.1
        });
        
        const legGeometry = new THREE.CapsuleGeometry(0.05, 0.15, 8, 12);
        
        this.parts.leftUpperLeg = new THREE.Mesh(legGeometry, legMaterial);
        this.parts.leftUpperLeg.position.set(-0.12, 0.08, 0);
        this.parts.leftUpperLeg.castShadow = true;
        this.group.add(this.parts.leftUpperLeg);

        this.parts.leftLowerLeg = new THREE.Mesh(legGeometry.clone(), legMaterial);
        this.parts.leftLowerLeg.position.set(-0.12, -0.05, 0);
        this.parts.leftLowerLeg.castShadow = true;
        this.group.add(this.parts.leftLowerLeg);

        this.parts.rightUpperLeg = new THREE.Mesh(legGeometry.clone(), legMaterial);
        this.parts.rightUpperLeg.position.set(0.12, 0.08, 0);
        this.parts.rightUpperLeg.castShadow = true;
        this.group.add(this.parts.rightUpperLeg);

        this.parts.rightLowerLeg = new THREE.Mesh(legGeometry.clone(), legMaterial);
        this.parts.rightLowerLeg.position.set(0.12, -0.05, 0);
        this.parts.rightLowerLeg.castShadow = true;
        this.group.add(this.parts.rightLowerLeg);

        // Stubby feet
        const footGeometry = new THREE.SphereGeometry(0.06, 12, 12);
        footGeometry.scale(1.3, 0.6, 1.2);
        const footMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xa58ac7,
            roughness: 0.7,
            metalness: 0.05
        });
        
        this.parts.leftShoe = new THREE.Mesh(footGeometry, footMaterial);
        this.parts.leftShoe.position.set(-0.12, -0.12, 0);
        this.parts.leftShoe.castShadow = true;
        this.group.add(this.parts.leftShoe);

        this.parts.rightShoe = new THREE.Mesh(footGeometry.clone(), footMaterial);
        this.parts.rightShoe.position.set(0.12, -0.12, 0);
        this.parts.rightShoe.castShadow = true;
        this.group.add(this.parts.rightShoe);

        // Big eyes (white with green irises)
        this.createEye(-0.11, 0.5, 0.22);
        this.createEye(0.11, 0.5, 0.22);

        // Wide smile with small teeth
        const mouthGroup = new THREE.Group();
        
        // Mouth opening (dark purple)
        const mouthCurve = new THREE.EllipseCurve(0, 0, 0.12, 0.06, 0, Math.PI, false, 0);
        const mouthPoints = mouthCurve.getPoints(30);
        const mouthGeometry = new THREE.BufferGeometry().setFromPoints(mouthPoints);
        const mouthMaterial = new THREE.LineBasicMaterial({ color: 0x2d1b4e, linewidth: 4 });
        const mouthLine = new THREE.Line(mouthGeometry, mouthMaterial);
        mouthLine.rotation.x = Math.PI;
        mouthGroup.add(mouthLine);
        
        // Teeth (small white triangles)
        const toothMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        for (let i = 0; i < 6; i++) {
            const toothGeometry = new THREE.ConeGeometry(0.012, 0.02, 3);
            const tooth = new THREE.Mesh(toothGeometry, toothMaterial);
            const angle = Math.PI - (i / 5) * Math.PI;
            const x = Math.cos(angle) * 0.12;
            const y = -Math.sin(angle) * 0.06 - 0.01;
            tooth.position.set(x, y, 0);
            tooth.rotation.z = -angle + Math.PI;
            mouthGroup.add(tooth);
        }
        
        this.parts.mouth = mouthGroup;
        this.parts.mouth.position.set(0, 0.38, 0.25);
        this.group.add(this.parts.mouth);
        
        // No nose for octopus
        this.parts.nose = new THREE.Group();
        this.group.add(this.parts.nose);
    }

    createEyebrow(xOffset) {
        // No eyebrows for octopus
    }

    createEye(xOffset, yOffset = 0.5, zOffset = 0.22) {
        // Large cartoon eye
        const eyeGeometry = new THREE.SphereGeometry(0.08, 20, 20);
        eyeGeometry.scale(1, 1.1, 0.6);
        const eyeWhiteMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffff,
            roughness: 0.2,
            metalness: 0.1
        });
        const eyeWhite = new THREE.Mesh(eyeGeometry, eyeWhiteMaterial);
        eyeWhite.position.set(xOffset, yOffset, zOffset);
        eyeWhite.castShadow = true;
        this.group.add(eyeWhite);

        // Green iris
        const irisGeometry = new THREE.SphereGeometry(0.04, 16, 16);
        irisGeometry.scale(1, 1.1, 0.5);
        const irisMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x32cd32,
            roughness: 0.4,
            metalness: 0.2
        });
        const iris = new THREE.Mesh(irisGeometry, irisMaterial);
        iris.position.set(xOffset, yOffset, zOffset + 0.05);
        this.group.add(iris);

        // Black pupil
        const pupilGeometry = new THREE.SphereGeometry(0.025, 12, 12);
        const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const pupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        pupil.position.set(xOffset, yOffset, zOffset + 0.06);
        this.group.add(pupil);

        // Eye highlight
        const highlightGeometry = new THREE.SphereGeometry(0.015, 8, 8);
        const highlightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const highlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
        highlight.position.set(xOffset + 0.02, yOffset + 0.02, zOffset + 0.065);
        this.group.add(highlight);

        if (xOffset < 0) {
            this.parts.leftEye = eyeWhite;
            this.parts.leftPupil = pupil;
            this.parts.leftIris = iris;
        } else {
            this.parts.rightEye = eyeWhite;
            this.parts.rightPupil = pupil;
            this.parts.rightIris = iris;
        }
    }

    update(deltaTime, speed = 0, steering = 0) {
        this.animationState.time += deltaTime;
        this.stateTimer += deltaTime;

        // Animation based on speed
        const moveSpeed = Math.abs(speed);
        const bobSpeed = moveSpeed > 0.1 ? 8 : 2;
        const bobAmount = moveSpeed > 0.1 ? 0.05 : 0.02;
        
        this.animationState.bob = Math.sin(this.animationState.time * bobSpeed) * bobAmount;
        this.animationState.armSwing = Math.sin(this.animationState.time * bobSpeed) * 0.5;
        this.animationState.legSwing = Math.sin(this.animationState.time * bobSpeed) * 0.5;

        // Driving stretch effect
        if (moveSpeed > 0.5) {
            this.animationState.stretch = 1 + moveSpeed * 0.1;
            this.animationState.armSpread = moveSpeed * 0.05;
        } else {
            this.animationState.stretch = 1;
            this.animationState.armSpread = 0;
        }

        // Apply animations
        this.applyAnimations(steering);
    }

    applyAnimations(steering) {
        const { bob, armSwing, legSwing, stretch, armSpread } = this.animationState;

        // Head bob and slight forward lean when moving fast
        this.parts.head.position.y = 0.65 + bob;
        this.parts.neck.position.y = 0.475 + bob * 0.8;

        // Hair follows head
        this.parts.hair.position.y = 0.65 + bob;

        // Body subtle movement
        this.parts.body.position.y = 0.2 + bob * 0.5;
        this.parts.body.scale.y = stretch;

        // Arms swing naturally (both upper and lower parts)
        const armY = this.state === 'attacking' ? 0.35 : 0.25;
        const lowerArmY = this.state === 'attacking' ? 0.15 : 0.0;
        
        // Left arm
        this.parts.leftUpperArm.position.set(
            -0.35 - armSpread,
            armY + bob * 0.7,
            armSwing * 0.15
        );
        this.parts.leftUpperArm.rotation.x = armSwing * 0.3;
        
        this.parts.leftLowerArm.position.set(
            -0.35 - armSpread,
            lowerArmY + bob * 0.5,
            armSwing * 0.2
        );
        this.parts.leftLowerArm.rotation.x = armSwing * 0.5;
        
        // Right arm
        const rightArmZ = this.state === 'attacking' ? 0.5 : -armSwing * 0.15;
        this.parts.rightUpperArm.position.set(
            0.35 + armSpread,
            armY + bob * 0.7,
            rightArmZ
        );
        this.parts.rightUpperArm.rotation.x = this.state === 'attacking' ? -0.5 : -armSwing * 0.3;
        
        this.parts.rightLowerArm.position.set(
            0.35 + armSpread,
            lowerArmY + bob * 0.5,
            rightArmZ + (this.state === 'attacking' ? 0.15 : 0)
        );
        this.parts.rightLowerArm.rotation.x = this.state === 'attacking' ? -0.8 : -armSwing * 0.5;

        // Attack effect
        if (this.state === 'attacking' && this.stateTimer > 0.3) {
            this.parts.punchEffect.material.opacity = 0.7;
            this.parts.punchEffect.position.set(0.45 + armSpread, lowerArmY + bob * 0.5, 0.8);
            this.parts.punchEffect.scale.setScalar(1 + Math.sin(this.stateTimer * 20) * 0.2);
        } else {
            this.parts.punchEffect.material.opacity = 0;
        }

        // Legs swing (upper and lower parts for realistic walk)
        // Left leg
        this.parts.leftUpperLeg.position.set(
            -0.1,
            -0.05 + bob * 0.3,
            legSwing * 0.15
        );
        this.parts.leftUpperLeg.rotation.x = legSwing * 0.4;
        
        this.parts.leftLowerLeg.position.set(
            -0.1,
            -0.35 + bob * 0.2,
            legSwing * 0.1
        );
        this.parts.leftLowerLeg.rotation.x = Math.max(0, legSwing * 0.6);
        
        this.parts.leftShoe.position.set(
            -0.1,
            -0.52 + bob * 0.1,
            legSwing * 0.18
        );
        this.parts.leftShoe.rotation.x = legSwing * 0.2;

        // Right leg
        this.parts.rightUpperLeg.position.set(
            0.1,
            -0.05 + bob * 0.3,
            -legSwing * 0.15
        );
        this.parts.rightUpperLeg.rotation.x = -legSwing * 0.4;
        
        this.parts.rightLowerLeg.position.set(
            0.1,
            -0.35 + bob * 0.2,
            -legSwing * 0.1
        );
        this.parts.rightLowerLeg.rotation.x = Math.max(0, -legSwing * 0.6);
        
        this.parts.rightShoe.position.set(
            0.1,
            -0.52 + bob * 0.1,
            -legSwing * 0.18
        );
        this.parts.rightShoe.rotation.x = -legSwing * 0.2;

        // Mouth expression during attack
        if (this.state === 'attacking') {
            this.parts.mouth.position.y = 0.60;
            this.parts.mouth.scale.y = 1.2;
        } else {
            this.parts.mouth.position.y = 0.58;
            this.parts.mouth.scale.y = 1.0;
        }

        // Lean into turns
        this.group.rotation.z = -steering * 0.15;
        
        // Slight head turn with steering
        this.parts.head.rotation.y = steering * 0.3;
    }

    setState(newState) {
        if (this.state !== newState) {
            this.state = newState;
            this.stateTimer = 0;
        }
    }

    getGroup() {
        return this.group;
    }
}

/**
 * Wally Character Model - Stocky biker/racer character
 */
export class WallyModel {
    constructor() {
        this.group = new THREE.Group();
        this.parts = {};
        this.animationState = {
            time: 0,
            bob: 0,
            armSwing: 0,
            legSwing: 0,
            stretch: 1,
            armSpread: 0
        };
        this.state = 'idle';
        this.stateTimer = 0;
        
        this.createModel();
    }

    createModel() {
        // Skin tone
        const skinMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xf5c49a,
            roughness: 0.6,
            metalness: 0.1
        });

        // Neck
        const neckGeometry = new THREE.CylinderGeometry(0.14, 0.16, 0.12, 12);
        this.parts.neck = new THREE.Mesh(neckGeometry, skinMaterial);
        this.parts.neck.position.set(0, 0.48, 0);
        this.parts.neck.castShadow = true;
        this.group.add(this.parts.neck);

        // Head (rounder, stocky)
        const headGeometry = new THREE.SphereGeometry(0.24, 24, 24);
        headGeometry.scale(1.1, 0.95, 1);
        this.parts.head = new THREE.Mesh(headGeometry, skinMaterial);
        this.parts.head.position.set(0, 0.66, 0);
        this.parts.head.castShadow = true;
        this.group.add(this.parts.head);

        // Yellow helmet/hat with ridge
        const hairGroup = new THREE.Group();
        const helmetMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xd4a514,
            roughness: 0.5,
            metalness: 0.3
        });
        
        // Main helmet dome
        const helmetGeometry = new THREE.SphereGeometry(0.26, 24, 24);
        helmetGeometry.scale(1.1, 0.7, 1);
        const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
        helmet.position.set(0, 0.3, 0);
        helmet.castShadow = true;
        hairGroup.add(helmet);
        
        // Helmet ridge/brim
        const brimGeometry = new THREE.CylinderGeometry(0.3, 0.28, 0.04, 24);
        const brim = new THREE.Mesh(brimGeometry, helmetMaterial);
        brim.position.set(0, 0.12, 0);
        brim.castShadow = true;
        hairGroup.add(brim);
        
        hairGroup.position.set(0, 0.66, 0);
        this.parts.hair = hairGroup;
        this.group.add(hairGroup);

        // Stocky torso (yellow shirt with purple vest)
        const torsoGeometry = new THREE.CapsuleGeometry(0.24, 0.35, 8, 16);
        const shirtMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xf4d03f,
            roughness: 0.7,
            metalness: 0.1
        });
        this.parts.body = new THREE.Mesh(torsoGeometry, shirtMaterial);
        this.parts.body.position.set(0, 0.2, 0);
        this.parts.body.castShadow = true;
        this.group.add(this.parts.body);

        // Purple vest/overalls
        const vestGeometry = new THREE.BoxGeometry(0.42, 0.38, 0.2);
        const vestMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8b4789,
            roughness: 0.8,
            metalness: 0.1
        });
        const vest = new THREE.Mesh(vestGeometry, vestMaterial);
        vest.position.set(0, 0.2, 0.05);
        vest.castShadow = true;
        this.group.add(vest);

        // Shoulders (muscular)
        const shoulderGeometry = new THREE.SphereGeometry(0.12, 12, 12);
        const leftShoulder = new THREE.Mesh(shoulderGeometry, shirtMaterial);
        leftShoulder.position.set(-0.32, 0.36, 0);
        leftShoulder.castShadow = true;
        this.group.add(leftShoulder);
        
        const rightShoulder = new THREE.Mesh(shoulderGeometry, shirtMaterial);
        rightShoulder.position.set(0.32, 0.36, 0);
        rightShoulder.castShadow = true;
        this.group.add(rightShoulder);

        // Muscular arms
        const upperArmGeometry = new THREE.CapsuleGeometry(0.08, 0.22, 6, 12);
        this.parts.leftUpperArm = new THREE.Mesh(upperArmGeometry, shirtMaterial);
        this.parts.leftUpperArm.position.set(-0.38, 0.22, 0);
        this.parts.leftUpperArm.castShadow = true;
        this.group.add(this.parts.leftUpperArm);

        const lowerArmGeometry = new THREE.CapsuleGeometry(0.07, 0.2, 6, 12);
        this.parts.leftLowerArm = new THREE.Mesh(lowerArmGeometry, skinMaterial);
        this.parts.leftLowerArm.position.set(-0.38, -0.02, 0);
        this.parts.leftLowerArm.castShadow = true;
        this.group.add(this.parts.leftLowerArm);

        this.parts.rightUpperArm = new THREE.Mesh(upperArmGeometry.clone(), shirtMaterial);
        this.parts.rightUpperArm.position.set(0.38, 0.22, 0);
        this.parts.rightUpperArm.castShadow = true;
        this.group.add(this.parts.rightUpperArm);

        this.parts.rightLowerArm = new THREE.Mesh(lowerArmGeometry.clone(), skinMaterial);
        this.parts.rightLowerArm.position.set(0.38, -0.02, 0);
        this.parts.rightLowerArm.castShadow = true;
        this.group.add(this.parts.rightLowerArm);

        // Belt
        const beltGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.06, 24);
        const beltMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x1a1a1a,
            roughness: 0.9,
            metalness: 0.2
        });
        const belt = new THREE.Mesh(beltGeometry, beltMaterial);
        belt.position.set(0, 0.02, 0);
        belt.castShadow = true;
        this.group.add(belt);

        // Belt buckle
        const buckleGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.03);
        const buckleMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xc0c0c0,
            roughness: 0.3,
            metalness: 0.8
        });
        const buckle = new THREE.Mesh(buckleGeometry, buckleMaterial);
        buckle.position.set(0, 0.02, 0.23);
        buckle.castShadow = true;
        this.group.add(buckle);

        // Attack effect
        const punchGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const punchMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffff00,
            transparent: true,
            opacity: 0
        });
        this.parts.punchEffect = new THREE.Mesh(punchGeometry, punchMaterial);
        this.parts.punchEffect.position.set(0.38, 0.15, 0.5);
        this.group.add(this.parts.punchEffect);

        // Purple pants (stocky legs)
        const pantsMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8b4789,
            roughness: 0.8,
            metalness: 0.1
        });
        
        const upperLegGeometry = new THREE.CapsuleGeometry(0.11, 0.28, 8, 12);
        this.parts.leftUpperLeg = new THREE.Mesh(upperLegGeometry, pantsMaterial);
        this.parts.leftUpperLeg.position.set(-0.12, -0.08, 0);
        this.parts.leftUpperLeg.castShadow = true;
        this.group.add(this.parts.leftUpperLeg);

        const lowerLegGeometry = new THREE.CapsuleGeometry(0.09, 0.26, 8, 12);
        this.parts.leftLowerLeg = new THREE.Mesh(lowerLegGeometry, pantsMaterial);
        this.parts.leftLowerLeg.position.set(-0.12, -0.38, 0);
        this.parts.leftLowerLeg.castShadow = true;
        this.group.add(this.parts.leftLowerLeg);

        this.parts.rightUpperLeg = new THREE.Mesh(upperLegGeometry.clone(), pantsMaterial);
        this.parts.rightUpperLeg.position.set(0.12, -0.08, 0);
        this.parts.rightUpperLeg.castShadow = true;
        this.group.add(this.parts.rightUpperLeg);

        this.parts.rightLowerLeg = new THREE.Mesh(lowerLegGeometry.clone(), pantsMaterial);
        this.parts.rightLowerLeg.position.set(0.12, -0.38, 0);
        this.parts.rightLowerLeg.castShadow = true;
        this.group.add(this.parts.rightLowerLeg);

        // Shoes (brown/dark boots)
        const shoeGeometry = new THREE.BoxGeometry(0.14, 0.1, 0.22);
        shoeGeometry.translate(0, -0.05, 0.04);
        const shoeMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3d2817,
            roughness: 0.8,
            metalness: 0.2
        });
        
        this.parts.leftShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
        this.parts.leftShoe.position.set(-0.12, -0.56, 0);
        this.parts.leftShoe.castShadow = true;
        this.group.add(this.parts.leftShoe);

        this.parts.rightShoe = new THREE.Mesh(shoeGeometry.clone(), shoeMaterial);
        this.parts.rightShoe.position.set(0.12, -0.56, 0);
        this.parts.rightShoe.castShadow = true;
        this.group.add(this.parts.rightShoe);

        // Facial features - eyes
        this.createEye(-0.1);
        this.createEye(0.1);

        // Pink/magenta nose (big round)
        const noseGeometry = new THREE.SphereGeometry(0.06, 16, 16);
        noseGeometry.scale(0.9, 0.85, 0.7);
        const noseMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff69b4,
            roughness: 0.4,
            metalness: 0.1
        });
        this.parts.nose = new THREE.Mesh(noseGeometry, noseMaterial);
        this.parts.nose.position.set(0, 0.62, 0.22);
        this.parts.nose.castShadow = true;
        this.group.add(this.parts.nose);

        // Big black mustache
        const mustacheGroup = new THREE.Group();
        const mustacheMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x0a0a0a,
            roughness: 0.9,
            metalness: 0.1
        });
        
        // Left mustache part
        const mustacheGeometry = new THREE.SphereGeometry(0.08, 16, 16);
        mustacheGeometry.scale(1.3, 0.5, 0.6);
        const leftMustache = new THREE.Mesh(mustacheGeometry, mustacheMaterial);
        leftMustache.position.set(-0.08, 0, 0);
        leftMustache.rotation.z = -0.2;
        mustacheGroup.add(leftMustache);
        
        const rightMustache = new THREE.Mesh(mustacheGeometry.clone(), mustacheMaterial);
        rightMustache.position.set(0.08, 0, 0);
        rightMustache.rotation.z = 0.2;
        mustacheGroup.add(rightMustache);
        
        mustacheGroup.position.set(0, 0.56, 0.2);
        this.group.add(mustacheGroup);

        // Wide grinning mouth with teeth
        const mouthGroup = new THREE.Group();
        const mouthCurve = new THREE.EllipseCurve(0, 0, 0.14, 0.08, 0, Math.PI, false, 0);
        const mouthPoints = mouthCurve.getPoints(30);
        const mouthGeometry = new THREE.BufferGeometry().setFromPoints(mouthPoints);
        const mouthMaterial = new THREE.LineBasicMaterial({ color: 0x1a0a0a, linewidth: 4 });
        const mouthLine = new THREE.Line(mouthGeometry, mouthMaterial);
        mouthLine.rotation.x = Math.PI;
        mouthGroup.add(mouthLine);
        
        // Teeth
        const toothMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        for (let i = 0; i < 8; i++) {
            const toothGeometry = new THREE.BoxGeometry(0.015, 0.025, 0.01);
            const tooth = new THREE.Mesh(toothGeometry, toothMaterial);
            const angle = Math.PI - (i / 7) * Math.PI;
            const x = Math.cos(angle) * 0.14;
            const y = -Math.sin(angle) * 0.08 - 0.015;
            tooth.position.set(x, y, 0);
            mouthGroup.add(tooth);
        }
        
        this.parts.mouth = mouthGroup;
        this.parts.mouth.position.set(0, 0.52, 0.22);
        this.group.add(this.parts.mouth);
    }

    createEye(xOffset) {
        // White of eye
        const eyeWhiteGeometry = new THREE.SphereGeometry(0.055, 16, 16);
        eyeWhiteGeometry.scale(1, 1.2, 0.5);
        const eyeWhiteMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffff,
            roughness: 0.3,
            metalness: 0.1
        });
        const eyeWhite = new THREE.Mesh(eyeWhiteGeometry, eyeWhiteMaterial);
        eyeWhite.position.set(xOffset, 0.66, 0.19);
        eyeWhite.castShadow = true;
        this.group.add(eyeWhite);

        // Black iris/pupil
        const pupilGeometry = new THREE.SphereGeometry(0.028, 12, 12);
        pupilGeometry.scale(1, 1.1, 0.5);
        const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const pupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        pupil.position.set(xOffset, 0.66, 0.22);
        this.group.add(pupil);

        // Eye highlight
        const highlightGeometry = new THREE.SphereGeometry(0.012, 8, 8);
        const highlightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const highlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
        highlight.position.set(xOffset + 0.015, 0.675, 0.23);
        this.group.add(highlight);

        if (xOffset < 0) {
            this.parts.leftEye = eyeWhite;
            this.parts.leftPupil = pupil;
        } else {
            this.parts.rightEye = eyeWhite;
            this.parts.rightPupil = pupil;
        }
    }

    update(deltaTime, speed = 0, steering = 0) {
        this.animationState.time += deltaTime;
        this.stateTimer += deltaTime;

        const moveSpeed = Math.abs(speed);
        const bobSpeed = moveSpeed > 0.1 ? 7 : 2;
        const bobAmount = moveSpeed > 0.1 ? 0.04 : 0.015;
        
        this.animationState.bob = Math.sin(this.animationState.time * bobSpeed) * bobAmount;
        this.animationState.armSwing = Math.sin(this.animationState.time * bobSpeed) * 0.4;
        this.animationState.legSwing = Math.sin(this.animationState.time * bobSpeed) * 0.4;

        if (moveSpeed > 0.5) {
            this.animationState.stretch = 1 + moveSpeed * 0.08;
            this.animationState.armSpread = moveSpeed * 0.04;
        } else {
            this.animationState.stretch = 1;
            this.animationState.armSpread = 0;
        }

        this.applyAnimations(steering);
    }

    applyAnimations(steering) {
        const { bob, armSwing, legSwing, stretch, armSpread } = this.animationState;

        this.parts.head.position.y = 0.66 + bob;
        this.parts.neck.position.y = 0.48 + bob * 0.8;
        this.parts.hair.position.y = 0.66 + bob;
        this.parts.body.position.y = 0.2 + bob * 0.5;
        this.parts.body.scale.y = stretch;

        const armY = this.state === 'attacking' ? 0.32 : 0.22;
        const lowerArmY = this.state === 'attacking' ? 0.12 : -0.02;
        
        this.parts.leftUpperArm.position.set(-0.38 - armSpread, armY + bob * 0.7, armSwing * 0.15);
        this.parts.leftUpperArm.rotation.x = armSwing * 0.3;
        this.parts.leftLowerArm.position.set(-0.38 - armSpread, lowerArmY + bob * 0.5, armSwing * 0.2);
        this.parts.leftLowerArm.rotation.x = armSwing * 0.5;
        
        const rightArmZ = this.state === 'attacking' ? 0.5 : -armSwing * 0.15;
        this.parts.rightUpperArm.position.set(0.38 + armSpread, armY + bob * 0.7, rightArmZ);
        this.parts.rightUpperArm.rotation.x = this.state === 'attacking' ? -0.5 : -armSwing * 0.3;
        this.parts.rightLowerArm.position.set(0.38 + armSpread, lowerArmY + bob * 0.5, rightArmZ + (this.state === 'attacking' ? 0.15 : 0));
        this.parts.rightLowerArm.rotation.x = this.state === 'attacking' ? -0.8 : -armSwing * 0.5;

        if (this.state === 'attacking' && this.stateTimer > 0.3) {
            this.parts.punchEffect.material.opacity = 0.7;
            this.parts.punchEffect.position.set(0.48 + armSpread, lowerArmY + bob * 0.5, 0.8);
            this.parts.punchEffect.scale.setScalar(1 + Math.sin(this.stateTimer * 20) * 0.2);
        } else {
            this.parts.punchEffect.material.opacity = 0;
        }

        this.parts.leftUpperLeg.position.set(-0.12, -0.08 + bob * 0.3, legSwing * 0.15);
        this.parts.leftUpperLeg.rotation.x = legSwing * 0.4;
        this.parts.leftLowerLeg.position.set(-0.12, -0.38 + bob * 0.2, legSwing * 0.1);
        this.parts.leftLowerLeg.rotation.x = Math.max(0, legSwing * 0.6);
        this.parts.leftShoe.position.set(-0.12, -0.56 + bob * 0.1, legSwing * 0.18);
        this.parts.leftShoe.rotation.x = legSwing * 0.2;

        this.parts.rightUpperLeg.position.set(0.12, -0.08 + bob * 0.3, -legSwing * 0.15);
        this.parts.rightUpperLeg.rotation.x = -legSwing * 0.4;
        this.parts.rightLowerLeg.position.set(0.12, -0.38 + bob * 0.2, -legSwing * 0.1);
        this.parts.rightLowerLeg.rotation.x = Math.max(0, -legSwing * 0.6);
        this.parts.rightShoe.position.set(0.12, -0.56 + bob * 0.1, -legSwing * 0.18);
        this.parts.rightShoe.rotation.x = -legSwing * 0.2;

        this.group.rotation.z = -steering * 0.12;
        this.parts.head.rotation.y = steering * 0.25;
    }

    setState(newState) {
        if (this.state !== newState) {
            this.state = newState;
            this.stateTimer = 0;
        }
    }

    getGroup() {
        return this.group;
    }
}

/**
 * Base Character class for creating different characters
 */
export class Character {
    constructor(model) {
        this.model = model;
        this.position = new THREE.Vector3();
        this.rotation = 0;
        this.velocity = new THREE.Vector3();
    }

    update(deltaTime, speed = 0, steering = 0) {
        if (this.model && this.model.update) {
            this.model.update(deltaTime, speed, steering);
        }
    }

    getGroup() {
        return this.model ? this.model.getGroup() : null;
    }
}
