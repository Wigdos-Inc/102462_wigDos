import { engine, vector, game, kingdomConfigs, texBuffer, BOX, CYLINDER, TRIANGLE, collision } from './globals.js';
import { showMessage, updateHUD } from './ui.js';
import { player } from './player.js';

// simple boss class for first encounter
export class Boss {
        constructor() {
            this.phase = 1; // 1 = peanutmobile, 2 = robot
            this.peanutAngle = 0;
            this.peanutPos = vector.create(0, 2, 0);
            this.robotHealth = 3;
            this.robotPos = vector.create(0, 4, 0);
            this.robotArmAngle = 0;
        }

        update(dt) {
            if (this.phase === 1) {
                // circle around arena center
                this.peanutAngle += dt * 0.5;
                const radius = 25;
                this.peanutPos.x = Math.cos(this.peanutAngle) * radius;
                this.peanutPos.z = Math.sin(this.peanutAngle) * radius;
            } else if (this.phase === 2) {
                // swing robot arms
                this.robotArmAngle += dt * 2.5;
            }
        }

        onHit() {
            if (this.phase === 1) {
                this.phase = 2;
                showMessage('Peanut down! Robot awakens!', '#FF0000');
                updateHUD(game, kingdomConfigs, player);
            } else if (this.phase === 2) {
                this.robotHealth -= 1;
                showMessage('Robot hit! ' + this.robotHealth + ' left', '#FF0000');
                updateHUD(game, kingdomConfigs, player);
                if (this.robotHealth <= 0) {
                    showMessage('Boss defeated!', '#00FF00');
                    // drop a moon as reward
                    game.collectibles.push(new PowerMoon(this.robotPos.x, this.robotPos.y + 5, this.robotPos.z));
                    game.boss = null;
                    updateHUD(game, kingdomConfigs, player);
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

                // Bronze pod body.
                engine.drawCylinder(px, py, pz, 2.35, 2.4, {x: 0.58, y: 0.33, z: 0.14});

                // Top rim / hatch ring.
                engine.drawCylinder(px, py + 1.05, pz, 1.2, 0.3, {x: 0.4, y: 0.24, z: 0.1});

                // Front intake/vent.
                engine.drawCylinder(px, py - 0.35, pz + 2.1, 0.48, 0.3, {x: 0.12, y: 0.12, z: 0.12});
                engine.drawCylinder(px, py - 0.35, pz + 2.23, 0.3, 0.12, {x: 0.24, y: 0.24, z: 0.24});

                // Side claws/arms.
                engine.drawCylinder(px - 2.25, py - 0.2, pz + 0.25, 0.25, 0.95, {x: 0.38, y: 0.38, z: 0.42});
                engine.drawCube(px - 2.65, py - 0.26, pz + 0.38, 0.24, 0.22, 0.55, {x: 0.65, y: 0.65, z: 0.7});
                engine.drawCylinder(px + 2.25, py - 0.2, pz + 0.25, 0.25, 0.95, {x: 0.38, y: 0.38, z: 0.42});
                engine.drawCube(px + 2.65, py - 0.26, pz + 0.38, 0.24, 0.22, 0.55, {x: 0.65, y: 0.65, z: 0.7});

                // Thruster flames.
                const flamePulse = 0.85 + Math.sin(t * 10) * 0.2;
                engine.drawCylinder(px - 1.55, py - 0.9, pz - 1.65, 0.24 * flamePulse, 1.2 * flamePulse, {x: 0.3, y: 0.7, z: 1.0});
                engine.drawCylinder(px - 1.55, py - 1.2, pz - 2.15, 0.18 * flamePulse, 0.95 * flamePulse, {x: 1.0, y: 0.8, z: 0.3});

                // Peanut pilot head.
                const hx = px;
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
                engine.drawCube(hx, hy - 0.26, hz + 0.78, 0.42, 0.12, 0.09, {x: 0.93, y: 0.93, z: 0.9});

                // Big curled mustache (stylized with two curl bulbs).
                engine.drawCylinder(hx - 0.26, hy - 0.14, hz + 0.82, 0.18, 0.72, {x: 0.36, y: 0.19, z: 0.08});
                engine.drawCylinder(hx + 0.26, hy - 0.14, hz + 0.82, 0.18, 0.72, {x: 0.36, y: 0.19, z: 0.08});
                engine.drawSphere(hx - 0.57, hy - 0.08, hz + 0.78, 0.14, {x: 0.36, y: 0.19, z: 0.08});
                engine.drawSphere(hx + 0.57, hy - 0.08, hz + 0.78, 0.14, {x: 0.36, y: 0.19, z: 0.08});

                // Glass canopy in front of controls.
                engine.drawCylinder(px, py + 1.15, pz + 0.9, 1.08, 0.58, {x: 0.65, y: 0.82, z: 0.95});
            } else {
                // body cube
                engine.drawCube(this.robotPos.x, this.robotPos.y, this.robotPos.z, 3, 3, 3, {x: 0.5, y: 0.5, z: 0.5});
                // arms
                const armLen = 6;
                const leftOffset = vector.create(-4, 0, 0);
                const rightOffset = vector.create(4, 0, 0);
                const ang = Math.sin(this.robotArmAngle) * 0.75;
                // left arm
                engine.drawCube(this.robotPos.x + leftOffset.x, this.robotPos.y, this.robotPos.z + leftOffset.z, armLen, 0.8, 0.8, {x: 0.5, y: 0.5, z: 0.5});
                // right arm
                engine.drawCube(this.robotPos.x + rightOffset.x, this.robotPos.y, this.robotPos.z + rightOffset.z, armLen, 0.8, 0.8, {x: 0.5, y: 0.5, z: 0.5});
            }
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
    constructor(x, y, z, width, height, depth, color) {
        this.pos = vector.create(x, y, z);
        this.width = width;
        this.height = height;
        this.depth = depth;
        this.color = color;
        this.shape = collision.createBox({x: this.pos.x, y: this.pos.y, z: this.pos.z}, this.width, this.height, this.depth);
    }

    draw() {
        engine.drawTexCube(this.pos.x, this.pos.y, this.pos.z, this.width, this.height, this.depth, {x: this.color[0], y: this.color[1], z: this.color[2]}, true, texBuffer);
    }
}
