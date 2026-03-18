import { engine, vector, game, kingdomConfigs, texBuffer } from './globals.js';
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
                // draw peanutmobile as a brown sphere
                engine.drawCylinder(this.peanutPos.x, this.peanutPos.y, this.peanutPos.z, 2, 2.5, {x: 0.6, y: 0.4, z: 0.2});
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

        // store a shape object that the collision module understands
        this.shape = {
            type: 'box',
            center: this.pos,
            width: this.width,
            height: this.height,
            depth: this.depth
        };
    }

    draw() {
        engine.drawTexCube(this.pos.x, this.pos.y, this.pos.z, this.width, this.height, this.depth, {x: this.color[0], y: this.color[1], z: this.color[2]}, true, {width: 32, height: 32, pixels: texBuffer});
    }
}
