import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

/**
 * Kart Class - Handles physics and controls for racing karts
 */
export class Kart {
    constructor(character) {
        this.group = new THREE.Group();
        this.character = character;
        
        // Physics properties
        this.position = new THREE.Vector3(0, 0.5, 0);
        this.velocity = new THREE.Vector3();
        this.rotation = 0;
        this.speed = 0;
        this.maxSpeed = 15;
        this.acceleration = 8;
        this.deceleration = 4;
        this.brakeForce = 12;
        this.turnSpeed = 2.5;
        this.driftFactor = 0.96;
        this.steering = 0;
        
        // Kart state
        this.isAccelerating = false;
        this.isBraking = false;
        this.isDrifting = false;
        this.steerDirection = 0;
        
        this.createKart();
        this.group.position.copy(this.position);
        
        // Add character to kart
        if (character) {
            const charGroup = character.getGroup();
            charGroup.position.set(0, 0.8, -0.2);
            charGroup.scale.set(0.7, 0.7, 0.7);
            this.group.add(charGroup);
        }
    }

    createKart() {
        // Kart body (red racing kart)
        const bodyGeometry = new THREE.BoxGeometry(1.2, 0.4, 1.8);
        bodyGeometry.translate(0, 0, -0.1);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff3333,
            roughness: 0.4,
            metalness: 0.6
        });
        this.kartBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.kartBody.position.y = 0.3;
        this.kartBody.castShadow = true;
        this.kartBody.receiveShadow = true;
        this.group.add(this.kartBody);

        // Kart seat
        const seatGeometry = new THREE.BoxGeometry(0.8, 0.3, 0.6);
        const seatMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x222222,
            roughness: 0.8,
            metalness: 0.2
        });
        const seat = new THREE.Mesh(seatGeometry, seatMaterial);
        seat.position.set(0, 0.55, -0.2);
        seat.castShadow = true;
        this.group.add(seat);

        // Front bumper with racing stripe
        const bumperGeometry = new THREE.BoxGeometry(1.0, 0.15, 0.2);
        const bumperMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffcc00,
            roughness: 0.3,
            metalness: 0.7
        });
        const frontBumper = new THREE.Mesh(bumperGeometry, bumperMaterial);
        frontBumper.position.set(0, 0.2, 1.0);
        frontBumper.castShadow = true;
        this.group.add(frontBumper);

        // Racing number
        const numberGeometry = new THREE.PlaneGeometry(0.3, 0.3);
        const numberMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffffff,
            side: THREE.DoubleSide
        });
        const numberPlate = new THREE.Mesh(numberGeometry, numberMaterial);
        numberPlate.position.set(0, 0.35, 0.5);
        numberPlate.rotation.x = -Math.PI / 6;
        this.group.add(numberPlate);

        // Wheels with better materials
        this.wheels = [];
        const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 20);
        const tireMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x1a1a1a,
            roughness: 0.9,
            metalness: 0.1
        });
        
        const rimGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.22, 16);
        const rimMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xcccccc,
            roughness: 0.3,
            metalness: 0.8
        });
        
        const wheelPositions = [
            [-0.6, 0, 0.7],   // Front left
            [0.6, 0, 0.7],    // Front right
            [-0.6, 0, -0.7],  // Back left
            [0.6, 0, -0.7]    // Back right
        ];

        wheelPositions.forEach((pos, index) => {
            const wheelGroup = new THREE.Group();
            
            const tire = new THREE.Mesh(wheelGeometry, tireMaterial);
            tire.rotation.z = Math.PI / 2;
            tire.castShadow = true;
            tire.receiveShadow = true;
            wheelGroup.add(tire);
            
            const rim = new THREE.Mesh(rimGeometry, rimMaterial);
            rim.rotation.z = Math.PI / 2;
            rim.castShadow = true;
            wheelGroup.add(rim);
            
            wheelGroup.position.set(...pos);
            this.wheels.push(wheelGroup);
            this.group.add(wheelGroup);
        });

        // Steering wheel
        const steeringWheelGeometry = new THREE.TorusGeometry(0.2, 0.03, 12, 24);
        const steeringWheelMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x333333,
            roughness: 0.7,
            metalness: 0.3
        });
        this.steeringWheel = new THREE.Mesh(steeringWheelGeometry, steeringWheelMaterial);
        this.steeringWheel.position.set(0, 0.9, 0.3);
        this.steeringWheel.rotation.x = Math.PI / 3;
        this.steeringWheel.castShadow = true;
        this.group.add(this.steeringWheel);

        // Exhaust pipes with chrome finish
        const exhaustGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.4, 12);
        const exhaustMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x888888,
            roughness: 0.2,
            metalness: 0.9
        });
        
        [-0.3, 0.3].forEach(xPos => {
            const exhaust = new THREE.Mesh(exhaustGeometry, exhaustMaterial);
            exhaust.rotation.x = Math.PI / 2;
            exhaust.position.set(xPos, 0.3, -0.9);
            exhaust.castShadow = true;
            this.group.add(exhaust);
        });

        // Spoiler
        const spoilerBaseGeometry = new THREE.BoxGeometry(0.15, 0.5, 0.1);
        const spoilerBaseMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff3333,
            roughness: 0.4,
            metalness: 0.6
        });
        
        [-0.4, 0.4].forEach(xPos => {
            const spoilerBase = new THREE.Mesh(spoilerBaseGeometry, spoilerBaseMaterial);
            spoilerBase.position.set(xPos, 0.5, -0.9);
            spoilerBase.castShadow = true;
            this.group.add(spoilerBase);
        });
        
        const spoilerWingGeometry = new THREE.BoxGeometry(1.0, 0.05, 0.3);
        const spoilerWing = new THREE.Mesh(spoilerWingGeometry, spoilerBaseMaterial);
        spoilerWing.position.set(0, 0.75, -0.95);
        spoilerWing.rotation.x = -Math.PI / 12;
        spoilerWing.castShadow = true;
        this.group.add(spoilerWing);
    }

    update(deltaTime, controls) {
        // Update control states
        this.isAccelerating = controls.forward;
        this.isBraking = controls.backward;
        this.isDrifting = controls.drift;
        this.steerDirection = 0;
        
        if (controls.left) this.steerDirection -= 1;
        if (controls.right) this.steerDirection += 1;

        // Acceleration/Deceleration
        if (this.isAccelerating) {
            this.speed += this.acceleration * deltaTime;
        } else if (this.isBraking) {
            this.speed -= this.brakeForce * deltaTime;
        } else {
            // Natural deceleration
            if (this.speed > 0) {
                this.speed -= this.deceleration * deltaTime;
            } else if (this.speed < 0) {
                this.speed += this.deceleration * deltaTime;
            }
        }

        // Clamp speed
        this.speed = Math.max(-this.maxSpeed * 0.5, Math.min(this.maxSpeed, this.speed));

        // Steering
        if (Math.abs(this.speed) > 0.5) {
            const turnAmount = this.steerDirection * this.turnSpeed * deltaTime;
            const speedFactor = Math.min(Math.abs(this.speed) / this.maxSpeed, 1);
            this.steering = turnAmount * speedFactor;
            this.rotation += this.steering;

            // Visual steering wheel rotation
            this.steeringWheel.rotation.y = -this.steerDirection * 0.5;

            // Front wheels steering
            this.wheels[0].rotation.y = -this.steerDirection * 0.3;
            this.wheels[1].rotation.y = -this.steerDirection * 0.3;
        } else {
            this.steering = 0;
            this.steeringWheel.rotation.y = 0;
            this.wheels[0].rotation.y = 0;
            this.wheels[1].rotation.y = 0;
        }

        // Drift effect
        if (this.isDrifting && Math.abs(this.speed) > 3) {
            this.driftFactor = 0.90;
            this.group.rotation.z = -this.steerDirection * 0.15;
        } else {
            this.driftFactor = 0.96;
            this.group.rotation.z *= 0.9;
        }

        // Update velocity
        const forward = new THREE.Vector3(
            Math.sin(this.rotation),
            0,
            Math.cos(this.rotation)
        );
        
        const targetVelocity = forward.multiplyScalar(this.speed);
        this.velocity.lerp(targetVelocity, this.driftFactor);

        // Update position
        const newPosition = this.position.clone().add(this.velocity.clone().multiplyScalar(deltaTime));
        
        // Collision detection with track boundaries
        const distanceFromCenter = Math.sqrt(
            Math.pow(newPosition.x, 2) + Math.pow(newPosition.z / 1.5, 2)
        );
        
        // Outer boundary (40 radius)
        if (distanceFromCenter > 40) {
            // Bounce off outer wall
            const angle = Math.atan2(newPosition.z, newPosition.x);
            this.position.x = Math.cos(angle) * 39.5;
            this.position.z = Math.sin(angle) * 39.5 * 1.5;
            this.velocity.multiplyScalar(-0.3); // Bounce with energy loss
            this.speed *= 0.3;
        }
        // Inner boundary (30 radius)
        else if (distanceFromCenter < 30) {
            // Bounce off inner wall
            const angle = Math.atan2(newPosition.z, newPosition.x);
            this.position.x = Math.cos(angle) * 30.5;
            this.position.z = Math.sin(angle) * 30.5 * 1.5;
            this.velocity.multiplyScalar(-0.3); // Bounce with energy loss
            this.speed *= 0.3;
        } else {
            this.position.copy(newPosition);
        }
        
        // Keep kart on ground
        this.position.y = 0.5;

        // Apply transforms
        this.group.position.copy(this.position);
        this.group.rotation.y = this.rotation;

        // Animate wheels (rotate entire wheel group)
        const wheelRotation = this.speed * deltaTime * 3;
        this.wheels.forEach((wheelGroup, index) => {
            // Rotate tire
            wheelGroup.children[0].rotation.x += wheelRotation;
            // Rotate rim
            wheelGroup.children[1].rotation.x += wheelRotation;
        });

        // Update character
        if (this.character) {
            const normalizedSpeed = Math.abs(this.speed) / this.maxSpeed;
            this.character.update(deltaTime, normalizedSpeed, this.steering);
            
            // Update character state based on speed
            if (normalizedSpeed > 0.7) {
                this.character.model.setState('driving');
            } else {
                this.character.model.setState('idle');
            }
        }
    }

    getPosition() {
        return this.position.clone();
    }

    getRotation() {
        return this.rotation;
    }

    getSpeed() {
        return this.speed;
    }

    getGroup() {
        return this.group;
    }

    reset(position, rotation) {
        this.position.copy(position);
        this.rotation = rotation;
        this.velocity.set(0, 0, 0);
        this.speed = 0;
        this.steering = 0;
        this.group.position.copy(this.position);
        this.group.rotation.y = this.rotation;
    }
}

/**
 * Input Controller
 */
export class InputController {
    constructor() {
        this.keys = {};
        this.controls = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            drift: false,
            cameraToggle: false,
            useItem: false
        };

        this.setupEventListeners();
    }

    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            this.updateControls();
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            this.updateControls();
            
            // Toggle camera on C key release
            if (e.code === 'KeyC') {
                this.controls.cameraToggle = true;
            }
            
            // Use item on I key release
            if (e.code === 'KeyI' || e.code === 'Space') {
                this.controls.useItem = true;
            }
        });
    }

    updateControls() {
        this.controls.forward = this.keys['ArrowUp'] || this.keys['KeyW'];
        this.controls.backward = this.keys['ArrowDown'] || this.keys['KeyS'];
        this.controls.left = this.keys['ArrowLeft'] || this.keys['KeyD'];
        this.controls.right = this.keys['ArrowRight'] || this.keys['KeyA'];
        this.controls.drift = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
    }

    getControls() {
        return this.controls;
    }

    resetCameraToggle() {
        this.controls.cameraToggle = false;
    }

    resetUseItem() {
        this.controls.useItem = false;
    }
}
