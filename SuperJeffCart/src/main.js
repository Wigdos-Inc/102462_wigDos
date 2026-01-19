import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { SuperJeffModel, CarlModel, WallyModel, Character } from './characters.js';
import { Kart, InputController } from './kart.js';
import { RaceTrack } from './track.js';
import { ItemManager } from './items.js';
import { AIManager } from './ai.js';

/**
 * Main Game Class
 */
class KartRacingGame {
    constructor(characterName = 'superjeff', trackName = 'classic') {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.kart = null;
        this.track = null;
        this.inputController = null;
        this.characterName = characterName.toLowerCase();
        this.trackName = trackName;
        
        // Item system
        this.itemManager = null;
        this.currentItem = null;
        
        // AI system
        this.aiManager = null;
        this.numAIRacers = 5;
        
        // Audio
        this.backgroundMusic = null;
        this.soundEffects = {};
        
        // Game state
        this.currentLap = 1;
        this.totalLaps = 3;
        this.lastCheckpoint = 0;
        this.raceTime = 0;
        this.isRaceActive = true;
        this.isPaused = false;
        this.racePosition = 1;
        
        // Camera modes
        this.cameraMode = 0; // 0: follow, 1: far, 2: first-person
        this.cameraModes = ['Follow', 'Far', 'First Person'];
        
        this.init();
        this.setupAudio();
        this.animate();
    }

    init() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
        this.scene.fog = new THREE.Fog(0x87ceeb, 50, 200);

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(35, 10, 10);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);

        // Lights
        this.setupLights();

        // Create track
        this.track = new RaceTrack();
        this.scene.add(this.track.getGroup());

        // Create character and kart
        let characterModel;
        if (this.characterName === 'carl') {
            characterModel = new CarlModel();
        } else if (this.characterName === 'wally') {
            characterModel = new WallyModel();
        } else {
            characterModel = new SuperJeffModel();
        }
        const character = new Character(characterModel);
        this.kart = new Kart(character);
        this.kart.reset(this.track.getStartPosition(), this.track.getStartRotation());
        this.scene.add(this.kart.getGroup());

        // Input
        this.inputController = new InputController();
        
        // Setup items
        this.setupItems();
        
        // Setup AI racers
        this.setupAI();

        // Window resize handler
        window.addEventListener('resize', () => this.onWindowResize());

        // Update UI
        this.updateUI();
    }

    setupItems() {
        this.itemManager = new ItemManager(this.scene);
        
        // Place item boxes around the track
        const itemPositions = [];
        const numItems = 12;
        const radius = 35;
        
        for (let i = 0; i < numItems; i++) {
            const angle = (i / numItems) * Math.PI * 2 + Math.PI / 4;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius * 1.5;
            itemPositions.push(new THREE.Vector3(x, 0, z));
        }
        
        this.itemManager.createItemBoxes(itemPositions);
    }

    setupAI() {
        // Create AI characters
        const aiCharacters = [];
        for (let i = 0; i < this.numAIRacers; i++) {
            let characterModel;
            const type = i % 3;
            if (type === 0) {
                characterModel = new SuperJeffModel();
            } else if (type === 1) {
                characterModel = new CarlModel();
            } else {
                characterModel = new WallyModel();
            }
            aiCharacters.push(new Character(characterModel));
        }
        
        this.aiManager = new AIManager(this.scene, this.track, aiCharacters);
        this.aiManager.createRacers(this.numAIRacers);
    }

    setupAudio() {
        // Background music
        const listener = new THREE.AudioListener();
        this.camera.add(listener);
        
        this.backgroundMusic = new THREE.Audio(listener);
        const audioLoader = new THREE.AudioLoader();
        
        audioLoader.load('/assets/sounds/JeffCart_Theme.mp3', (buffer) => {
            this.backgroundMusic.setBuffer(buffer);
            this.backgroundMusic.setLoop(true);
            this.backgroundMusic.setVolume(0.5);
            this.backgroundMusic.play();
        });
    }

    setupLights() {
        // Ambient light (reduced for more dramatic shadows)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        // Main directional light (sun) - improved shadows
        const dirLight = new THREE.DirectionalLight(0xfff4e6, 1.2);
        dirLight.position.set(100, 150, 100);
        dirLight.castShadow = true;
        dirLight.shadow.camera.left = -80;
        dirLight.shadow.camera.right = 80;
        dirLight.shadow.camera.top = 80;
        dirLight.shadow.camera.bottom = -80;
        dirLight.shadow.camera.near = 0.1;
        dirLight.shadow.camera.far = 300;
        dirLight.shadow.mapSize.width = 4096;
        dirLight.shadow.mapSize.height = 4096;
        dirLight.shadow.bias = -0.0001;
        dirLight.shadow.normalBias = 0.02;
        this.scene.add(dirLight);

        // Secondary fill light (softer, from opposite side)
        const fillLight = new THREE.DirectionalLight(0xb3d9ff, 0.3);
        fillLight.position.set(-50, 50, -50);
        this.scene.add(fillLight);

        // Hemisphere light for natural sky lighting
        const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x6b8e4e, 0.6);
        this.scene.add(hemiLight);

        // Rim light for character definition
        const rimLight = new THREE.DirectionalLight(0xffffff, 0.4);
        rimLight.position.set(0, 20, -50);
        this.scene.add(rimLight);

        // Track-level point lights for atmosphere
        const trackLight1 = new THREE.PointLight(0xffaa00, 0.5, 30);
        trackLight1.position.set(35, 2, 0);
        this.scene.add(trackLight1);

        const trackLight2 = new THREE.PointLight(0xffaa00, 0.5, 30);
        trackLight2.position.set(-35, 2, 0);
        this.scene.add(trackLight2);
    }

    updateCamera() {
        const kartPos = this.kart.getPosition();
        const kartRot = this.kart.getRotation();
        
        switch(this.cameraMode) {
            case 0: // Follow camera
                const followDistance = 8;
                const followHeight = 4;
                const cameraOffset = new THREE.Vector3(
                    -Math.sin(kartRot) * followDistance,
                    followHeight,
                    -Math.cos(kartRot) * followDistance
                );
                
                const targetPos = kartPos.clone().add(cameraOffset);
                this.camera.position.lerp(targetPos, 0.1);
                this.camera.lookAt(kartPos.x, kartPos.y + 1, kartPos.z);
                break;
                
            case 1: // Far camera
                const farDistance = 15;
                const farHeight = 10;
                const farOffset = new THREE.Vector3(
                    -Math.sin(kartRot) * farDistance,
                    farHeight,
                    -Math.cos(kartRot) * farDistance
                );
                
                const farTargetPos = kartPos.clone().add(farOffset);
                this.camera.position.lerp(farTargetPos, 0.05);
                this.camera.lookAt(kartPos.x, kartPos.y + 1, kartPos.z);
                break;
                
            case 2: // First person
                const fpHeight = 2;
                const fpForward = 1;
                const fpPos = new THREE.Vector3(
                    kartPos.x + Math.sin(kartRot) * fpForward,
                    kartPos.y + fpHeight,
                    kartPos.z + Math.cos(kartRot) * fpForward
                );
                
                this.camera.position.copy(fpPos);
                this.camera.lookAt(
                    kartPos.x + Math.sin(kartRot) * 10,
                    kartPos.y + fpHeight,
                    kartPos.z + Math.cos(kartRot) * 10
                );
                break;
        }
    }

    updateLapProgress() {
        const kartPos = this.kart.getPosition();
        const progress = this.track.checkLapProgress(kartPos, this.lastCheckpoint);
        
        if (progress.currentCheckpoint !== this.lastCheckpoint) {
            this.lastCheckpoint = progress.currentCheckpoint;
        }
        
        if (progress.lapCompleted && this.currentLap <= this.totalLaps) {
            this.currentLap++;
            this.lastCheckpoint = 0;
            
            if (this.currentLap > this.totalLaps) {
                this.isRaceActive = false;
                this.showRaceComplete();
            }
        }
    }

    updateUI() {
        // Speed
        const speed = Math.abs(this.kart.getSpeed() * 6); // Convert to km/h-ish
        document.getElementById('speed').textContent = Math.round(speed);

        // Lap
        document.getElementById('current-lap').textContent = 
            Math.min(this.currentLap, this.totalLaps);

        // Time
        const minutes = Math.floor(this.raceTime / 60);
        const seconds = Math.floor(this.raceTime % 60);
        const deciseconds = Math.floor((this.raceTime % 1) * 10);
        document.getElementById('time').textContent = 
            `${minutes}:${seconds.toString().padStart(2, '0')}.${deciseconds}`;
        
        // Position
        if (document.getElementById('position')) {
            document.getElementById('position').textContent = this.racePosition;
        }
        
        // Current item
        if (document.getElementById('current-item')) {
            const itemDisplay = document.getElementById('current-item');
            if (this.currentItem) {
                itemDisplay.textContent = this.getItemIcon(this.currentItem);
                itemDisplay.style.display = 'block';
            } else {
                itemDisplay.style.display = 'none';
            }
        }
    }

    getItemIcon(itemType) {
        const icons = {
            'shell': '🔴',
            'banana': '🍌',
            'mushroom': '🍄',
            'star': '⭐'
        };
        return icons[itemType] || '❓';
    }

    showRaceComplete() {
        const minutes = Math.floor(this.raceTime / 60);
        const seconds = (this.raceTime % 60).toFixed(1);
        
        setTimeout(() => {
            alert(`🏁 Race Complete!\n\nFinal Time: ${minutes}:${seconds.padStart(4, '0')}\n\nPress OK to restart`);
            this.resetRace();
        }, 500);
    }

    resetRace() {
        this.currentLap = 1;
        this.lastCheckpoint = 0;
        this.raceTime = 0;
        this.isRaceActive = true;
        this.kart.reset(this.track.getStartPosition(), this.track.getStartRotation());
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const deltaTime = 0.016; // ~60fps

        if (this.isRaceActive && !this.isPaused) {
            this.raceTime += deltaTime;
        }

        // Handle input
        const controls = this.inputController.getControls();
        
        // Camera toggle
        if (controls.cameraToggle) {
            this.cameraMode = (this.cameraMode + 1) % this.cameraModes.length;
            this.inputController.resetCameraToggle();
        }
        
        // Item usage (Space bar or I key)
        if (controls.useItem && this.currentItem) {
            this.useCurrentItem();
            this.inputController.resetUseItem();
        }

        // Update kart
        this.kart.update(deltaTime, controls);
        
        // Update AI
        if (this.aiManager) {
            this.aiManager.update(deltaTime);
        }
        
        // Update items
        if (this.itemManager) {
            this.itemManager.update(deltaTime);
            
            // Check item box collision
            const pickedItem = this.itemManager.checkItemBoxCollision(this.kart.getPosition());
            if (pickedItem && !this.currentItem) {
                this.currentItem = pickedItem;
            }
            
            // Check item collision with kart
            const hitItem = this.itemManager.checkItemCollisions(this.kart.getPosition());
            if (hitItem && hitItem.owner !== this.kart) {
                this.handleItemHit(hitItem);
            }
        }

        // Update camera
        this.updateCamera();

        // Check lap progress
        if (this.isRaceActive) {
            this.updateLapProgress();
            this.updateRacePosition();
            
            // Update AI lap progress
            if (this.aiManager) {
                this.aiManager.updateLapProgress(this.track);
            }
        }

        // Update track animations (balloons, NPCs)
        this.track.updateAnimations(this.raceTime);

        // Update UI
        this.updateUI();

        // Render
        this.renderer.render(this.scene, this.camera);
    }

    useCurrentItem() {
        if (!this.currentItem) return;
        
        const position = this.kart.getPosition().clone();
        position.y += 1;
        
        const rotation = this.kart.getRotation();
        const direction = new THREE.Vector3(
            Math.sin(rotation),
            0,
            Math.cos(rotation)
        );
        
        if (this.currentItem === 'mushroom') {
            // Speed boost
            this.kart.speed *= 1.5;
            setTimeout(() => {
                if (this.kart.speed > this.kart.maxSpeed) {
                    this.kart.speed = this.kart.maxSpeed;
                }
            }, 1000);
        } else if (this.currentItem === 'star') {
            // Invincibility
            this.kart.invincible = true;
            setTimeout(() => {
                this.kart.invincible = false;
            }, 5000);
        } else {
            // Projectile items
            this.itemManager.useItem(this.currentItem, this.kart, position, direction);
        }
        
        this.currentItem = null;
    }

    handleItemHit(item) {
        if (item.type === 'banana' || item.type === 'shell') {
            // Spin out
            this.kart.speed *= 0.3;
            item.deactivate();
        }
    }

    updateRacePosition() {
        if (this.aiManager) {
            this.racePosition = this.aiManager.getRacePositions(
                this.kart.getPosition(), 
                this.currentLap
            );
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// Start the game
const urlParams = new URLSearchParams(window.location.search);
const character = urlParams.get('character') || 'superjeff';
new KartRacingGame(character);
