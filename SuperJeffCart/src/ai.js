import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { Kart } from './kart.js';

/**
 * AI Racer - Computer controlled karts
 */
export class AIRacer {
    constructor(character, trackPath, startPosition, startIndex) {
        this.kart = new Kart(character);
        this.trackPath = trackPath; // Array of waypoints
        this.currentWaypointIndex = startIndex || 0;
        this.targetWaypoint = this.trackPath[this.currentWaypointIndex];
        this.speed = 0.7 + Math.random() * 0.3; // Random skill level
        this.aggression = Math.random();
        this.currentLap = 1;
        this.lastCheckpoint = 0;
        
        this.kart.reset(startPosition, 0);
    }

    update(deltaTime) {
        // Get current position
        const position = this.kart.getPosition();
        
        // Calculate direction to target waypoint
        const directionToTarget = new THREE.Vector3()
            .subVectors(this.targetWaypoint, position);
        
        const distanceToWaypoint = directionToTarget.length();
        
        // Check if reached waypoint
        if (distanceToWaypoint < 3) {
            this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.trackPath.length;
            this.targetWaypoint = this.trackPath[this.currentWaypointIndex];
        }
        
        // Calculate desired angle
        directionToTarget.normalize();
        const targetAngle = Math.atan2(directionToTarget.x, directionToTarget.z);
        const currentAngle = this.kart.getRotation();
        
        // Calculate steering
        let angleDiff = targetAngle - currentAngle;
        
        // Normalize angle difference
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        // Create control inputs
        const controls = {
            forward: true,
            backward: false,
            left: angleDiff < -0.1,
            right: angleDiff > 0.1,
            drift: Math.abs(angleDiff) > 0.8,
            cameraToggle: false
        };
        
        // Add some randomness for natural behavior
        if (Math.random() < 0.05) {
            controls.forward = Math.random() > 0.3;
        }
        
        // Update kart with AI controls
        this.kart.update(deltaTime, controls);
    }

    getKart() {
        return this.kart;
    }

    getPosition() {
        return this.kart.getPosition();
    }

    getCurrentLap() {
        return this.currentLap;
    }

    updateLap(lap) {
        this.currentLap = lap;
    }

    getLastCheckpoint() {
        return this.lastCheckpoint;
    }

    setLastCheckpoint(checkpoint) {
        this.lastCheckpoint = checkpoint;
    }
}

/**
 * Manages all AI racers
 */
export class AIManager {
    constructor(scene, track, characterModels) {
        this.scene = scene;
        this.track = track;
        this.racers = [];
        this.characterModels = characterModels;
        
        // Generate waypoints for AI
        this.generateWaypoints();
    }

    generateWaypoints() {
        // Create circular waypoints around track
        this.waypoints = [];
        const numWaypoints = 32;
        const radius = 35;
        
        for (let i = 0; i < numWaypoints; i++) {
            const angle = (i / numWaypoints) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius * 1.5;
            this.waypoints.push(new THREE.Vector3(x, 0.5, z));
        }
    }

    createRacers(count) {
        const startPos = this.track.getStartPosition();
        
        for (let i = 0; i < count; i++) {
            // Pick random character
            const characterModel = this.characterModels[i % this.characterModels.length];
            
            // Stagger starting positions
            const offsetPosition = startPos.clone();
            offsetPosition.x += (i % 2) * 2 - 1; // Left or right
            offsetPosition.z -= (Math.floor(i / 2) + 1) * 3; // Behind player
            
            const startWaypointIndex = Math.floor((i / count) * this.waypoints.length);
            const racer = new AIRacer(characterModel, this.waypoints, offsetPosition, startWaypointIndex);
            
            this.racers.push(racer);
            this.scene.add(racer.getKart().getGroup());
        }
    }

    update(deltaTime) {
        this.racers.forEach(racer => racer.update(deltaTime));
    }

    getRacers() {
        return this.racers;
    }

    updateLapProgress(track) {
        this.racers.forEach(racer => {
            const position = racer.getPosition();
            const progress = track.checkLapProgress(position, racer.getLastCheckpoint());
            
            if (progress.currentCheckpoint !== racer.getLastCheckpoint()) {
                racer.setLastCheckpoint(progress.currentCheckpoint);
            }
            
            if (progress.lapCompleted) {
                racer.updateLap(racer.getCurrentLap() + 1);
                racer.setLastCheckpoint(0);
            }
        });
    }

    getRacePositions(playerPosition, playerLap) {
        const positions = [];
        
        // Add player
        positions.push({
            isPlayer: true,
            lap: playerLap,
            position: playerPosition
        });
        
        // Add AI racers
        this.racers.forEach((racer, index) => {
            positions.push({
                isPlayer: false,
                index: index,
                lap: racer.getCurrentLap(),
                position: racer.getPosition(),
                racer: racer
            });
        });
        
        // Sort by lap and position
        positions.sort((a, b) => {
            if (a.lap !== b.lap) return b.lap - a.lap;
            // If same lap, sort by distance (simplified)
            return 0;
        });
        
        // Return player position
        const playerIndex = positions.findIndex(p => p.isPlayer);
        return playerIndex + 1;
    }
}
