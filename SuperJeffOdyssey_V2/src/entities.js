import { engine, vector } from './globals.js';
import { supportHeightAtXZ } from './libs/engine/engine.js';

export class Planet {
    constructor(x, y, z, radius, mass) {
        this.pos = vector.create(x, y, z);
        this.radius = radius;
        this.mass = mass;
        this.color = [0.42, 0.36, 0.9];
    }

    getGravityAt(pos) {
        const diff = vector.sub(this.pos, pos);
        const dist = vector.length(diff);
        const force = (this.mass * 30) / Math.max(dist * dist, 1); // BALANCED - between 25 and 35
        const dir = vector.normalize(diff);
        return {
            force: vector.scale(dir, force),
            dist: dist,
            dir: dir
        };
    }

    draw(viewMatrix, projMatrix) {
        const modelMatrix = multiplyMatrices(
            createTranslationMatrix(this.pos.x, this.pos.y, this.pos.z),
            createScaleMatrix(this.radius, this.radius, this.radius)
        );
        const mvp = multiplyMatrices(projMatrix, multiplyMatrices(viewMatrix, modelMatrix));
        createMesh(mvp, modelMatrix, this.color, buffers.sphereIndexCount);
    }
}

export class Star {
    constructor(x, y, z) {
        this.pos = vector.create(x, y, z);
        this.radius = 0.3;
        this.collected = false;
        this.rotation = 0;
        this.color = [1.0, 0.83, 0.16];
    }

    draw(viewMatrix, projMatrix) {
        if (this.collected) return;
        
        this.rotation += 0.05;
        const modelMatrix = multiplyMatrices(
            createTranslationMatrix(this.pos.x, this.pos.y, this.pos.z),
            createScaleMatrix(this.radius, this.radius, this.radius)
        );
        const mvp = multiplyMatrices(projMatrix, multiplyMatrices(viewMatrix, modelMatrix));
        createMesh(mvp, modelMatrix, this.color, buffers.sphereIndexCount);
    }
}

export class Enemy {
    constructor(planet) {
        this.planet = planet;
        this.angle = Math.random() * Math.PI * 2;
        this.speed = 0.01;
        this.radius = 0.4;
        this.color = [0.9, 0.3, 0.24];
        this.updatePosition();
    }

    updatePosition() {
        this.angle += this.speed;
        const orbitRadius = this.planet.radius + 0.5;
        this.pos = vector.create(
            this.planet.pos.x + Math.cos(this.angle) * orbitRadius,
            this.planet.pos.y,
            this.planet.pos.z + Math.sin(this.angle) * orbitRadius
        );
    }

    update() {
        this.updatePosition();
    }

    draw(viewMatrix, projMatrix) {
        const modelMatrix = multiplyMatrices(
            createTranslationMatrix(this.pos.x, this.pos.y, this.pos.z),
            createScaleMatrix(this.radius, this.radius, this.radius)
        );
        const mvp = multiplyMatrices(projMatrix, multiplyMatrices(viewMatrix, modelMatrix));
        createMesh(mvp, modelMatrix, this.color, buffers.sphereIndexCount);
    }
}

// Walker: a ground-based "goomba-like" enemy that walks, can be stomped,
// and can be stacked to form a "walker tower" on top of structures.

export class Walker {
    constructor(x, z, y = 0) {
        this.pos = vector.create(x, y, z);
        this.radius = 0.6;
        this.dir = Math.random() < 0.5 ? 1 : -1;
        this.speed = 3.5; // units per second
        this.color = [0.56, 0.27, 0.07];
        this.alive = true;
        this.deadTimer = 0;
    }

    update(dt, platforms) {
        if (!this.alive) {
            // Countdown to removal (squashed animation)
            this.deadTimer += dt;
            return;
        }

        // Move horizontally along X axis direction
        this.pos.x += this.dir * this.speed * dt;

        // determine where the walker should be standing by querying the
        // generic support-height function; falls back to ground at y=0
        const underY = supportHeightAtXZ(this.pos.x, this.pos.z, this.pos.y, platforms, 0);

        // Snap to surface
        const targetY = underY + this.radius;
        // Smoothly adjust vertical position (so walker can fall slightly)
        this.pos.y += (targetY - this.pos.y) * Math.min(1, 10 * dt);

        // Turn around when reaching edges of platforms or beyond bounds.
        // Query support height ahead of the walker; if the surface drops
        // below the current underY we consider it a cliff.
        const lookAheadX = this.pos.x + this.dir * (this.radius + 0.6);
        const aheadY = supportHeightAtXZ(lookAheadX, this.pos.z, this.pos.y, platforms, 0);
        if (aheadY < underY - 0.01) {
            this.dir *= -1;
        }
    }

    die() {
        this.alive = false;
        this.deadTimer = 0;
        this.color = [0.5, 0.5, 0.5];
    }

    draw() {
        // If dead and beyond 1 second, skip drawing
        if (!this.alive && this.deadTimer > 1.0) return;
        engine.drawSphere(this.pos.x, this.pos.y, this.pos.z, this.radius, {x: this.color[0], y: this.color[1], z: this.color[2]});
    }
}
