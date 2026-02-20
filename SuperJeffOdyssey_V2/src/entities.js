import { vec3 } from './vec3.js';
import { multiplyMatrices, createTranslationMatrix, createScaleMatrix } from './matrix.js';

export class Planet {
    constructor(x, y, z, radius, mass) {
        this.pos = vec3.create(x, y, z);
        this.radius = radius;
        this.mass = mass;
        this.color = [0.42, 0.36, 0.9];
    }

    getGravityAt(pos) {
        const diff = vec3.sub(this.pos, pos);
        const dist = vec3.length(diff);
        const force = (this.mass * 30) / Math.max(dist * dist, 1); // BALANCED - between 25 and 35
        const dir = vec3.normalize(diff);
        return {
            force: vec3.scale(dir, force),
            dist: dist,
            dir: dir
        };
    }

    draw(gl, buffers, uniforms, viewMatrix, projMatrix) {
        const modelMatrix = multiplyMatrices(
            createTranslationMatrix(this.pos.x, this.pos.y, this.pos.z),
            createScaleMatrix(this.radius, this.radius, this.radius)
        );
        const mvp = multiplyMatrices(projMatrix, multiplyMatrices(viewMatrix, modelMatrix));

        gl.uniformMatrix4fv(uniforms.uMVP, false, mvp);
        gl.uniformMatrix4fv(uniforms.uModel, false, modelMatrix);
        gl.uniform3fv(uniforms.uColor, this.color);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.positionBuffer);
        gl.enableVertexAttribArray(uniforms.aPosition);
        gl.vertexAttribPointer(uniforms.aPosition, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normalBuffer);
        gl.enableVertexAttribArray(uniforms.aNormal);
        gl.vertexAttribPointer(uniforms.aNormal, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indexBuffer);
        gl.drawElements(gl.TRIANGLES, buffers.sphereIndexCount, gl.UNSIGNED_SHORT, 0);
    }
}

export class Star {
    constructor(x, y, z) {
        this.pos = vec3.create(x, y, z);
        this.radius = 0.3;
        this.collected = false;
        this.rotation = 0;
        this.color = [1.0, 0.83, 0.16];
    }

    draw(gl, buffers, uniforms, viewMatrix, projMatrix) {
        if (this.collected) return;
        
        this.rotation += 0.05;
        const modelMatrix = multiplyMatrices(
            createTranslationMatrix(this.pos.x, this.pos.y, this.pos.z),
            createScaleMatrix(this.radius, this.radius, this.radius)
        );
        const mvp = multiplyMatrices(projMatrix, multiplyMatrices(viewMatrix, modelMatrix));

        gl.uniformMatrix4fv(uniforms.uMVP, false, mvp);
        gl.uniformMatrix4fv(uniforms.uModel, false, modelMatrix);
        gl.uniform3fv(uniforms.uColor, this.color);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.positionBuffer);
        gl.enableVertexAttribArray(uniforms.aPosition);
        gl.vertexAttribPointer(uniforms.aPosition, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normalBuffer);
        gl.enableVertexAttribArray(uniforms.aNormal);
        gl.vertexAttribPointer(uniforms.aNormal, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indexBuffer);
        gl.drawElements(gl.TRIANGLES, buffers.sphereIndexCount, gl.UNSIGNED_SHORT, 0);
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
        this.pos = vec3.create(
            this.planet.pos.x + Math.cos(this.angle) * orbitRadius,
            this.planet.pos.y,
            this.planet.pos.z + Math.sin(this.angle) * orbitRadius
        );
    }

    update() {
        this.updatePosition();
    }

    draw(gl, buffers, uniforms, viewMatrix, projMatrix) {
        const modelMatrix = multiplyMatrices(
            createTranslationMatrix(this.pos.x, this.pos.y, this.pos.z),
            createScaleMatrix(this.radius, this.radius, this.radius)
        );
        const mvp = multiplyMatrices(projMatrix, multiplyMatrices(viewMatrix, modelMatrix));

        gl.uniformMatrix4fv(uniforms.uMVP, false, mvp);
        gl.uniformMatrix4fv(uniforms.uModel, false, modelMatrix);
        gl.uniform3fv(uniforms.uColor, this.color);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.positionBuffer);
        gl.enableVertexAttribArray(uniforms.aPosition);
        gl.vertexAttribPointer(uniforms.aPosition, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normalBuffer);
        gl.enableVertexAttribArray(uniforms.aNormal);
        gl.vertexAttribPointer(uniforms.aNormal, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indexBuffer);
        gl.drawElements(gl.TRIANGLES, buffers.sphereIndexCount, gl.UNSIGNED_SHORT, 0);
    }
}

// Walker: a ground-based "goomba-like" enemy that walks, can be stomped,
// and can be stacked to form a "walker tower" on top of structures.
export class Walker {
    constructor(x, z, y = 0) {
        this.pos = vec3.create(x, y, z);
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

        // Keep on top of nearest platform under walker, otherwise ground y=0
        let underY = 0;
        for (let p of platforms) {
            const halfW = p.width / 2;
            const halfD = p.depth / 2;
            if (this.pos.x >= p.pos.x - halfW - 0.5 && this.pos.x <= p.pos.x + halfW + 0.5 &&
                this.pos.z >= p.pos.z - halfD - 0.5 && this.pos.z <= p.pos.z + halfD + 0.5) {
                const top = p.pos.y + p.height / 2;
                if (top >= underY) underY = top;
            }
        }

        // Snap to platform top
        const targetY = underY + this.radius;
        // Smoothly adjust vertical position (so walker can fall slightly)
        this.pos.y += (targetY - this.pos.y) * Math.min(1, 10 * dt);

        // Turn around when reaching edges of platforms or beyond bounds
        // Basic check: see if there's ground a bit ahead in the facing direction
        const lookAheadX = this.pos.x + this.dir * (this.radius + 0.6);
        let hasSupportAhead = false;
        for (let p of platforms) {
            const halfW = p.width / 2;
            const halfD = p.depth / 2;
            if (lookAheadX >= p.pos.x - halfW && lookAheadX <= p.pos.x + halfW &&
                this.pos.z >= p.pos.z - halfD && this.pos.z <= p.pos.z + halfD) {
                hasSupportAhead = true;
                break;
            }
        }
        if (!hasSupportAhead && underY <= 0.01) {
            // on ground without support ahead, flip to avoid falling off cliffs
            this.dir *= -1;
        }
    }

    die() {
        this.alive = false;
        this.deadTimer = 0;
        this.color = [0.5, 0.5, 0.5];
    }

    draw(gl, buffers, uniforms, viewMatrix, projMatrix) {
        // If dead and beyond 1 second, skip drawing
        if (!this.alive && this.deadTimer > 1.0) return;

        const modelMatrix = multiplyMatrices(
            createTranslationMatrix(this.pos.x, this.pos.y, this.pos.z),
            createScaleMatrix(this.radius, this.radius, this.radius)
        );
        const mvp = multiplyMatrices(projMatrix, multiplyMatrices(viewMatrix, modelMatrix));

        gl.uniformMatrix4fv(uniforms.uMVP, false, mvp);
        gl.uniformMatrix4fv(uniforms.uModel, false, modelMatrix);
        gl.uniform3fv(uniforms.uColor, this.color);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.positionBuffer);
        gl.enableVertexAttribArray(uniforms.aPosition);
        gl.vertexAttribPointer(uniforms.aPosition, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normalBuffer);
        gl.enableVertexAttribArray(uniforms.aNormal);
        gl.vertexAttribPointer(uniforms.aNormal, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indexBuffer);
        gl.drawElements(gl.TRIANGLES, buffers.sphereIndexCount, gl.UNSIGNED_SHORT, 0);
    }
}
