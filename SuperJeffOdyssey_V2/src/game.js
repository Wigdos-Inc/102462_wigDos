import { game, kingdomConfigs, engine, vector } from './globals.js';
import { drawJeff, player } from './player.js';
import { drawStructures } from './structures.js';
import { initInput } from './inputs.js';
import { loadKingdom, enterPyramid, exitPyramid } from './levelgeneration.js';
import { showMessage, updateHUD, togglePause, showCredits } from './ui.js';
import { playEffect, beginbackgroundmusic, musicInit, getKingdomtrack } from './audio.js';
import { supportHeightAtXZ } from './libs/engine/engine.js';

// ReJeffAninated Studios
// Jarlo & Jauigi
// Moonshine

(function() {
    'use strict';

    // initialize input handling (keyboard + touch)
    initInput(game);

    // RTX mode toggle
    game.rtxMode = false;

    musicInit();

    // total moons across all kingdom configs (used to trigger credits)
    game.overallMoons = Object.values(kingdomConfigs).reduce((sum, k) => sum + k.moons, 0);

    function update(deltaTime) {
        if (game.paused) return; // skip game logic while paused
        const dt = Math.min(deltaTime / 1000, 0.05);

        // boss logic if present
        if (game.boss) game.boss.update(dt);

        // Ground and platform collision (unified via collision helper)
        player.onGround = false;

        // Check mesh-accurate terrain collision using the volumetric surface
        if (game.sampleTerrainHeight) {
            const terrainHeight = game.sampleTerrainHeight(player.pos.x, player.pos.z, player.pos.y);
            if (terrainHeight !== null && player.pos.y - player.radius <= terrainHeight) {
                player.pos.y = terrainHeight + player.radius;
                player.vel.y = Math.max(0, player.vel.y);
                player.onGround = true;
            }
        }
        
        // Fallback to flat ground at y=0
        if (!player.onGround && player.pos.y - player.radius <= 0) {
            //player.pos.y = player.radius;
            //player.vel.y = Math.max(0, player.vel.y);
            //player.onGround = true;
        }

        // Platform support query – find highest top surface beneath player
        const platTop = supportHeightAtXZ(player.pos.x, player.pos.z, game.platforms, null);
        if (platTop !== null) {
            // if near or below platform surface, snap up
            if (player.pos.y - player.radius <= platTop + 0.01) {
                player.pos.y = platTop + player.radius;
                player.vel.y = Math.max(0, player.vel.y);
                player.onGround = true;
            }
        }

        // Standard gravity (not galaxy gravity) applied after collision checks
        if (!player.onGround) {
            player.vel.y -= 25 * dt; // Standard downward gravity
        }

        // Movement
        const wKey = game.keys['w'] || game.keys['W'] || game.keys['KeyW'] || game.keys['ArrowUp'];
        const sKey = game.keys['s'] || game.keys['S'] || game.keys['KeyS'] || game.keys['ArrowDown'];
        const aKey = game.keys['a'] || game.keys['A'] || game.keys['KeyA'] || game.keys['ArrowLeft'];
        const dKey = game.keys['d'] || game.keys['D'] || game.keys['KeyD'] || game.keys['ArrowRight'];
        const spaceKey = game.keys[' '] || game.keys['Space'];
        const shiftKey = game.keys['Shift'] || game.keys['ShiftLeft'] || game.keys['ShiftRight'];
        const qKey = game.keys['q'] || game.keys['Q'];
        const eKey = game.keys['e'] || game.keys['E'];
        const fKey = game.keys['f'] || game.keys['F']; // ADD
        const kKey = game.keys['k'] || game.keys['K'];
        const rKey = game.keys['r'] || game.keys['R'];
        const bKey = game.keys['b'] || game.keys['B']; // boss key

        // Mario Sunshine momentum-based movement
        const camYaw = game.camera.yaw;
        const forward = vector.create(Math.sin(camYaw), 0, Math.cos(camYaw));
        const right = vector.create(Math.cos(camYaw), 0, -Math.sin(camYaw));
        
        const maxSpeed = 18 * (player.speedMultiplier || 1.0);
        const acceleration = 60 * (player.speedMultiplier || 1.0);
        const airControl = 35;
        
        // Get input direction
        let inputX = 0, inputZ = 0;
        if (wKey) { inputX += forward.x; inputZ += forward.z; }
        if (sKey) { inputX -= forward.x; inputZ -= forward.z; }
        if (aKey) { inputX += right.x; inputZ += right.z; }
        if (dKey) { inputX -= right.x; inputZ -= right.z; }
        
        const inputLength = Math.sqrt(inputX * inputX + inputZ * inputZ);
        if (inputLength > 0.1) {
            inputX /= inputLength;
            inputZ /= inputLength;
            player.moveDir = vector.create(inputX, 0, inputZ);
            player.facingDir = player.moveDir;
        }
        
        // Ground movement with momentum
        if (player.onGround && player.state !== 'attacking' && !player.diving && !player.canDiveJump) {
            if (inputLength > 0.1) {
                player.vel.x += inputX * acceleration * dt;
                player.vel.z += inputZ * acceleration * dt;
                
                // Limit to max speed
                const currentSpeed = Math.sqrt(player.vel.x * player.vel.x + player.vel.z * player.vel.z);
                if (currentSpeed > maxSpeed) {
                    player.vel.x = (player.vel.x / currentSpeed) * maxSpeed;
                    player.vel.z = (player.vel.z / currentSpeed) * maxSpeed;
                }
            }
        } else if (!player.onGround && !player.groundPounding && !player.diving) {
            // Air control (reduced)
            if (inputLength > 0.1) {
                player.vel.x += inputX * airControl * dt;
                player.vel.z += inputZ * airControl * dt;
            }
        }
        
        // Reset jump counter when grounded
        if (player.onGround && player.state !== 'jumping') {
            const now = Date.now();
            if (now - player.lastJumpTime > 800) {
                player.jumpCount = 0;
            }
        }
        
        // Long Jump (shift + space while running on ground)
        if (shiftKey && spaceKey && !game.spaceWasPressed && player.onGround && !player.canDiveJump) {
            const currentSpeed = Math.sqrt(player.vel.x * player.vel.x + player.vel.z * player.vel.z);
            if (currentSpeed > 5) {
                player.vel.y = 12 * (player.jumpMultiplier || 1.0);
                const dir = vector.normalize(vector.create(player.vel.x, 0, player.vel.z));
                player.vel.x = dir.x * 22;
                player.vel.z = dir.z * 22;
                player.state = 'longjump';
                player.stateTimer = 0.6;
                player.jumpCount = 0;
                showMessage('Long Jump!', '#FFD700');
                game.spaceWasPressed = true;
                return; // Skip other jump checks
            }
        }
        
        // Triple Jump system
        if (spaceKey && !game.spaceWasPressed && player.onGround && !player.canDiveJump) {
            const now = Date.now();
            const timeSinceLastJump = now - player.lastJumpTime;
            
            // Check for backflip (jumping while moving backward)
            const currentSpeed = Math.sqrt(player.vel.x * player.vel.x + player.vel.z * player.vel.z);
            const isMovingBack = sKey && currentSpeed > 3;
            
            if (isMovingBack) {
                // Side flip / Backflip
                player.vel.y = 18 * (player.jumpMultiplier || 1.0);
                player.vel.x = player.facingDir.x * -12;
                player.vel.z = player.facingDir.z * -12;
                player.state = 'backflip';
                player.rotation = 0;
                player.jumpCount = 0;
                showMessage('Backflip!', '#00FFFF');
            } else if (timeSinceLastJump < 600 && player.jumpCount < 3) {
                // Triple jump progression
                player.jumpCount++;
                if (player.jumpCount === 1) {
                    player.vel.y = 13 * (player.jumpMultiplier || 1.0);
                    player.state = 'jumping';
                } else if (player.jumpCount === 2) {
                    player.vel.y = 15 * (player.jumpMultiplier || 1.0);
                    player.state = 'jumping';
                    showMessage('Double Jump!', '#FFFF00');
                } else if (player.jumpCount === 3) {
                    player.vel.y = 20 * (player.jumpMultiplier || 1.0);
                    player.state = 'jumping';
                    showMessage('Triple Jump!', '#FF00FF');
                }
            } else {
                // First jump
                player.jumpCount = 1;
                player.vel.y = 13 * (player.jumpMultiplier || 1.0);
                player.state = 'jumping';
            }
            
            player.lastJumpTime = now;
            player.spinJumping = false;
        }
        
        // Spin Jump (press jump again in air)
        if (spaceKey && !game.spaceWasPressed && !player.onGround && !player.spinJumping && player.vel.y > 0) {
            player.vel.y += 8 * (player.jumpMultiplier || 1.0);
            player.spinJumping = true;
            player.state = 'spinjump';
            player.rotation = 0;
            showMessage('Spin Jump!', '#00FFFF');
        }
        
        // Ground Pound (shift while in air, no forward movement)
        if (shiftKey && !game.shiftWasPressed && !player.onGround && !player.groundPounding) {
            const horizontalSpeed = Math.sqrt(player.vel.x * player.vel.x + player.vel.z * player.vel.z);
            if (horizontalSpeed < 8) {
                player.vel.y = -30;
                player.vel.x *= 0.3;
                player.vel.z *= 0.3;
                player.groundPounding = true;
                player.state = 'groundpound';
                showMessage('Ground Pound!', '#FF8C00');
            } else {
                // Dive (shift while moving in air)
                player.diving = true;
                player.groundPounding = false;
                player.state = 'dive';
                const diveSpeed = 25;
                const dir = vector.normalize(vector.create(player.vel.x, 0, player.vel.z));
                player.vel.x = dir.x * diveSpeed;
                player.vel.z = dir.z * diveSpeed;
                player.vel.y = -8;
                showMessage('Dive!', '#00CED1');
            }
        }
        
        // Dive recovery jump
        if (player.diving && spaceKey && !game.spaceWasPressed && player.canDiveJump) {
            player.vel.y = 16 * (player.jumpMultiplier || 1.0);
            player.diving = false;
            player.canDiveJump = false;
            player.state = 'jumping';
            showMessage('Dive Jump!', '#7FFF00');
        }
        
        game.spaceWasPressed = spaceKey;
        game.shiftWasPressed = shiftKey;

        // Attack
        if (qKey && !game.qWasPressed && player.onGround) {
            player.state = 'attacking';
            player.stateTimer = 0.5;
        }
        game.qWasPressed = qKey;

        // Roll (now Summersault) - E key on ground
        if (eKey && !game.eWasPressed && player.onGround && !game.insidePyramid) {
            // Check if near pyramid first
            let nearPyramid = false;
            if (game.structures) {
                const pyramid = game.structures.find(s => s.type === 'pyramid' && s.hasInterior);
                if (pyramid) {
                    const dx = player.pos.x - pyramid.x;
                    const dz = player.pos.z - pyramid.z;
                    const distToPyramid = Math.sqrt(dx * dx + dz * dz);
                    if (distToPyramid < (pyramid.size || 15) * 1.2) {
                        nearPyramid = true;
                    }
                }
            }
            
            if (!nearPyramid) {
                player.vel.y = 10;
                player.state = 'summersault';
                player.stateTimer = 0.8;
                player.rotation = 0;
            }
        }

        // Hair Throw (Cappy mechanic) - F key
        if (fKey && !game.fWasPressed && !player.hairThrown) {
            // Throw hair in facing direction
            player.hairThrown = true;
            player.hairReturn = false;
            player.hairPos = vector.add(player.pos, vector.scale(vector.create(0, 1, 0), 2));
            
            const throwDir = player.facingDir || vector.create(0, 0, 1);
            player.hairVel = vector.scale(vector.normalize(vector.add(throwDir, vector.create(0, 0.2, 0))), 25);
            
            showMessage('Hair Throw!', '#FFD700');
            playEffect("jeff's song (3).mp3", 2);
        }
        game.fWasPressed = fKey;

        // Update hair projectile
        if (player.hairThrown && player.hairPos) {
            const hairSpeed = 25;
            const maxDist = 20;
            const returnSpeed = 30;
            
            if (!player.hairReturn) {
                // Hair flying out
                player.hairPos = vector.add(player.hairPos, vector.scale(player.hairVel, dt));
                player.hairVel.y -= 15 * dt; // Gravity on hair
                
                // Check distance or ground collision
                const distFromPlayer = vector.length(vector.sub(player.hairPos, player.pos));
                if (distFromPlayer > maxDist || player.hairPos.y < 0) {
                    player.hairReturn = true;
                }
                
                // Check moon collection with hair
                game.collectibles.forEach(moon => {
                    if (!moon.collected && player.hairPos) {
                        const dist = vector.length(vector.sub(player.hairPos, moon.pos));
                        if (dist < 1.5) {
                            moon.collected = true;
                            game.moons++;
                            updateHUD(game, kingdomConfigs, player);
                            showMessage('Hair Capture! Power Moon!', '#FFD700');
                            player.hairReturn = true;
                        }
                    }
                });

                // Check soup collection with hair
                if (game.powerSoups) {
                    game.powerSoups.forEach(soup => {
                        if (!soup.collected && player.hairPos) {
                            const dist = vector.length(vector.sub(player.hairPos, soup.pos));
                            if (dist < 1.5) {
                                soup.collected = true;
                                soup.collectedTime = Date.now();
                                // Apply soup buff
                                player.speedMultiplier = 1.6;
                                player.jumpMultiplier = 1.2;
                                player.soupTimer = 8.0;
                                showMessage('Hair Capture! Power Soup activated!', '#FF8C00');
                                player.hairReturn = true;
                            }
                        }
                    });
                }

                // Check walker collision with hair
                game.walkers.forEach(walker => {
                    if (walker.alive && player.hairPos) {
                        const dist = vector.length(vector.sub(player.hairPos, walker.pos));
                        if (dist < 1.5) {
                            walker.die();
                            player.hairReturn = true;
                            game.moons++;
                            game.moonsCollectedTotal++;
                            updateHUD(game, kingdomConfigs, player);
                            showMessage('Hair Hit! Enemy defeated!', '#FF8C00');
                            if (game.moonsCollectedTotal >= game.overallMoons) showCredits(game);
                        }
                    }
                });

                // boss hit detection
                if (game.boss && player.hairPos) {
                    if (game.boss.phase === 1) {
                        const dist = vector.length(vector.sub(player.hairPos, game.boss.peanutPos));
                        if (dist < 2) {
                            game.boss.onHit();
                            player.hairReturn = true;
                        }
                    } else if (game.boss.phase === 2) {
                        const dist = vector.length(vector.sub(player.hairPos, game.boss.robotPos));
                        if (dist < 3) {
                            game.boss.onHit();
                            player.hairReturn = true;
                        }
                    }
                }
            } else {
                // Hair returning
                const toPlayer = vector.sub(player.pos, player.hairPos);
                const dist = vector.length(toPlayer);
                
                if (dist < 1) {
                    // Hair returned
                    player.hairThrown = false;
                    player.hairPos = null;
                    player.hairVel = null;
                } else {
                    const returnDir = vector.normalize(toPlayer);
                    player.hairPos = vector.add(player.hairPos, vector.scale(returnDir, returnSpeed * dt));
                }
            }
        }

        // Kingdom switch via K
        if (kKey && !game.kWasPressed) {
            const kingdomKeys = Object.keys(kingdomConfigs);
            const currentIndex = kingdomKeys.indexOf(game.currentKingdom);
            const nextIndex = (currentIndex + 1) % kingdomKeys.length;
            loadKingdom(kingdomKeys[nextIndex]);
        }
        game.kWasPressed = kKey;
        // direct boss debug key B
        if (bKey && !game.bWasPressed) {
            loadKingdom('boss');
        }
        game.bWasPressed = bKey;
        
        // Boss stomp collision
        if (game.boss) {
            const toBoss = vector.sub(player.pos, game.boss.phase === 1 ? game.boss.peanutPos : game.boss.robotPos);
            const dist = vector.length(toBoss);
            if (player.vel.y < 0 && player.pos.y > ((game.boss.phase === 1 ? game.boss.peanutPos.y : game.boss.robotPos.y) + 1)) {
                if ((game.boss.phase === 1 && dist < 2) || (game.boss.phase === 2 && dist < 3)) {
                    game.boss.onHit();
                    player.vel.y = 12;
                }
            }
        }
        
        // Hub entrances (only when in hub world)
        if (game.currentKingdom === 'hub' && game.structures && !game.insidePyramid && player.onGround) {
            let nearest = null, bestDist = Infinity;
            game.structures.forEach(s => {
                if (s.type === 'entrance') {
                    const dx = player.pos.x - s.x;
                    const dz = player.pos.z - s.z;
                    const d = Math.hypot(dx, dz);
                    if (d < bestDist) {
                        bestDist = d;
                        nearest = s;
                    }
                }
            });
            if (nearest && bestDist < 4) {
                const target = nearest.target || 'cap';
                showMessage(`Press E to go to ${kingdomConfigs[target].name}`, '#FFD700');
                if (eKey && !game.eWasPressed) {
                    loadKingdom(target);
                }
            }
        }
        // Pyramid teleporter (only in Sand Kingdom)
        if (game.structures && !game.insidePyramid && player.onGround) {
            const pyramid = game.structures.find(s => s.type === 'pyramid' && s.hasInterior);
            if (pyramid) {
                const dx = player.pos.x - pyramid.x;
                const dz = player.pos.z - pyramid.z;
                const distToPyramid = Math.sqrt(dx * dx + dz * dz);
                
                if (distToPyramid < (pyramid.size || 15) * 1.2) {
                    showMessage('Press E to enter pyramid', '#FFD700');
                    
                    if (eKey && !game.eWasPressed) {
                        enterPyramid();
                    }
                }
            }
        } else if (game.insidePyramid && player.onGround && eKey && !game.eWasPressed) {
            exitPyramid();
        }
        game.eWasPressed = eKey;

        // Toggle RTX mode
        if (rKey && !game.rWasPressed) {
            game.rtxMode = !game.rtxMode;
            showMessage(game.rtxMode ? 'RTX Mode ON' : 'RTX Mode OFF', '#8AE234');
        }
        game.rWasPressed = rKey;


        // Update timers
        if (player.stateTimer > 0) {
            player.stateTimer -= dt;
            if (player.stateTimer <= 0 && (player.state === 'attacking' || player.state === 'longjump' || player.state === 'summersault')) {
                player.state = 'idle';
            }
        }

        // Update Power Soup timer
        if (player.soupTimer > 0) {
            player.soupTimer -= dt;
            if (player.soupTimer <= 0) {
                player.soupTimer = 0;
                player.speedMultiplier = 1.0;
                player.jumpMultiplier = 1.0;
                showMessage('Power Soup expired');
            }
        }

        // Handle landing from special states
        if (player.onGround) {
            if (player.groundPounding) {
                player.vel.x *= 0.1;
                player.vel.z *= 0.1;
                player.groundPounding = false;
                showMessage('Slam!', '#FF4500');
            }
            if (player.diving) {
                player.canDiveJump = true;
                player.vel.x *= 0.7;
                player.vel.z *= 0.7;
            } else {
                player.canDiveJump = false;
            }
            player.spinJumping = false;
        } else {
            // In air - no dive jump
            if (!player.diving) {
                player.canDiveJump = false;
            }
        }
        
        if (player.state === 'summersault' || player.state === 'spinjump') {
            player.rotation += dt * 15;
        }
        if (player.state === 'backflip') {
            player.rotation += dt * 8;
        }

        // Animation states
        const speed = Math.sqrt(player.vel.x ** 2 + player.vel.z ** 2);
        if (player.state === 'longjump' || player.state === 'summersault' || player.state === 'attacking' || 
            player.state === 'dive' || player.state === 'groundpound' || player.state === 'spinjump' || player.state === 'backflip') {
            // Keep special state
        } else if (!player.onGround) {
            player.state = 'jumping';
        } else if (speed > 1) {
            player.state = 'running';
            player.walkCycle += dt * 10;
        } else {
            player.state = 'idle';
            player.diving = false;
        }

        // Mario Sunshine-style damping (slower, more momentum)
        if (player.onGround) {
            player.vel.x *= 0.88;
            player.vel.z *= 0.88;
        } else {
            // Less air friction for better air control
            player.vel.x *= 0.97;
            player.vel.z *= 0.97;
        }

        // Update position
        player.pos.x += player.vel.x * dt;
        player.pos.y += player.vel.y * dt;
        player.pos.z += player.vel.z * dt;

        // Collect moons
        game.collectibles.forEach(moon => {
            if (!moon.collected) {
                const dist = vector.length(vector.sub(player.pos, moon.pos));
                if (dist < player.radius + moon.radius) {
                    moon.collected = true;
                    game.moons++;
                    game.moonsCollectedTotal++;
                    updateHUD(game, kingdomConfigs, player);
                    showMessage('Power Moon collected!');
                    if (game.moonsCollectedTotal >= game.overallMoons) {
                        showCredits(game);
                    }
                }
            }
        });

        // Collect Power Soups
        if (game.powerSoups) {
            game.powerSoups.forEach(soup => {
                if (!soup.collected) {
                    const dist = vector.length(vector.sub(player.pos, soup.pos));
                    if (dist < player.radius + soup.radius) {
                        soup.collected = true;
                        // Apply temporary buffs
                        player.speedMultiplier = 1.6;
                        player.jumpMultiplier = 1.2;
                        player.soupTimer = 8.0; // seconds
                        showMessage('Power Soup! Speed & Jump UP!', '#FF8C00');
                        // play brief powerup music rather than replace background
                        playEffect(getKingdomtrack().powerup, player.soupTimer);
                    }
                }
            });
        }

        // Update walkers and handle collisions with player
        game.walkers.forEach(walker => {
            walker.update(dt, game.platforms);

            if (!walker.alive) return;

            const dist = vector.length(vector.sub(player.pos, walker.pos));
            if (dist < player.radius + walker.radius) {
                // Stomp if player is falling onto the walker
                if (player.vel.y < -6 && player.pos.y > walker.pos.y + walker.radius * 0.4) {
                    walker.die();
                    player.vel.y = 12;
                    game.moons++;
                    game.moonsCollectedTotal++;
                    updateHUD(game, kingdomConfigs, player);
                    showMessage('Stomp!');
                    if (game.moonsCollectedTotal >= game.overallMoons) showCredits(game);
                } else if (player.state === 'attacking') {
                    walker.die();
                    player.vel.y = 6;
                    game.moons++;
                    game.moonsCollectedTotal++;
                    updateHUD(game, kingdomConfigs, player);
                    showMessage('Knockout!');
                    if (game.moonsCollectedTotal >= game.overallMoons) showCredits(game);
                } else {
                    // Hurt player
                    const knock = player.facingDir || vector.create(0,0,1);
                    player.vel.x = -knock.x * 12;
                    player.vel.z = -knock.z * 12;
                    showMessage('Ouch!');
                }
            }
        });

        // Clean up dead walkers after a short time
        game.walkers = game.walkers.filter(w => !( !w.alive && w.deadTimer > 2.0 ));

        // Update & draw power soups (draw happens in draw())
        if (game.powerSoups) {
            game.powerSoups = game.powerSoups.filter(s => !(s.collected && s.collectedTime && (Date.now() - s.collectedTime) > 2000));
        }

        // Camera
        const camDist = game.camera.distance / game.camera.zoom;
        const camHeight = 15 / game.camera.zoom;
        const targetCamPos = vector.add(player.pos, vector.create(
            -Math.sin(game.camera.yaw) * camDist,
            camHeight,
            -Math.cos(game.camera.yaw) * camDist
        ));
        game.camera.x += (targetCamPos.x - game.camera.x) * 0.1;
        game.camera.y += (targetCamPos.y - game.camera.y) * 0.1;
        game.camera.z += (targetCamPos.z - game.camera.z) * 0.1;
    }

    function draw() {
        engine.engineUpdate({x: game.camera.x, y: game.camera.y, z: game.camera.z}, player.pos);

        if (game.rtxMode) {
            console.warn("Warning: RTX mode not available for now");
        } else {
            // Normal render path
            drawStructures();
            game.platforms.forEach(platform => platform.draw());
            game.collectibles.forEach(moon => moon.draw());
            if (game.powerSoups) game.powerSoups.forEach(s => s.draw());
            game.walkers.forEach(w => w.draw());
            if (game.boss) game.boss.draw();
            drawJeff(player);
        }
    }

    function gameLoop(timestamp) {
        const deltaTime = timestamp - game.lastTime;
        game.lastTime = timestamp;

        // handle pause key here now that keydown listener is elsewhere
        const pKey = game.keys['p'] || game.keys['P'] || game.keys['KeyP'];
        if (pKey && !game.pWasPressed) togglePause(game);
        game.pWasPressed = pKey;

        update(deltaTime);
        draw();
        requestAnimationFrame(gameLoop);
    }

    beginbackgroundmusic(game.currentKingdom);

    showMessage('Welcome to Cap Kingdom!', '#FFD700');
    // start in the hub world so player can pick a level
    loadKingdom('hub');
    requestAnimationFrame(gameLoop);
})();
