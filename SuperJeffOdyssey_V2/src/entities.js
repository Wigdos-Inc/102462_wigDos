import { engine, vector } from './globals.js';
import { supportHeightAtXZ } from './libs/engine/engine.js';

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
