import { engine, vector, game, kingdomConfigs, texBuffer, getTextureBuffer, BOX, CYLINDER, TRIANGLE, collision } from './globals.js';
import { showMessage, updateHUD } from './ui.js';
import { player } from './player.js';
import { playEffect } from './audio.js';

// simple boss class for first encounter
export class Boss {
        constructor() {
            this.phase = 1; // 1 = peanutmobile, 2 = robot
            this.peanutAngle = 0;
            this.peanutPos = vector.create(0, 2, 0);
            this.peanutHealth = 3;
            this.peanutMaxHealth = 3;
            this.peanutReactionTimer = 0;
            this.peanutHitFlash = 0;
            this.laughTimer = 3.2;
            this.rocketTimer = 1.5;
            this.rockets = [];
            this.laughLines = [
                'Peanutface: HAH! Too slow, Jeff!',
                'Peanutface: Feel my rockets, noodle boy!',
                'Peanutface: You cannot crack this shell!'
            ];
            this.lastLaugh = 0;

            this.robotMaxHealth = 3;
            this.robotHealth = this.robotMaxHealth;
            this.robotBaseY = 4;
            this.robotPos = vector.create(0, this.robotBaseY, 0);
            this.robotVel = vector.create(0, 0, 0);
            this.robotArmAngle = 0;
            this.robotJumpTimer = 1.2;
            this.robotArenaRadius = 42;
            this.robotStride = 0;
            this.robotHitFlash = 0;
            this.robotRage = false;
            this.robotRageMaxHealth = 5;
            this.robotRageTransition = 0;
            this.robotRocketTimer = 1.0;
        }

        update(dt) {
            if (this.phase === 1) {
                // circle around arena center
                this.peanutAngle += dt * 0.5;
                const radius = 25;
                this.peanutPos.x = Math.cos(this.peanutAngle) * radius;
                this.peanutPos.z = Math.sin(this.peanutAngle) * radius;
                this.peanutReactionTimer = Math.max(0, this.peanutReactionTimer - dt);
                this.peanutHitFlash = Math.max(0, this.peanutHitFlash - dt);

                this.laughTimer -= dt;
                if (this.laughTimer <= 0) {
                    this.lastLaugh = (this.lastLaugh + 1) % this.laughLines.length;
                    showMessage(this.laughLines[this.lastLaugh], '#FFAA44');
                    playEffect('sfx/p_sfx_6.mp3', 0.5);
                    this.laughTimer = 3.6 + (Math.random() * 2.4);
                }

                this.rocketTimer -= dt;
                if (this.rocketTimer <= 0) {
                    this.fireRocket();
                    this.rocketTimer = 1.2 + (Math.random() * 0.95);
                }

                this.updateRockets(dt);
            } else if (this.phase === 2) {
                this.robotHitFlash = Math.max(0, this.robotHitFlash - dt);
                if (this.robotRageTransition > 0) {
                    this.robotRageTransition -= dt;
                    this.robotArmAngle += dt * 12;
                    this.robotStride += dt * 9;
                    this.robotPos.y = this.robotBaseY + Math.abs(Math.sin(this.robotStride)) * 0.6;
                    return;
                }

                const toPlayerX = player.pos.x - this.robotPos.x;
                const toPlayerZ = player.pos.z - this.robotPos.z;
                const distXZ = Math.hypot(toPlayerX, toPlayerZ);

                const maxHp = this.robotRage ? this.robotRageMaxHealth : this.robotMaxHealth;
                const rageScale = this.robotRage ? 1.55 : 1.0;
                const moveAggro = (8 + Math.max(0, (maxHp - this.robotHealth)) * 1.4) * rageScale;
                const chaseX = distXZ > 1e-4 ? toPlayerX / distXZ : 0;
                const chaseZ = distXZ > 1e-4 ? toPlayerZ / distXZ : 0;
                const strafe = Math.sin(Date.now() * 0.004) * (this.robotRage ? 3.2 : 2.2);
                const targetVX = (chaseX * moveAggro) + (-chaseZ * strafe);
                const targetVZ = (chaseZ * moveAggro) + (chaseX * strafe);
                const steer = Math.min(1, dt * (this.robotRage ? 5.0 : 3.6));

                this.robotVel.x += (targetVX - this.robotVel.x) * steer;
                this.robotVel.z += (targetVZ - this.robotVel.z) * steer;

                this.robotJumpTimer -= dt;
                const onGround = this.robotPos.y <= this.robotBaseY + 0.02;
                if (onGround && this.robotJumpTimer <= 0) {
                    this.robotVel.y = (10.5 + Math.max(0, (maxHp - this.robotHealth)) * 1.8) * (this.robotRage ? 1.15 : 1.0);
                    this.robotJumpTimer = this.robotRage
                        ? (0.55 + Math.random() * 0.45)
                        : (1.1 + Math.random() * 0.8);
                }

                this.robotVel.y -= (this.robotRage ? 36 : 30) * dt;

                this.robotPos.x += this.robotVel.x * dt;
                this.robotPos.y += this.robotVel.y * dt;
                this.robotPos.z += this.robotVel.z * dt;

                if (this.robotPos.y < this.robotBaseY) {
                    this.robotPos.y = this.robotBaseY;
                    this.robotVel.y = 0;
                }

                const r = Math.hypot(this.robotPos.x, this.robotPos.z);
                if (r > this.robotArenaRadius) {
                    const nx = this.robotPos.x / r;
                    const nz = this.robotPos.z / r;
                    this.robotPos.x = nx * this.robotArenaRadius;
                    this.robotPos.z = nz * this.robotArenaRadius;

                    const dotOut = (this.robotVel.x * nx) + (this.robotVel.z * nz);
                    if (dotOut > 0) {
                        this.robotVel.x -= nx * dotOut * 1.35;
                        this.robotVel.z -= nz * dotOut * 1.35;
                    }
                }

                const groundSpeed = Math.hypot(this.robotVel.x, this.robotVel.z);
                this.robotStride += groundSpeed * dt * 0.35;
                this.robotArmAngle += dt * (3.4 + groundSpeed * 0.15);

                if (this.robotRage) {
                    this.robotRocketTimer -= dt;
                    if (this.robotRocketTimer <= 0) {
                        this.fireRobotRocketBurst();
                        this.robotRocketTimer = 0.55 + Math.random() * 0.45;
                    }
                    this.updateRockets(dt);
                }
            }
        }

        fireRocket() {
            const origin = vector.create(this.peanutPos.x, this.peanutPos.y + 0.35, this.peanutPos.z);
            const toPlayer = vector.sub(player.pos, origin);
            const aim = vector.normalize(vector.create(toPlayer.x, Math.max(-0.2, Math.min(0.5, toPlayer.y * 0.07)), toPlayer.z));
            const speed = 20;

            const rocket = {
                pos: vector.create(origin.x, origin.y, origin.z),
                vel: vector.scale(aim, speed),
                life: 4.5,
                radius: 0.55,
                spin: Math.random() * Math.PI * 2
            };
            this.rockets.push(rocket);
            playEffect('sfx/p_sfx_5.mp3', 0.35);
        }

        fireRobotRocketBurst() {
            const origin = vector.create(this.robotPos.x, this.robotPos.y + 0.8, this.robotPos.z);
            const toPlayer = vector.normalize(vector.sub(player.pos, origin));
            const spread = [-0.25, 0, 0.25];
            for (let i = 0; i < spread.length; i++) {
                const s = spread[i];
                const sx = (toPlayer.x * Math.cos(s)) - (toPlayer.z * Math.sin(s));
                const sz = (toPlayer.x * Math.sin(s)) + (toPlayer.z * Math.cos(s));
                this.rockets.push({
                    pos: vector.create(origin.x, origin.y, origin.z),
                    vel: vector.create(sx * 24, 2.8, sz * 24),
                    life: 3.6,
                    radius: 0.62,
                    spin: Math.random() * Math.PI * 2
                });
            }
            playEffect('sfx/p_sfx_5.mp3', 0.35);
        }

        updateRockets(dt) {
            for (let i = this.rockets.length - 1; i >= 0; i--) {
                const r = this.rockets[i];
                r.life -= dt;
                r.spin += dt * 13;
                r.vel.y -= 6 * dt;
                r.pos = vector.add(r.pos, vector.scale(r.vel, dt));

                if (r.life <= 0 || r.pos.y < -1 || Math.hypot(r.pos.x, r.pos.z) > 70) {
                    this.rockets.splice(i, 1);
                }
            }
        }

        checkRocketHit(playerPos, playerRadius) {
            for (let i = this.rockets.length - 1; i >= 0; i--) {
                const r = this.rockets[i];
                const d = vector.length(vector.sub(playerPos, r.pos));
                if (d <= (playerRadius + r.radius)) {
                    const hit = { pos: vector.create(r.pos.x, r.pos.y, r.pos.z) };
                    this.rockets.splice(i, 1);
                    return hit;
                }
            }
            return null;
        }

        getHealthInfo() {
            if (this.phase === 1) {
                return {
                    label: 'Peanutface',
                    current: Math.max(0, this.peanutHealth),
                    max: this.peanutMaxHealth,
                    rage: false
                };
            }

            if (this.phase === 2) {
                return {
                    label: this.robotRage ? 'Peanut Titan RAGE' : 'Peanut Titan',
                    current: Math.max(0, this.robotHealth),
                    max: this.robotRage ? this.robotRageMaxHealth : this.robotMaxHealth,
                    rage: this.robotRage
                };
            }

            return null;
        }

        onHit(cause = 'stomp') {
            if (this.phase === 1) {
                this.peanutHealth -= 1;
                this.peanutReactionTimer = 0.75;
                this.peanutHitFlash = 0.55;

                if (cause === 'stomp') {
                    showMessage('Peanutface: OW! You bounced on me?!', '#FFAA55');
                } else {
                    showMessage('Peanutface: Cheap shot, Jeff!', '#FFAA55');
                }

                this.rocketTimer = 0.35;
                this.peanutAngle += 0.35;
                playEffect('sfx/p_sfx_7.mp3', 0.5);

                if (this.peanutHealth <= 0) {
                    this.phase = 2;
                    this.robotPos = vector.create(this.peanutPos.x, this.robotBaseY, this.peanutPos.z);
                    this.robotVel = vector.create(0, 0, 0);
                    this.robotJumpTimer = 0.8;
                    this.rockets = [];
                    showMessage('Peanut down! Robot awakens!', '#FF0000');
                }
                updateHUD(game, kingdomConfigs, player);
            } else if (this.phase === 2) {
                if (this.robotRageTransition > 0) return;

                this.robotHealth -= 1;
                this.robotHitFlash = 0.42;
                showMessage('Robot hit! ' + this.robotHealth + ' left', '#FF0000');
                playEffect('sfx/p_sfx_9.mp3', 0.45);
                updateHUD(game, kingdomConfigs, player);
                if (this.robotHealth <= 0) {
                    if (!this.robotRage) {
                        this.robotRage = true;
                        this.robotRageTransition = 1.8;
                        this.robotHealth = this.robotRageMaxHealth;
                        this.robotRocketTimer = 0.4;
                        this.robotVel = vector.create(0, 0, 0);
                        showMessage('Peanut Titan enters RAGE MODE!', '#FF3300');
                        playEffect('sfx/p_sfx_6.mp3', 0.6);
                    } else {
                        showMessage('Boss defeated!', '#00FF00');
                        // drop a moon as reward
                        game.collectibles.push(new PowerMoon(this.robotPos.x, this.robotPos.y + 5, this.robotPos.z));
                        game.boss = null;
                        updateHUD(game, kingdomConfigs, player);
                    }
                }
            }
        }

        draw() {
            if (this.phase === 1) {
                const t = Date.now() * 0.002;
                const bob = Math.sin(t * 2.1) * 0.1;
                const px = this.peanutPos.x;
                const py = this.peanutPos.y + bob;
                const pz = this.peanutPos.z;
                const reactTilt = this.peanutReactionTimer > 0 ? Math.sin(t * 55) * 0.18 : 0;

                const brassTex = getTextureBuffer('brick');
                const metalTex = getTextureBuffer('stone');
                const glassTex = getTextureBuffer('tile');

                const flash = this.peanutHitFlash > 0 ? 0.2 : 0;
                const brassColor = {x: 0.62 + flash, y: 0.36 + flash * 0.3, z: 0.14};
                const metalColor = {x: 0.45 + flash * 0.2, y: 0.46 + flash * 0.2, z: 0.5 + flash * 0.2};

                // Bronze pod body.
                engine.drawCylinder(px, py, pz, 2.35, 2.4, brassColor);
                engine.drawTexCube(px, py - 0.55, pz, 3.5, 0.5, 3.1, brassColor, true, brassTex);
                engine.drawTexCube(px, py + 0.72, pz, 2.8, 0.36, 2.6, metalColor, true, metalTex);

                // Top rim / hatch ring.
                engine.drawCylinder(px, py + 1.05, pz, 1.2, 0.3, {x: 0.4, y: 0.24, z: 0.1});
                engine.drawTexCube(px, py + 1.2, pz - 0.15, 1.8, 0.16, 1.25, metalColor, true, metalTex);

                // Front intake/vent.
                engine.drawCylinder(px, py - 0.35, pz + 2.1, 0.48, 0.3, {x: 0.12, y: 0.12, z: 0.12});
                engine.drawCylinder(px, py - 0.35, pz + 2.23, 0.3, 0.12, {x: 0.24, y: 0.24, z: 0.24});
                engine.drawTexCube(px, py - 0.22, pz + 1.78, 1.7, 0.26, 0.2, {x: 0.3, y: 0.3, z: 0.3}, true, metalTex);

                // Side claws/arms.
                engine.drawCylinder(px - 2.25, py - 0.2, pz + 0.25, 0.25, 0.95, {x: 0.38, y: 0.38, z: 0.42});
                engine.drawCube(px - 2.65, py - 0.26, pz + 0.38, 0.24, 0.22, 0.55, {x: 0.65, y: 0.65, z: 0.7});
                engine.drawCylinder(px + 2.25, py - 0.2, pz + 0.25, 0.25, 0.95, {x: 0.38, y: 0.38, z: 0.42});
                engine.drawCube(px + 2.65, py - 0.26, pz + 0.38, 0.24, 0.22, 0.55, {x: 0.65, y: 0.65, z: 0.7});
                engine.drawTexCube(px - 2.32, py + 0.2, pz - 0.52, 0.46, 0.32, 0.7, metalColor, true, metalTex);
                engine.drawTexCube(px + 2.32, py + 0.2, pz - 0.52, 0.46, 0.32, 0.7, metalColor, true, metalTex);

                // Thruster flames.
                const flamePulse = 0.85 + Math.sin(t * 10) * 0.2;
                engine.drawCylinder(px - 1.55, py - 0.9, pz - 1.65, 0.24 * flamePulse, 1.2 * flamePulse, {x: 0.3, y: 0.7, z: 1.0});
                engine.drawCylinder(px + 1.55, py - 0.9, pz - 1.65, 0.24 * flamePulse, 1.2 * flamePulse, {x: 0.3, y: 0.7, z: 1.0});
                engine.drawCylinder(px - 1.55, py - 1.2, pz - 2.15, 0.18 * flamePulse, 0.95 * flamePulse, {x: 1.0, y: 0.8, z: 0.3});
                engine.drawCylinder(px + 1.55, py - 1.2, pz - 2.15, 0.18 * flamePulse, 0.95 * flamePulse, {x: 1.0, y: 0.8, z: 0.3});

                // Peanut pilot head.
                const hx = px + reactTilt;
                const hy = py + 1.95;
                const hz = pz + 0.25;
                engine.drawCylinder(hx, hy, hz, 0.88, 1.65, {x: 0.75, y: 0.57, z: 0.33});

                // Helmet and goggles.
                engine.drawCylinder(hx, hy + 0.92, hz - 0.02, 0.92, 0.46, {x: 0.12, y: 0.12, z: 0.15});
                engine.drawCylinder(hx - 0.27, hy + 1.08, hz + 0.41, 0.18, 0.1, {x: 0.56, y: 0.46, z: 0.28});
                engine.drawCylinder(hx + 0.27, hy + 1.08, hz + 0.41, 0.18, 0.1, {x: 0.56, y: 0.46, z: 0.28});

                // Eyes.
                engine.drawSphere(hx - 0.22, hy + 0.24, hz + 0.7, 0.18, {x: 0.96, y: 0.96, z: 0.96});
                engine.drawSphere(hx + 0.22, hy + 0.24, hz + 0.7, 0.18, {x: 0.96, y: 0.96, z: 0.96});
                engine.drawSphere(hx - 0.2, hy + 0.22, hz + 0.84, 0.08, {x: 0.1, y: 0.1, z: 0.1});
                engine.drawSphere(hx + 0.2, hy + 0.22, hz + 0.84, 0.08, {x: 0.1, y: 0.1, z: 0.1});

                // Angry eyebrows.
                engine.drawCube(hx - 0.28, hy + 0.45, hz + 0.7, 0.38, 0.08, 0.08, {x: 0.3, y: 0.17, z: 0.08});
                engine.drawCube(hx + 0.28, hy + 0.45, hz + 0.7, 0.38, 0.08, 0.08, {x: 0.3, y: 0.17, z: 0.08});

                // Nose and teethy grin.
                engine.drawSphere(hx, hy + 0.02, hz + 0.84, 0.11, {x: 0.7, y: 0.5, z: 0.28});
                const mouthOpen = 0.07 + Math.abs(Math.sin(Date.now() * 0.012)) * 0.08;
                engine.drawCube(hx, hy - 0.26, hz + 0.78, 0.42, mouthOpen, 0.09, {x: 0.93, y: 0.93, z: 0.9});

                // Big curled mustache (stylized with two curl bulbs).
                engine.drawCylinder(hx - 0.26, hy - 0.14, hz + 0.82, 0.18, 0.72, {x: 0.36, y: 0.19, z: 0.08});
                engine.drawCylinder(hx + 0.26, hy - 0.14, hz + 0.82, 0.18, 0.72, {x: 0.36, y: 0.19, z: 0.08});
                engine.drawSphere(hx - 0.57, hy - 0.08, hz + 0.78, 0.14, {x: 0.36, y: 0.19, z: 0.08});
                engine.drawSphere(hx + 0.57, hy - 0.08, hz + 0.78, 0.14, {x: 0.36, y: 0.19, z: 0.08});

                // Glass canopy in front of controls.
                engine.drawCylinder(px, py + 1.15, pz + 0.9, 1.08, 0.58, {x: 0.65, y: 0.82, z: 0.95});
                engine.drawTexCube(px, py + 0.95, pz + 1.25, 1.65, 0.28, 0.14, {x: 0.7, y: 0.9, z: 1.0}, true, glassTex);

                for (let i = 0; i < this.rockets.length; i++) {
                    const r = this.rockets[i];
                    const flicker = 0.85 + Math.sin(Date.now() * 0.02 + r.spin) * 0.2;
                    engine.drawCylinder(r.pos.x, r.pos.y, r.pos.z, 0.18, 0.85, {x: 0.6, y: 0.6, z: 0.62});
                    engine.drawSphere(r.pos.x, r.pos.y + 0.38, r.pos.z, 0.15, {x: 0.9, y: 0.2, z: 0.1});
                    engine.drawCylinder(r.pos.x, r.pos.y - 0.42, r.pos.z, 0.08 * flicker, 0.45 * flicker, {x: 1.0, y: 0.72, z: 0.25});
                }
            } else {
                const jumpLift = this.robotPos.y - this.robotBaseY;
                const bodyBob = Math.sin(this.robotStride) * 0.25;
                const bodyY = this.robotPos.y + bodyBob;
                const rage = this.robotRage;
                const flash = this.robotHitFlash > 0 ? 0.2 : 0;

                const plateTex = getTextureBuffer('stone');
                const hazardTex = getTextureBuffer('brick');
                const jointTex = getTextureBuffer('pebble');

                const bodyColor = rage
                    ? {x: 0.34 + flash, y: 0.28 + flash * 0.4, z: 0.3 + flash * 0.25}
                    : {x: 0.5 + flash * 0.3, y: 0.5 + flash * 0.2, z: 0.5 + flash * 0.2};
                const topColor = rage
                    ? {x: 0.72, y: 0.12, z: 0.12}
                    : {x: 0.62, y: 0.22, z: 0.22};

                // body cube
                engine.drawTexCube(this.robotPos.x, bodyY, this.robotPos.z, 3.2, 3.1, 3.0, bodyColor, true, plateTex);
                engine.drawTexCube(this.robotPos.x, bodyY + 0.95, this.robotPos.z, 1.7, 0.3, 1.7, topColor, true, hazardTex);
                engine.drawSphere(this.robotPos.x - 0.45, bodyY + 0.3, this.robotPos.z + 1.55, 0.22, {x: 0.95, y: 0.95, z: 0.95});
                engine.drawSphere(this.robotPos.x + 0.45, bodyY + 0.3, this.robotPos.z + 1.55, 0.22, {x: 0.95, y: 0.95, z: 0.95});
                engine.drawSphere(this.robotPos.x - 0.45, bodyY + 0.3, this.robotPos.z + 1.72, 0.09, {x: 0.1, y: 0.1, z: 0.1});
                engine.drawSphere(this.robotPos.x + 0.45, bodyY + 0.3, this.robotPos.z + 1.72, 0.09, {x: 0.1, y: 0.1, z: 0.1});

                if (rage) {
                    // Damaged armor details in rage mode.
                    engine.drawCube(this.robotPos.x - 1.0, bodyY + 0.2, this.robotPos.z + 1.58, 0.9, 0.1, 0.1, {x: 0.15, y: 0.05, z: 0.05});
                    engine.drawCube(this.robotPos.x + 0.95, bodyY - 0.25, this.robotPos.z + 1.55, 0.95, 0.1, 0.1, {x: 0.15, y: 0.05, z: 0.05});
                    const ember = 0.2 + Math.abs(Math.sin(Date.now() * 0.02)) * 0.25;
                    engine.drawSphere(this.robotPos.x + 0.25, bodyY + 0.1, this.robotPos.z + 1.65, ember, {x: 1.0, y: 0.25, z: 0.1});
                }

                // arms
                const armLen = 5.8;
                const armSwing = Math.sin(this.robotArmAngle) * 1.2;
                const armLift = Math.cos(this.robotArmAngle * 1.15) * 0.55 + jumpLift * 0.3;
                // left arm
                engine.drawTexCube(this.robotPos.x - 3.7 + armSwing * 0.45, bodyY + armLift, this.robotPos.z + armSwing * 0.2, armLen, 0.82, 0.82, {x: 0.54, y: 0.54, z: 0.57}, true, plateTex);
                engine.drawSphere(this.robotPos.x - 1.95 + armSwing * 0.25, bodyY + armLift, this.robotPos.z + armSwing * 0.2, 0.38, {x: 0.42, y: 0.42, z: 0.45});
                // right arm
                engine.drawTexCube(this.robotPos.x + 3.7 - armSwing * 0.45, bodyY - armLift * 0.5, this.robotPos.z - armSwing * 0.2, armLen, 0.82, 0.82, {x: 0.54, y: 0.54, z: 0.57}, true, plateTex);
                engine.drawSphere(this.robotPos.x + 1.95 - armSwing * 0.25, bodyY - armLift * 0.5, this.robotPos.z - armSwing * 0.2, 0.38, {x: 0.42, y: 0.42, z: 0.45});

                // legs / stomp pistons
                engine.drawTexCube(this.robotPos.x - 0.85, bodyY - 1.85, this.robotPos.z - 0.55, 0.9, 1.9 + Math.max(0, jumpLift * 0.4), 0.9, {x: 0.4, y: 0.4, z: 0.44}, true, jointTex);
                engine.drawTexCube(this.robotPos.x + 0.85, bodyY - 1.85, this.robotPos.z - 0.55, 0.9, 1.9 + Math.max(0, jumpLift * 0.4), 0.9, {x: 0.4, y: 0.4, z: 0.44}, true, jointTex);
                engine.drawCube(this.robotPos.x - 0.85, bodyY - 3.0, this.robotPos.z - 0.55, 1.2, 0.35, 1.25, {x: 0.25, y: 0.25, z: 0.28});
                engine.drawCube(this.robotPos.x + 0.85, bodyY - 3.0, this.robotPos.z - 0.55, 1.2, 0.35, 1.25, {x: 0.25, y: 0.25, z: 0.28});

                for (let i = 0; i < this.rockets.length; i++) {
                    const r = this.rockets[i];
                    const flicker = 0.85 + Math.sin(Date.now() * 0.02 + r.spin) * 0.2;
                    engine.drawCylinder(r.pos.x, r.pos.y, r.pos.z, 0.2, 0.95, {x: 0.62, y: 0.62, z: 0.64});
                    engine.drawSphere(r.pos.x, r.pos.y + 0.42, r.pos.z, 0.17, {x: 0.95, y: 0.2, z: 0.1});
                    engine.drawCylinder(r.pos.x, r.pos.y - 0.48, r.pos.z, 0.09 * flicker, 0.52 * flicker, {x: 1.0, y: 0.52, z: 0.22});
                }
            }
        }
    }

const MINI_BOSS_META = {
    cap: {
        id: 'kasew',
        name: 'Kasew Face',
        intro: 'Kasew Face crashes in: "Crunch time, Jeff!"',
        outro: 'Kasew Face: "My shell... shattered..."',
        hp: 3,
        baseColor: [0.8, 0.62, 0.34]
    },
    cascade: {
        id: 'wilnut',
        name: 'Wilnut Face',
        intro: 'Wilnut Face stomps in: "You will be walnut dust!"',
        outro: 'Wilnut Face: "Impossible... I cracked first..."',
        hp: 4,
        baseColor: [0.56, 0.4, 0.26]
    },
    sand: {
        id: 'almun',
        name: 'Almun Face',
        intro: 'Almun Face glides in: "The dunes obey me!"',
        outro: 'Almun Face: "The sands... swallow my pride..."',
        hp: 5,
        baseColor: [0.86, 0.78, 0.54]
    }
};

export class MiniBoss {
    constructor(kingdomKey, x = 0, y = 4, z = 0) {
        const meta = MINI_BOSS_META[kingdomKey] || MINI_BOSS_META.cap;
        this.kingdomKey = kingdomKey;
        this.id = meta.id;
        this.name = meta.name;
        this.meta = meta;

        this.pos = vector.create(x, y, z);
        this.baseY = y;
        this.vel = vector.create(0, 0, 0);
        this.radius = 2.2;
        this.baseMaxHp = meta.hp;
        this.maxHp = meta.hp;
        this.hp = this.maxHp;
        this.rageMaxHp = Math.max(2, meta.hp + 1);
        this.rageActivated = false;

        this.state = 'intro'; // intro -> fight -> rage_intro -> outro -> defeated
        this.stateTimer = 2.8;
        this.stateTime = 0;

        this.attackTimer = 1.2;
        this.patternTimer = 1.0;
        this.teleportTimer = 2.8;
        this.jumpTimer = 1.0;
        this.dashTimer = 0;
        this.dashDir = vector.create(0, 0, 1);

        this.projectiles = [];
        this.hitFlash = 0;
        this.bodySpin = 0;
        this.bodyBob = 0;
        this._landedLast = true;

        showMessage(meta.intro, '#FFAA55');
        playEffect('sfx/p_sfx_6.mp3', 0.55);
    }

    isCutscene() {
        return this.state === 'intro' || this.state === 'rage_intro' || this.state === 'outro';
    }

    isFightActive() {
        return this.state === 'fight';
    }

    _fireProjectile(origin, velocity, radius = 0.35, life = 3.2, tint = [0.95, 0.5, 0.18]) {
        this.projectiles.push({
            pos: vector.create(origin.x, origin.y, origin.z),
            vel: vector.create(velocity.x, velocity.y, velocity.z),
            radius,
            life,
            tint,
            spin: Math.random() * Math.PI * 2
        });
    }

    _faceTowardPlayer() {
        const toPlayer = vector.sub(player.pos, this.pos);
        const len = Math.hypot(toPlayer.x, toPlayer.z);
        if (len > 1e-4) {
            return vector.create(toPlayer.x / len, 0, toPlayer.z / len);
        }
        return vector.create(0, 0, 1);
    }

    _moveInsideArena(dt, arenaRadius = 44) {
        this.pos.x += this.vel.x * dt;
        this.pos.y += this.vel.y * dt;
        this.pos.z += this.vel.z * dt;

        this.vel.y -= 26 * dt;
        if (this.pos.y < this.baseY) {
            this.pos.y = this.baseY;
            this.vel.y = 0;
        }

        const r = Math.hypot(this.pos.x, this.pos.z);
        if (r > arenaRadius) {
            const nx = this.pos.x / r;
            const nz = this.pos.z / r;
            this.pos.x = nx * arenaRadius;
            this.pos.z = nz * arenaRadius;
            const outward = this.vel.x * nx + this.vel.z * nz;
            if (outward > 0) {
                this.vel.x -= nx * outward * 1.35;
                this.vel.z -= nz * outward * 1.35;
            }
        }
    }

    _updateKasew(dt) {
        const dir = this._faceTowardPlayer();
        const rageBoost = this.rageActivated ? 1.45 : 1.0;

        this.patternTimer -= dt;
        this.attackTimer -= dt;

        if (this.dashTimer > 0) {
            this.dashTimer -= dt;
            this.vel.x = this.dashDir.x * (18 * rageBoost);
            this.vel.z = this.dashDir.z * (18 * rageBoost);
        } else {
            const side = vector.create(-dir.z, 0, dir.x);
            this.vel.x = (dir.x * 5.4 + side.x * Math.sin(Date.now() * 0.007) * 2.2) * rageBoost;
            this.vel.z = (dir.z * 5.4 + side.z * Math.sin(Date.now() * 0.007) * 2.2) * rageBoost;

            if (this.patternTimer <= 0) {
                this.patternTimer = this.rageActivated ? 1.3 : 2.1;
                this.dashDir = vector.create(dir.x, 0, dir.z);
                this.dashTimer = this.rageActivated ? 0.95 : 0.7;
                showMessage('Kasew Face charges!', '#FFCC66');
                playEffect('sfx/p_sfx_5.mp3', 0.35);
            }
        }

        if (this.attackTimer <= 0) {
            this.attackTimer = this.rageActivated ? 0.65 : 1.15;
            const origin = vector.create(this.pos.x, this.pos.y + 1.0, this.pos.z);
            const shot = vector.create(dir.x * 14 * rageBoost, 2.5, dir.z * 14 * rageBoost);
            this._fireProjectile(origin, shot, this.rageActivated ? 0.36 : 0.32, 2.8, [0.98, 0.72, 0.22]);
            if (this.rageActivated) {
                const side = vector.create(-dir.z, 0, dir.x);
                this._fireProjectile(origin, vector.create((dir.x + side.x * 0.25) * 13.5, 2.2, (dir.z + side.z * 0.25) * 13.5), 0.3, 2.3, [1.0, 0.4, 0.1]);
            }
        }
    }

    _updateWilnut(dt) {
        const dir = this._faceTowardPlayer();
        const rageBoost = this.rageActivated ? 1.4 : 1.0;
        this.attackTimer -= dt;
        this.jumpTimer -= dt;

        this.vel.x += ((dir.x * 4.5 * rageBoost) - this.vel.x) * Math.min(1, dt * 2.5 * rageBoost);
        this.vel.z += ((dir.z * 4.5 * rageBoost) - this.vel.z) * Math.min(1, dt * 2.5 * rageBoost);

        const onGround = this.pos.y <= this.baseY + 0.03;
        if (onGround && this.jumpTimer <= 0) {
            this.vel.y = this.rageActivated ? 13.2 : 10.8;
            this.jumpTimer = this.rageActivated ? (0.75 + Math.random() * 0.25) : (1.25 + Math.random() * 0.35);
        }

        if (onGround && !this._landedLast) {
            // Shock-ring on landing.
            const ringCount = this.rageActivated ? 12 : 8;
            const ringSpeed = this.rageActivated ? 13 : 10;
            for (let i = 0; i < ringCount; i++) {
                const a = (i / ringCount) * Math.PI * 2;
                const v = vector.create(Math.cos(a) * ringSpeed, 1.2, Math.sin(a) * ringSpeed);
                this._fireProjectile(vector.create(this.pos.x, this.pos.y + 0.35, this.pos.z), v, 0.28, 1.9, [0.78, 0.52, 0.25]);
            }
            playEffect('sfx/p_sfx_4.mp3', 0.35);
        }
        this._landedLast = onGround;

        if (this.attackTimer <= 0) {
            this.attackTimer = this.rageActivated ? 0.95 : 1.8;
            const origin = vector.create(this.pos.x, this.pos.y + 1.3, this.pos.z);
            const shot = vector.create(dir.x * 11 * rageBoost, 3.4, dir.z * 11 * rageBoost);
            this._fireProjectile(origin, shot, this.rageActivated ? 0.44 : 0.38, 3.2, [0.66, 0.44, 0.2]);
        }
    }

    _updateAlmun(dt) {
        const dir = this._faceTowardPlayer();
        const rageBoost = this.rageActivated ? 1.35 : 1.0;
        this.attackTimer -= dt;
        this.teleportTimer -= dt;

        const tangent = vector.create(-dir.z, 0, dir.x);
        const targetX = tangent.x * 8.5 + dir.x * 2.2;
        const targetZ = tangent.z * 8.5 + dir.z * 2.2;
        this.vel.x += ((targetX * rageBoost) - this.vel.x) * Math.min(1, dt * 2.7 * rageBoost);
        this.vel.z += ((targetZ * rageBoost) - this.vel.z) * Math.min(1, dt * 2.7 * rageBoost);

        if (this.teleportTimer <= 0) {
            const ang = Math.random() * Math.PI * 2;
            const dist = 16 + Math.random() * 10;
            this.pos.x = player.pos.x + Math.cos(ang) * dist;
            this.pos.z = player.pos.z + Math.sin(ang) * dist;
            this.teleportTimer = this.rageActivated ? (1.25 + Math.random() * 0.75) : (2.4 + Math.random() * 1.3);
            playEffect('sfx/p_sfx_2.mp3', 0.4);
            showMessage('Almun Face blinks through the dunes!', '#EEDDAA');
        }

        if (this.attackTimer <= 0) {
            this.attackTimer = this.rageActivated ? 0.5 : 0.95;
            const origin = vector.create(this.pos.x, this.pos.y + 1.1, this.pos.z);
            const spread = this.rageActivated ? [-0.38, -0.18, 0, 0.18, 0.38] : [-0.25, 0, 0.25];
            for (let i = 0; i < spread.length; i++) {
                const s = spread[i];
                const sx = (dir.x * Math.cos(s)) - (dir.z * Math.sin(s));
                const sz = (dir.x * Math.sin(s)) + (dir.z * Math.cos(s));
                this._fireProjectile(origin, vector.create(sx * 12.5 * rageBoost, 2.0, sz * 12.5 * rageBoost), this.rageActivated ? 0.32 : 0.27, 2.7, [0.96, 0.9, 0.45]);
            }
            playEffect('sfx/p_sfx_1.mp3', 0.25);
        }
    }

    _updateProjectiles(dt) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.life -= dt;
            p.spin += dt * 12;
            p.vel.y -= 4.5 * dt;
            p.pos = vector.add(p.pos, vector.scale(p.vel, dt));
            if (p.life <= 0 || p.pos.y < -1 || Math.hypot(p.pos.x, p.pos.z) > 75) {
                this.projectiles.splice(i, 1);
            }
        }
    }

    update(dt) {
        this.stateTime += dt;
        this.hitFlash = Math.max(0, this.hitFlash - dt);
        this.bodySpin += dt * 1.25;
        this.bodyBob = Math.sin(this.stateTime * 3.2) * 0.15;

        if (this.state === 'intro') {
            this.stateTimer -= dt;
            this.pos.y = this.baseY + Math.max(0, this.stateTimer * 0.6) + this.bodyBob;
            if (this.stateTimer <= 0) {
                this.state = 'fight';
                this.stateTimer = 0;
                showMessage(`${this.name}: Fight me if you dare!`, '#FFCC55');
            }
            return;
        }

        if (this.state === 'rage_intro') {
            this.stateTimer -= dt;
            this.bodySpin += dt * 7;
            this.pos.y = this.baseY + Math.abs(Math.sin(this.bodySpin * 1.4)) * 0.4;
            if (this.stateTimer <= 0) {
                this.state = 'fight';
                showMessage(`${this.name} RAGE MODE!`, '#FF3300');
            }
            return;
        }

        if (this.state === 'outro') {
            this.stateTimer -= dt;
            this.pos.y += dt * 1.1;
            this.bodySpin += dt * 4;
            if (this.stateTimer <= 0) {
                this.state = 'defeated';
            }
            return;
        }

        if (this.state !== 'fight') {
            return;
        }

        if (this.kingdomKey === 'cap') this._updateKasew(dt);
        else if (this.kingdomKey === 'cascade') this._updateWilnut(dt);
        else this._updateAlmun(dt);

        this._moveInsideArena(dt, 44);
        this._updateProjectiles(dt);
    }

    onHit(cause = 'stomp') {
        if (this.state !== 'fight') return false;

        this.hp -= 1;
        this.hitFlash = 0.42;
        this.patternTimer = Math.max(this.patternTimer, 0.5);

        if (cause === 'stomp') {
            showMessage(`${this.name}: You bounced on me?!`, '#FFAA66');
        } else {
            showMessage(`${this.name}: Cheap trick!`, '#FFAA66');
        }
        playEffect('sfx/p_sfx_7.mp3', 0.42);

        if (this.hp <= 0) {
            if (!this.rageActivated) {
                this.rageActivated = true;
                this.state = 'rage_intro';
                this.stateTimer = 1.8;
                this.projectiles.length = 0;
                this.maxHp = this.rageMaxHp;
                this.hp = this.maxHp;
                this.patternTimer = 0.4;
                this.attackTimer = 0.45;
                this.teleportTimer = 0.35;
                showMessage(`${this.name} is beat down but goes berserk!`, '#FF3300');
                playEffect('sfx/p_sfx_6.mp3', 0.55);
            } else {
                this.state = 'outro';
                this.stateTimer = 2.6;
                this.projectiles.length = 0;
                showMessage(this.meta.outro, '#66FFAA');
                playEffect('sfx/p_sfx_9.mp3', 0.6);
            }
        }

        return true;
    }

    getHealthInfo() {
        if (this.state === 'defeated') return null;
        return {
            label: this.rageActivated ? `${this.name} RAGE` : this.name,
            current: Math.max(0, this.hp),
            max: this.maxHp,
            rage: this.rageActivated
        };
    }

    checkPlayerHit(playerPos, playerRadius) {
        if (this.state !== 'fight') return null;

        const bodyDist = vector.length(vector.sub(playerPos, this.pos));
        if (bodyDist < this.radius + playerRadius * 0.85) {
            const away = vector.normalize(vector.sub(playerPos, this.pos));
            return { type: 'body', pos: this.pos, normal: away };
        }

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            const d = vector.length(vector.sub(playerPos, p.pos));
            if (d < p.radius + playerRadius) {
                this.projectiles.splice(i, 1);
                const away = vector.normalize(vector.sub(playerPos, p.pos));
                return { type: 'projectile', pos: p.pos, normal: away };
            }
        }
        return null;
    }

    _drawProjectiles() {
        for (let i = 0; i < this.projectiles.length; i++) {
            const p = this.projectiles[i];
            const c = p.tint;
            const pulse = 0.9 + Math.sin(Date.now() * 0.018 + p.spin) * 0.2;
            engine.drawSphere(p.pos.x, p.pos.y, p.pos.z, p.radius * pulse, {x: c[0], y: c[1], z: c[2]});
            engine.drawCylinder(p.pos.x, p.pos.y - p.radius * 0.6, p.pos.z, p.radius * 0.45, p.radius * 1.6, {x: 0.2, y: 0.2, z: 0.2});
        }
    }

    draw() {
        if (this.state === 'defeated') return;

        const flash = this.hitFlash > 0 ? 0.22 : 0;
        const cx = this.pos.x;
        const cy = this.pos.y + this.bodyBob;
        const cz = this.pos.z;

        const metalTex = getTextureBuffer('stone');
        const rockTex = getTextureBuffer('pebble');
        const brassTex = getTextureBuffer('wood');
        const faceTex = getTextureBuffer('brick');
        const bladeTex = getTextureBuffer('tile');

        const base = this.meta.baseColor;
        const rageDarken = this.rageActivated ? 0.62 : 1.0;
        const shellColor = {
            x: (base[0] * rageDarken) + flash,
            y: (base[1] * rageDarken) + flash * 0.45,
            z: (base[2] * rageDarken) + (this.rageActivated ? 0.04 : 0)
        };

        if (this.kingdomKey === 'cap') {
            // Kasew: flying crescent pilot with goggles and claw boosters.
            const side = Math.sin(this.bodySpin * 2.6) * 0.35;

            engine.drawSphere(cx - 0.55, cy + 1.2, cz, 1.65, shellColor);
            engine.drawSphere(cx + 0.75, cy + 1.05, cz + 0.06, 1.1, shellColor);
            engine.drawTexCube(cx - 0.12, cy + 2.15, cz, 2.55, 0.45, 1.95, {x: 0.42, y: 0.31, z: 0.2}, true, metalTex);

            engine.drawSphere(cx - 0.5, cy + 1.82, cz + 1.02, 0.38, {x: 0.82, y: 0.92, z: 0.98});
            engine.drawSphere(cx + 0.22, cy + 1.8, cz + 1.0, 0.36, {x: 0.82, y: 0.92, z: 0.98});
            engine.drawSphere(cx - 0.5, cy + 1.8, cz + 1.14, 0.16, {x: 0.1, y: 0.14, z: 0.22});
            engine.drawSphere(cx + 0.22, cy + 1.78, cz + 1.12, 0.15, {x: 0.1, y: 0.14, z: 0.22});

            engine.drawTexCube(cx - 0.12, cy + 1.0, cz + 1.36, 1.2, 0.24, 0.16, {x: 0.35, y: 0.22, z: 0.12}, true, faceTex);
            for (let i = 0; i < 4; i++) {
                const tx = cx - 0.56 + i * 0.28;
                engine.drawCube(tx, cy + 0.88, cz + 1.43, 0.12, 0.16, 0.1, {x: 0.95, y: 0.93, z: 0.87});
            }

            engine.drawTexCube(cx - 2.25, cy + 0.55 + side, cz + 0.08, 1.45, 0.35, 0.7, {x: 0.46, y: 0.34, z: 0.2}, true, brassTex);
            engine.drawTexCube(cx + 2.1, cy + 0.62 - side, cz + 0.08, 1.45, 0.35, 0.7, {x: 0.46, y: 0.34, z: 0.2}, true, brassTex);

            for (let i = 0; i < 3; i++) {
                const t = -0.22 + i * 0.22;
                engine.drawSphere(cx - 2.95, cy + 0.45 + side, cz + t, 0.13, {x: 0.84, y: 0.84, z: 0.86});
                engine.drawSphere(cx + 2.8, cy + 0.52 - side, cz + t, 0.13, {x: 0.84, y: 0.84, z: 0.86});
            }

            const flame = 0.56 + Math.abs(Math.sin(this.stateTime * 9.2)) * 0.22;
            engine.drawCylinder(cx - 0.35, cy - 0.3, cz - 0.35, 0.24, 0.7, {x: 0.3, y: 0.3, z: 0.32});
            engine.drawCylinder(cx + 0.3, cy - 0.3, cz - 0.35, 0.24, 0.7, {x: 0.3, y: 0.3, z: 0.32});
            engine.drawSphere(cx - 0.35, cy - 0.85 - flame * 0.22, cz - 0.35, flame * 0.42, {x: 1.0, y: 0.48, z: 0.12});
            engine.drawSphere(cx + 0.3, cy - 0.85 - flame * 0.22, cz - 0.35, flame * 0.42, {x: 1.0, y: 0.6, z: 0.18});
        } else if (this.kingdomKey === 'cascade') {
            // Wilnut: armored rock titan with spikes, beard, and heavy claws.
            const stomp = Math.abs(Math.sin(this.bodySpin * 1.35)) * 0.35;

            engine.drawSphere(cx, cy + 1.15, cz, 1.75, {x: 0.38 + flash * 0.2, y: 0.3 + flash * 0.1, z: 0.22});
            engine.drawTexCube(cx, cy + 0.75, cz, 2.8, 1.55, 2.6, {x: 0.36, y: 0.32, z: 0.28}, true, rockTex);

            engine.drawTexCube(cx, cy + 2.1, cz, 2.2, 0.5, 2.05, {x: 0.52, y: 0.5, z: 0.5}, true, metalTex);
            for (let i = 0; i < 8; i++) {
                const a = (i / 8) * Math.PI * 2;
                engine.drawCylinder(cx + Math.cos(a) * 1.05, cy + 2.45, cz + Math.sin(a) * 1.0, 0.08, 0.45, {x: 0.8, y: 0.8, z: 0.82});
            }

            engine.drawSphere(cx - 0.46, cy + 1.75, cz + 1.22, 0.2, {x: 0.96, y: 0.74, z: 0.24});
            engine.drawSphere(cx + 0.46, cy + 1.75, cz + 1.22, 0.2, {x: 0.96, y: 0.74, z: 0.24});
            engine.drawSphere(cx - 0.46, cy + 1.73, cz + 1.34, 0.09, {x: 0.1, y: 0.08, z: 0.06});
            engine.drawSphere(cx + 0.46, cy + 1.73, cz + 1.34, 0.09, {x: 0.1, y: 0.08, z: 0.06});

            engine.drawTexCube(cx - 0.85, cy + 1.35, cz + 1.38, 0.9, 0.2, 0.14, {x: 0.55, y: 0.4, z: 0.24}, true, faceTex);
            engine.drawTexCube(cx + 0.85, cy + 1.35, cz + 1.38, 0.9, 0.2, 0.14, {x: 0.55, y: 0.4, z: 0.24}, true, faceTex);
            engine.drawTexCube(cx, cy + 0.95, cz + 1.25, 1.0, 0.52, 0.18, {x: 0.46, y: 0.34, z: 0.22}, true, faceTex);

            engine.drawTexCube(cx - 2.15, cy + 0.6 - stomp, cz + 0.15, 1.35, 0.78, 0.78, {x: 0.33, y: 0.28, z: 0.24}, true, metalTex);
            engine.drawTexCube(cx + 2.15, cy + 0.6 - stomp, cz + 0.15, 1.35, 0.78, 0.78, {x: 0.33, y: 0.28, z: 0.24}, true, metalTex);
            for (let i = 0; i < 3; i++) {
                const offs = -0.25 + i * 0.25;
                engine.drawSphere(cx - 2.95, cy + 0.35 - stomp, cz + offs, 0.15, {x: 0.74, y: 0.74, z: 0.76});
                engine.drawSphere(cx + 2.95, cy + 0.35 - stomp, cz + offs, 0.15, {x: 0.74, y: 0.74, z: 0.76});
            }

            const fire = 0.72 + Math.abs(Math.sin(this.stateTime * 7.6)) * 0.25;
            engine.drawCylinder(cx - 0.52, cy - 0.52, cz - 0.22, 0.28, 0.72, {x: 0.28, y: 0.28, z: 0.3});
            engine.drawCylinder(cx + 0.52, cy - 0.52, cz - 0.22, 0.28, 0.72, {x: 0.28, y: 0.28, z: 0.3});
            engine.drawSphere(cx - 0.52, cy - 1.15 - fire * 0.2, cz - 0.22, fire * 0.46, {x: 1.0, y: 0.45, z: 0.1});
            engine.drawSphere(cx + 0.52, cy - 1.15 - fire * 0.2, cz - 0.22, fire * 0.46, {x: 1.0, y: 0.5, z: 0.12});
        } else {
            // Almun: sharp rocket duelist with blue eyes, mustache, and blade body.
            const sway = Math.sin(this.bodySpin * 2.0) * 0.28;

            engine.drawTexCube(cx, cy + 1.6, cz, 2.15, 3.75, 1.75, {x: 0.58 + flash * 0.2, y: 0.38 + flash * 0.15, z: 0.2}, true, bladeTex);
            engine.drawTexCube(cx, cy + 2.75, cz + 0.1, 1.55, 0.65, 1.35, {x: 0.7, y: 0.46, z: 0.24}, true, metalTex);
            engine.drawTexCube(cx, cy + 0.3, cz + 1.18, 0.7, 1.45, 0.5, {x: 0.78, y: 0.52, z: 0.28}, true, bladeTex);

            engine.drawTexCube(cx, cy + 3.45, cz - 0.05, 0.52, 0.7, 0.46, {x: 0.82, y: 0.38, z: 0.15}, true, faceTex);
            engine.drawTexCube(cx, cy + 3.88, cz - 0.05, 0.35, 0.5, 0.3, {x: 0.86, y: 0.42, z: 0.16}, true, faceTex);

            engine.drawSphere(cx - 0.36, cy + 2.1, cz + 1.05, 0.19, {x: 0.45, y: 0.88, z: 1.0});
            engine.drawSphere(cx + 0.36, cy + 2.1, cz + 1.05, 0.19, {x: 0.45, y: 0.88, z: 1.0});
            engine.drawSphere(cx - 0.36, cy + 2.08, cz + 1.16, 0.08, {x: 0.1, y: 0.12, z: 0.16});
            engine.drawSphere(cx + 0.36, cy + 2.08, cz + 1.16, 0.08, {x: 0.1, y: 0.12, z: 0.16});
            engine.drawTexCube(cx - 0.62, cy + 1.62, cz + 1.18, 0.62, 0.12, 0.1, {x: 0.5, y: 0.32, z: 0.18}, true, faceTex);
            engine.drawTexCube(cx + 0.62, cy + 1.62, cz + 1.18, 0.62, 0.12, 0.1, {x: 0.5, y: 0.32, z: 0.18}, true, faceTex);
            engine.drawTexCube(cx, cy + 1.4, cz + 1.14, 0.15, 0.52, 0.12, {x: 0.5, y: 0.32, z: 0.18}, true, faceTex);

            engine.drawTexCube(cx - 1.72, cy + 1.0 + sway, cz + 0.15, 1.05, 0.38, 0.38, {x: 0.66, y: 0.42, z: 0.22}, true, metalTex);
            engine.drawTexCube(cx + 1.72, cy + 1.0 - sway, cz + 0.15, 1.05, 0.38, 0.38, {x: 0.66, y: 0.42, z: 0.22}, true, metalTex);
            engine.drawSphere(cx - 2.38, cy + 1.02 + sway, cz + 0.32, 0.16, {x: 0.96, y: 0.2, z: 0.12});
            engine.drawSphere(cx + 2.38, cy + 1.02 - sway, cz + 0.32, 0.16, {x: 0.96, y: 0.2, z: 0.12});

            const jet = 0.78 + Math.abs(Math.sin(this.stateTime * 8.6)) * 0.25;
            engine.drawCylinder(cx, cy - 0.85, cz - 0.1, 0.32, 1.08, {x: 0.28, y: 0.28, z: 0.3});
            engine.drawSphere(cx, cy - 1.65 - jet * 0.18, cz - 0.1, jet * 0.5, {x: 1.0, y: 0.58, z: 0.16});
        }

        if (this.rageActivated) {
            const ember = 0.12 + Math.abs(Math.sin(this.stateTime * 15)) * 0.12;
            engine.drawCube(cx - 0.82, cy + 1.02, cz + 1.2, 0.86, 0.08, 0.08, {x: 0.15, y: 0.03, z: 0.03});
            engine.drawCube(cx + 0.74, cy + 0.62, cz + 1.05, 0.78, 0.08, 0.08, {x: 0.15, y: 0.03, z: 0.03});
            engine.drawSphere(cx + 0.22, cy + 1.22, cz + 1.32, ember, {x: 1.0, y: 0.25, z: 0.1});
        }

        this._drawProjectiles();
    }
}

// Power Moon class
export class PowerMoon {
    constructor(x, y, z) {
        this.pos = vector.create(x, y, z);
        this.radius = 0.5;
        this.collected = false;
        this.rotation = 0;
        this.bobOffset = Math.random() * Math.PI * 2;
    }

    draw() {
        if (this.collected) return;
            
        this.rotation += 0.03;
        const bobY = Math.sin(Date.now() * 0.003 + this.bobOffset) * 0.3;
        engine.drawSphere(this.pos.x, this.pos.y + bobY, this.pos.z, this.radius, {x: 0.9, y: 0.9, z: 0.2});
    }
}

// Power Soup class - grants temporary buffs
export class PowerSoup {
    constructor(x, y, z) {
        this.pos = vector.create(x, y, z);
        this.radius = 0.6;
        this.collected = false;
        this.color = [0.95, 0.5, 0.05]; // soup orange
        this.bobOffset = Math.random() * Math.PI * 2;
    }

    draw() {
        if (this.collected) return;
        const bobY = Math.sin(Date.now() * 0.003 + this.bobOffset) * 0.25;
        engine.drawCylinder(this.pos.x, this.pos.y + bobY, this.pos.z, this.radius, this.radius * 0.6, {x: 0.95, y: 0.5, z: 0.05});
    }
}

// Platform wrapper around a box-shaped collision primitive.
// The collision logic has been pulled out into collision.js so that
// we can eventually support other shape types without duplicating code.
export class Platform {
    constructor(x, y, z, width, height, depth, color, texture = null) {
        this.pos = vector.create(x, y, z);
        this.width = width;
        this.height = height;
        this.depth = depth;
        this.color = color;
        this.texture = texture ? getTextureBuffer(texture) : texBuffer;
        this.shape = collision.createBox({x: this.pos.x, y: this.pos.y, z: this.pos.z}, this.width, this.height, this.depth);
    }

    draw() {
        engine.drawTexCube(this.pos.x, this.pos.y, this.pos.z, this.width, this.height, this.depth, {x: this.color[0], y: this.color[1], z: this.color[2]}, true, this.texture);
    }
}
