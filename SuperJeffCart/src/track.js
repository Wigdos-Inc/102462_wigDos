import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

/**
 * Race Track Generator
 */
export class RaceTrack {
    constructor() {
        this.group = new THREE.Group();
        this.checkpoints = [];
        this.createTrack();
    }

    createTrack() {
        // Track surface (oval shape)
        const trackShape = new THREE.Shape();
        
        // Outer oval
        const outerRadius = 40;
        const innerRadius = 30;
        const segments = 64;
        
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = Math.cos(angle) * outerRadius;
            const z = Math.sin(angle) * outerRadius * 1.5; // Make it more oval
            
            if (i === 0) {
                trackShape.moveTo(x, z);
            } else {
                trackShape.lineTo(x, z);
            }
        }

        // Inner hole
        const holePath = new THREE.Path();
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = Math.cos(angle) * innerRadius;
            const z = Math.sin(angle) * innerRadius * 1.5;
            
            if (i === 0) {
                holePath.moveTo(x, z);
            } else {
                holePath.lineTo(x, z);
            }
        }
        trackShape.holes.push(holePath);

        // Extrude track
        const extrudeSettings = {
            depth: 0.5,
            bevelEnabled: false
        };

        const trackGeometry = new THREE.ExtrudeGeometry(trackShape, extrudeSettings);
        trackGeometry.rotateX(-Math.PI / 2);
        
        // Track material with texture-like appearance
        const trackMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x333333,
            shininess: 10
        });
        
        const track = new THREE.Mesh(trackGeometry, trackMaterial);
        track.receiveShadow = true;
        this.group.add(track);

        // Racing stripes
        this.createRacingStripes(outerRadius, innerRadius);

        // Barriers
        this.createBarriers(outerRadius + 2, innerRadius - 2);

        // Checkpoints for lap counting
        this.createCheckpoints(outerRadius, innerRadius);

        // Decorations
        this.createDecorations(outerRadius);
    }

    createRacingStripes(outerRadius, innerRadius) {
        const stripeCount = 32;
        const midRadius = (outerRadius + innerRadius) / 2;
        
        for (let i = 0; i < stripeCount; i++) {
            if (i % 2 === 0) continue; // Skip every other for dashed effect
            
            const angle1 = (i / stripeCount) * Math.PI * 2;
            const angle2 = ((i + 0.5) / stripeCount) * Math.PI * 2;
            
            const x1 = Math.cos(angle1) * midRadius;
            const z1 = Math.sin(angle1) * midRadius * 1.5;
            const x2 = Math.cos(angle2) * midRadius;
            const z2 = Math.sin(angle2) * midRadius * 1.5;
            
            const stripeGeometry = new THREE.BoxGeometry(1, 0.02, 0.3);
            const stripeMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
            const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
            
            stripe.position.set((x1 + x2) / 2, 0.26, (z1 + z2) / 2);
            stripe.rotation.y = angle1 + Math.PI / 2;
            this.group.add(stripe);
        }
    }

    createBarriers(outerRadius, innerRadius) {
        const barrierCount = 64;
        
        // Outer barriers
        for (let i = 0; i < barrierCount; i++) {
            const angle = (i / barrierCount) * Math.PI * 2;
            const x = Math.cos(angle) * outerRadius;
            const z = Math.sin(angle) * outerRadius * 1.5;
            
            const barrierGeometry = new THREE.BoxGeometry(2, 1.5, 0.3);
            const barrierMaterial = new THREE.MeshPhongMaterial({ 
                color: i % 2 === 0 ? 0xff0000 : 0xffffff 
            });
            const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
            
            barrier.position.set(x, 0.75, z);
            barrier.rotation.y = angle + Math.PI / 2;
            barrier.castShadow = true;
            this.group.add(barrier);
        }

        // Inner barriers
        for (let i = 0; i < barrierCount; i++) {
            const angle = (i / barrierCount) * Math.PI * 2;
            const x = Math.cos(angle) * innerRadius;
            const z = Math.sin(angle) * innerRadius * 1.5;
            
            const barrierGeometry = new THREE.BoxGeometry(2, 1.5, 0.3);
            const barrierMaterial = new THREE.MeshPhongMaterial({ 
                color: i % 2 === 0 ? 0xff0000 : 0xffffff 
            });
            const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
            
            barrier.position.set(x, 0.75, z);
            barrier.rotation.y = angle - Math.PI / 2;
            barrier.castShadow = true;
            this.group.add(barrier);
        }
    }

    createCheckpoints(outerRadius, innerRadius) {
        const checkpointCount = 8;
        const midRadius = (outerRadius + innerRadius) / 2;
        
        for (let i = 0; i < checkpointCount; i++) {
            const angle = (i / checkpointCount) * Math.PI * 2;
            const x = Math.cos(angle) * midRadius;
            const z = Math.sin(angle) * midRadius * 1.5;
            
            this.checkpoints.push({
                position: new THREE.Vector3(x, 0.5, z),
                angle: angle,
                triggered: false,
                index: i
            });

            // Visual checkpoint marker (invisible in game, just for reference)
            if (i === 0) {
                // Start/Finish line
                const lineGeometry = new THREE.BoxGeometry(10, 0.05, 1);
                const lineMaterial = new THREE.MeshBasicMaterial({ 
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.8
                });
                const finishLine = new THREE.Mesh(lineGeometry, lineMaterial);
                finishLine.position.set(x, 0.28, z);
                finishLine.rotation.y = angle + Math.PI / 2;
                this.group.add(finishLine);

                // Checkered pattern
                for (let j = -5; j < 5; j++) {
                    for (let k = 0; k < 2; k++) {
                        if ((j + k) % 2 === 0) continue;
                        const checkGeometry = new THREE.BoxGeometry(1, 0.06, 0.5);
                        const checkMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
                        const check = new THREE.Mesh(checkGeometry, checkMaterial);
                        check.position.set(
                            x + Math.cos(angle + Math.PI / 2) * j,
                            0.29,
                            z + Math.sin(angle + Math.PI / 2) * j
                        );
                        check.rotation.y = angle + Math.PI / 2;
                        this.group.add(check);
                    }
                }
            }
        }
    }

    createDecorations(radius) {
        // Grass field
        const grassGeometry = new THREE.CircleGeometry(radius + 35, 32);
        const grassMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2d5016,
            roughness: 0.9,
            metalness: 0.1,
            side: THREE.DoubleSide
        });
        const grass = new THREE.Mesh(grassGeometry, grassMaterial);
        grass.rotation.x = -Math.PI / 2;
        grass.position.y = -0.1;
        grass.receiveShadow = true;
        this.group.add(grass);

        // Palm trees around the track
        const treeCount = 20;
        for (let i = 0; i < treeCount; i++) {
            const angle = (i / treeCount) * Math.PI * 2;
            const distance = radius + 8 + Math.random() * 8;
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance * 1.5;
            
            this.createTree(x, z);
        }

        // Castle on a hill
        this.createCastle(-55, 5, -40);

        // Village houses with NPCs
        this.createHouse(50, 0, 30, 0xff6b4a); // Orange house
        this.createNPC(52, 0, 32, 0xff0000); // Red NPC
        
        this.createHouse(48, 0, 45, 0x4a90ff); // Blue house
        this.createNPC(46, 0, 47, 0x0000ff); // Blue NPC
        
        this.createHouse(60, 0, 38, 0x4aff6b); // Green house
        this.createNPC(62, 0, 40, 0x00ff00); // Green NPC

        // Ponds
        this.createPond(-45, 25);
        this.createPond(40, -30);
        this.createPond(-20, -50);

        // Waterfall
        this.createWaterfall(-60, 60);

        // Hot air balloons
        this.createHotAirBalloon(-30, 20, 40, 0xff4444, 0xffff00);
        this.createHotAirBalloon(35, 25, -45, 0x4444ff, 0xff44ff);
        this.createHotAirBalloon(0, 30, 55, 0x44ff44, 0x44ffff);

        // Rock formations
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + 0.3;
            const distance = radius + 15 + Math.random() * 10;
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance * 1.5;
            this.createRock(x, z);
        }

        // Flower patches
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = radius + 10 + Math.random() * 15;
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance * 1.5;
            this.createFlowerPatch(x, z);
        }

        // Campfire area
        this.createCampfire(-50, -35);
        this.createNPC(-48, 0, -35, 0xffa500); // Orange NPC by fire
        this.createNPC(-52, 0, -37, 0xff6347); // Red NPC by fire

        // Wooden signs
        this.createSign(35, 0, 5, "START!");
        this.createSign(-35, 0, 0, "GOOD LUCK!");
        this.createSign(0, 0, 45, "TURN AHEAD");
    }

    createTree(x, z) {
        // Trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.4, 4, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8b4513,
            roughness: 0.9,
            metalness: 0.1
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.set(x, 2, z);
        trunk.castShadow = true;
        this.group.add(trunk);

        // Leaves
        const leavesGeometry = new THREE.SphereGeometry(2, 8, 8);
        const leavesMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x228b22,
            roughness: 0.8,
            metalness: 0.1
        });
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.set(x, 5, z);
        leaves.castShadow = true;
        this.group.add(leaves);
    }

    createCastle(x, y, z) {
        const castleGroup = new THREE.Group();
        
        // Main keep
        const keepGeometry = new THREE.BoxGeometry(12, 15, 12);
        const stoneMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x808080,
            roughness: 0.9,
            metalness: 0.1
        });
        const keep = new THREE.Mesh(keepGeometry, stoneMaterial);
        keep.position.set(0, 7.5, 0);
        keep.castShadow = true;
        keep.receiveShadow = true;
        castleGroup.add(keep);

        // Towers (4 corners)
        const towerPositions = [
            [-7, 0, -7],
            [7, 0, -7],
            [-7, 0, 7],
            [7, 0, 7]
        ];

        towerPositions.forEach(pos => {
            const towerGeometry = new THREE.CylinderGeometry(2.5, 2.5, 18, 12);
            const tower = new THREE.Mesh(towerGeometry, stoneMaterial);
            tower.position.set(...pos);
            tower.position.y = 9;
            tower.castShadow = true;
            castleGroup.add(tower);

            // Tower roof
            const roofGeometry = new THREE.ConeGeometry(3.5, 4, 12);
            const roofMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x8b0000,
                roughness: 0.7,
                metalness: 0.2
            });
            const roof = new THREE.Mesh(roofGeometry, roofMaterial);
            roof.position.set(...pos);
            roof.position.y = 20;
            roof.castShadow = true;
            castleGroup.add(roof);

            // Flag
            const flagPoleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 3, 8);
            const flagPoleMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
            const flagPole = new THREE.Mesh(flagPoleGeometry, flagPoleMaterial);
            flagPole.position.set(...pos);
            flagPole.position.y = 23.5;
            castleGroup.add(flagPole);

            const flagGeometry = new THREE.PlaneGeometry(1.5, 1);
            const flagMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xff0000,
                side: THREE.DoubleSide
            });
            const flag = new THREE.Mesh(flagGeometry, flagMaterial);
            flag.position.set(pos[0] + 0.75, 24, pos[2]);
            castleGroup.add(flag);
        });

        // Castle gate
        const gateGeometry = new THREE.BoxGeometry(4, 6, 0.5);
        const gateMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x4a2511,
            roughness: 0.9,
            metalness: 0.1
        });
        const gate = new THREE.Mesh(gateGeometry, gateMaterial);
        gate.position.set(0, 3, 6.5);
        gate.castShadow = true;
        castleGroup.add(gate);

        // Windows
        for (let i = 0; i < 3; i++) {
            const windowGeometry = new THREE.BoxGeometry(1.5, 2, 0.3);
            const windowMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x87ceeb,
                roughness: 0.1,
                metalness: 0.9
            });
            const window = new THREE.Mesh(windowGeometry, windowMaterial);
            window.position.set(-3 + i * 3, 10 + i * 2, 6.2);
            castleGroup.add(window);
        }

        castleGroup.position.set(x, y, z);
        this.group.add(castleGroup);
    }

    createHouse(x, y, z, color) {
        const houseGroup = new THREE.Group();
        
        // House body
        const bodyGeometry = new THREE.BoxGeometry(5, 4, 5);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: color,
            roughness: 0.8,
            metalness: 0.1
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.set(0, 2, 0);
        body.castShadow = true;
        body.receiveShadow = true;
        houseGroup.add(body);

        // Roof
        const roofGeometry = new THREE.ConeGeometry(4, 3, 4);
        const roofMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8b4513,
            roughness: 0.9,
            metalness: 0.1
        });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.rotation.y = Math.PI / 4;
        roof.position.set(0, 5.5, 0);
        roof.castShadow = true;
        houseGroup.add(roof);

        // Door
        const doorGeometry = new THREE.BoxGeometry(1.5, 2.5, 0.2);
        const doorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x654321,
            roughness: 0.9,
            metalness: 0.1
        });
        const door = new THREE.Mesh(doorGeometry, doorMaterial);
        door.position.set(0, 1.25, 2.6);
        door.castShadow = true;
        houseGroup.add(door);

        // Windows
        const windowGeometry = new THREE.BoxGeometry(1, 1, 0.2);
        const windowMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x87ceeb,
            roughness: 0.1,
            metalness: 0.9,
            emissive: 0x444466,
            emissiveIntensity: 0.3
        });
        
        const leftWindow = new THREE.Mesh(windowGeometry, windowMaterial);
        leftWindow.position.set(-1.5, 2.5, 2.6);
        houseGroup.add(leftWindow);
        
        const rightWindow = new THREE.Mesh(windowGeometry, windowMaterial);
        rightWindow.position.set(1.5, 2.5, 2.6);
        houseGroup.add(rightWindow);

        // Chimney
        const chimneyGeometry = new THREE.BoxGeometry(0.8, 2, 0.8);
        const chimneyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8b0000,
            roughness: 0.9,
            metalness: 0.1
        });
        const chimney = new THREE.Mesh(chimneyGeometry, chimneyMaterial);
        chimney.position.set(1.5, 5.5, 1.5);
        chimney.castShadow = true;
        houseGroup.add(chimney);

        houseGroup.position.set(x, y, z);
        this.group.add(houseGroup);
    }

    createNPC(x, y, z, color) {
        const npcGroup = new THREE.Group();
        
        // Body
        const bodyGeometry = new THREE.CapsuleGeometry(0.3, 0.6, 8, 16);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: color,
            roughness: 0.7,
            metalness: 0.2
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.set(0, 1, 0);
        body.castShadow = true;
        npcGroup.add(body);

        // Head
        const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffdbac,
            roughness: 0.6,
            metalness: 0.1
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.set(0, 1.8, 0);
        head.castShadow = true;
        npcGroup.add(head);

        // Eyes
        const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.08, 1.85, 0.2);
        npcGroup.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.08, 1.85, 0.2);
        npcGroup.add(rightEye);

        // Arms
        const armGeometry = new THREE.CapsuleGeometry(0.08, 0.4, 6, 12);
        
        const leftArm = new THREE.Mesh(armGeometry, bodyMaterial);
        leftArm.position.set(-0.35, 1.1, 0);
        leftArm.rotation.z = Math.PI / 6;
        leftArm.castShadow = true;
        npcGroup.add(leftArm);
        
        const rightArm = new THREE.Mesh(armGeometry, bodyMaterial);
        rightArm.position.set(0.35, 1.1, 0);
        rightArm.rotation.z = -Math.PI / 6;
        rightArm.castShadow = true;
        npcGroup.add(rightArm);

        // Waving animation
        npcGroup.userData.animationTime = Math.random() * Math.PI * 2;
        npcGroup.userData.rightArm = rightArm;

        npcGroup.position.set(x, y, z);
        this.group.add(npcGroup);
        
        // Store for animation
        if (!this.npcs) this.npcs = [];
        this.npcs.push(npcGroup);
    }

    createPond(x, z) {
        // Water surface
        const pondGeometry = new THREE.CircleGeometry(6, 32);
        const waterMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x1e90ff,
            roughness: 0.1,
            metalness: 0.8,
            transparent: true,
            opacity: 0.7
        });
        const pond = new THREE.Mesh(pondGeometry, waterMaterial);
        pond.rotation.x = -Math.PI / 2;
        pond.position.set(x, 0.1, z);
        pond.receiveShadow = true;
        this.group.add(pond);

        // Rocks around pond
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const rockX = x + Math.cos(angle) * 6.5;
            const rockZ = z + Math.sin(angle) * 6.5;
            
            const rockGeometry = new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.3, 0);
            const rockMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x696969,
                roughness: 0.9,
                metalness: 0.1
            });
            const rock = new THREE.Mesh(rockGeometry, rockMaterial);
            rock.position.set(rockX, 0.2, rockZ);
            rock.rotation.set(Math.random(), Math.random(), Math.random());
            rock.castShadow = true;
            this.group.add(rock);
        }

        // Lilypads
        for (let i = 0; i < 5; i++) {
            const lilyGeometry = new THREE.CircleGeometry(0.4, 16);
            const lilyMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x2d5016,
                roughness: 0.8,
                metalness: 0.1
            });
            const lily = new THREE.Mesh(lilyGeometry, lilyMaterial);
            lily.rotation.x = -Math.PI / 2;
            lily.position.set(
                x + (Math.random() - 0.5) * 8,
                0.15,
                z + (Math.random() - 0.5) * 8
            );
            this.group.add(lily);
        }
    }

    createWaterfall(x, z) {
        // Cliff
        const cliffGeometry = new THREE.BoxGeometry(8, 12, 4);
        const cliffMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x696969,
            roughness: 0.9,
            metalness: 0.1
        });
        const cliff = new THREE.Mesh(cliffGeometry, cliffMaterial);
        cliff.position.set(x, 6, z);
        cliff.castShadow = true;
        cliff.receiveShadow = true;
        this.group.add(cliff);

        // Water stream
        const waterGeometry = new THREE.PlaneGeometry(3, 10);
        const waterMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x4169e1,
            roughness: 0.2,
            metalness: 0.6,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        const waterfall = new THREE.Mesh(waterGeometry, waterMaterial);
        waterfall.position.set(x, 7, z + 2.5);
        this.group.add(waterfall);

        // Pool at bottom
        const poolGeometry = new THREE.CircleGeometry(4, 32);
        const poolMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x1e90ff,
            roughness: 0.1,
            metalness: 0.8,
            transparent: true,
            opacity: 0.7
        });
        const pool = new THREE.Mesh(poolGeometry, poolMaterial);
        pool.rotation.x = -Math.PI / 2;
        pool.position.set(x, 0.1, z + 6);
        pool.receiveShadow = true;
        this.group.add(pool);
    }

    createHotAirBalloon(x, y, z, balloonColor, basketColor) {
        const balloonGroup = new THREE.Group();
        
        // Balloon envelope
        const balloonGeometry = new THREE.SphereGeometry(3, 16, 16);
        balloonGeometry.scale(1, 1.3, 1);
        const balloonMaterial = new THREE.MeshStandardMaterial({ 
            color: balloonColor,
            roughness: 0.4,
            metalness: 0.2
        });
        const balloon = new THREE.Mesh(balloonGeometry, balloonMaterial);
        balloon.position.set(0, 0, 0);
        balloon.castShadow = true;
        balloonGroup.add(balloon);

        // Colored stripes
        const stripeGeometry = new THREE.SphereGeometry(3.1, 16, 16, 0, Math.PI * 2, 0, Math.PI / 3);
        stripeGeometry.scale(1, 1.3, 1);
        const stripeMaterial = new THREE.MeshStandardMaterial({ 
            color: basketColor,
            roughness: 0.4,
            metalness: 0.2
        });
        const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
        stripe.position.set(0, -0.5, 0);
        balloonGroup.add(stripe);

        // Basket
        const basketGeometry = new THREE.BoxGeometry(1.2, 1, 1.2);
        const basketMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8b4513,
            roughness: 0.9,
            metalness: 0.1
        });
        const basket = new THREE.Mesh(basketGeometry, basketMaterial);
        basket.position.set(0, -5, 0);
        basket.castShadow = true;
        balloonGroup.add(basket);

        // Ropes
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const ropeGeometry = new THREE.CylinderGeometry(0.05, 0.05, 2, 8);
            const ropeMaterial = new THREE.MeshStandardMaterial({ color: 0x4a2511 });
            const rope = new THREE.Mesh(ropeGeometry, ropeMaterial);
            rope.position.set(
                Math.cos(angle) * 0.6,
                -3.5,
                Math.sin(angle) * 0.6
            );
            const ropeAngle = Math.atan2(Math.cos(angle) * 1.5, 2);
            rope.rotation.z = Math.cos(angle) * ropeAngle;
            rope.rotation.x = Math.sin(angle) * ropeAngle;
            balloonGroup.add(rope);
        }

        // Animation data
        balloonGroup.userData.baseY = y;
        balloonGroup.userData.animationTime = Math.random() * Math.PI * 2;
        balloonGroup.userData.bobSpeed = 0.5 + Math.random() * 0.3;

        balloonGroup.position.set(x, y, z);
        this.group.add(balloonGroup);
        
        // Store for animation
        if (!this.balloons) this.balloons = [];
        this.balloons.push(balloonGroup);
    }

    createRock(x, z) {
        const rockGeometry = new THREE.DodecahedronGeometry(1 + Math.random() * 1.5, 1);
        const rockMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x808080,
            roughness: 0.9,
            metalness: 0.1
        });
        const rock = new THREE.Mesh(rockGeometry, rockMaterial);
        rock.position.set(x, 0.5, z);
        rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        rock.castShadow = true;
        rock.receiveShadow = true;
        this.group.add(rock);
    }

    createFlowerPatch(x, z) {
        const colors = [0xff69b4, 0xffff00, 0xff0000, 0x9370db, 0xffa500];
        
        for (let i = 0; i < 5; i++) {
            const flowerGroup = new THREE.Group();
            
            // Stem
            const stemGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8);
            const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x228b22 });
            const stem = new THREE.Mesh(stemGeometry, stemMaterial);
            stem.position.set(0, 0.15, 0);
            flowerGroup.add(stem);

            // Petals
            const petalGeometry = new THREE.SphereGeometry(0.1, 8, 8);
            const petalMaterial = new THREE.MeshStandardMaterial({ 
                color: colors[Math.floor(Math.random() * colors.length)],
                roughness: 0.5,
                metalness: 0.2
            });
            const petals = new THREE.Mesh(petalGeometry, petalMaterial);
            petals.position.set(0, 0.35, 0);
            flowerGroup.add(petals);

            const offsetX = (Math.random() - 0.5) * 2;
            const offsetZ = (Math.random() - 0.5) * 2;
            flowerGroup.position.set(x + offsetX, 0, z + offsetZ);
            this.group.add(flowerGroup);
        }
    }

    createCampfire(x, z) {
        // Fire pit stones
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const stoneGeometry = new THREE.BoxGeometry(0.5, 0.3, 0.4);
            const stoneMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x696969,
                roughness: 0.9,
                metalness: 0.1
            });
            const stone = new THREE.Mesh(stoneGeometry, stoneMaterial);
            stone.position.set(
                x + Math.cos(angle) * 1.2,
                0.15,
                z + Math.sin(angle) * 1.2
            );
            stone.rotation.y = angle;
            stone.castShadow = true;
            this.group.add(stone);
        }

        // Fire (glowing)
        const fireGeometry = new THREE.ConeGeometry(0.5, 1.5, 8);
        const fireMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff4500,
            transparent: true,
            opacity: 0.8
        });
        const fire = new THREE.Mesh(fireGeometry, fireMaterial);
        fire.position.set(x, 0.75, z);
        this.group.add(fire);

        // Fire light
        const fireLight = new THREE.PointLight(0xff4500, 1, 10);
        fireLight.position.set(x, 1, z);
        fireLight.castShadow = true;
        this.group.add(fireLight);

        // Logs
        const logGeometry = new THREE.CylinderGeometry(0.15, 0.15, 1.2, 8);
        const logMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x4a2511,
            roughness: 0.9,
            metalness: 0.1
        });
        
        for (let i = 0; i < 3; i++) {
            const log = new THREE.Mesh(logGeometry, logMaterial);
            log.position.set(x, 0.1, z);
            log.rotation.set(Math.PI / 2, 0, (i / 3) * Math.PI);
            log.castShadow = true;
            this.group.add(log);
        }
    }

    createSign(x, y, z, text) {
        const signGroup = new THREE.Group();
        
        // Post
        const postGeometry = new THREE.CylinderGeometry(0.1, 0.1, 2, 8);
        const postMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x4a2511,
            roughness: 0.9,
            metalness: 0.1
        });
        const post = new THREE.Mesh(postGeometry, postMaterial);
        post.position.set(0, 1, 0);
        post.castShadow = true;
        signGroup.add(post);

        // Sign board
        const boardGeometry = new THREE.BoxGeometry(3, 0.8, 0.2);
        const boardMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8b4513,
            roughness: 0.8,
            metalness: 0.1
        });
        const board = new THREE.Mesh(boardGeometry, boardMaterial);
        board.position.set(0, 2.2, 0);
        board.castShadow = true;
        signGroup.add(board);

        // Text plane (simplified - in real game would use canvas texture)
        const textGeometry = new THREE.PlaneGeometry(2.8, 0.6);
        const textMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffffff,
            side: THREE.DoubleSide
        });
        const textPlane = new THREE.Mesh(textGeometry, textMaterial);
        textPlane.position.set(0, 2.2, 0.15);
        signGroup.add(textPlane);

        signGroup.position.set(x, y, z);
        this.group.add(signGroup);
    }

    // Animation update method
    updateAnimations(time) {
        // Animate hot air balloons
        if (this.balloons) {
            this.balloons.forEach(balloon => {
                const data = balloon.userData;
                data.animationTime += 0.016 * data.bobSpeed;
                balloon.position.y = data.baseY + Math.sin(data.animationTime) * 2;
                balloon.rotation.y += 0.001;
            });
        }

        // Animate NPCs waving
        if (this.npcs) {
            this.npcs.forEach(npc => {
                npc.userData.animationTime += 0.05;
                const arm = npc.userData.rightArm;
                if (arm) {
                    arm.rotation.z = -Math.PI / 6 + Math.sin(npc.userData.animationTime) * 0.5;
                }
            });
        }
    }

    getStartPosition() {
        return new THREE.Vector3(35, 0.5, 0);
    }

    getStartRotation() {
        return -Math.PI / 2;
    }

    checkLapProgress(kartPosition, lastCheckpoint) {
        let currentCheckpoint = lastCheckpoint;
        let lapCompleted = false;

        this.checkpoints.forEach((checkpoint, index) => {
            const distance = kartPosition.distanceTo(checkpoint.position);
            
            if (distance < 8) { // Within checkpoint trigger distance
                // Check if this is the next checkpoint in sequence
                const expectedNext = (lastCheckpoint + 1) % this.checkpoints.length;
                
                if (index === expectedNext) {
                    currentCheckpoint = index;
                    
                    // If we just crossed checkpoint 0, we completed a lap
                    if (index === 0 && lastCheckpoint === this.checkpoints.length - 1) {
                        lapCompleted = true;
                    }
                }
            }
        });

        return { currentCheckpoint, lapCompleted };
    }

    getGroup() {
        return this.group;
    }
}
