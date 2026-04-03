import { add, normalize, vec3 } from './math3d.js';
import { moveWithWorldCollision } from './collision.js';

export class LegoPlayer {
    constructor(avatarLook) {
        this.position = vec3(0, 2.6, 0);
        this.velocity = vec3(0, 0, 0);
        this.size = vec3(1.2, 3.2, 1.2);
        this.moveSpeed = 12;
        this.jumpSpeed = 12;
        this.gravity = 30;
        this.grounded = false;
        this.avatarLook = avatarLook;
        this.walkTime = 0;
        this.animTime = 0;
        this.facingYaw = 0;
    }

    update(dt, input, worldBlocks, cameraYaw) {
        const moveInput = vec3(0, 0, 0);

        if (input.forward) moveInput.z += 1;
        if (input.backward) moveInput.z -= 1;
        if (input.left) moveInput.x -= 1;
        if (input.right) moveInput.x += 1;

        const n = normalize(moveInput);
        const localX = n.x;
        const localZ = n.z;

        // Build camera-relative basis on ground plane:
        // forward = (sin(yaw), cos(yaw)), right = (cos(yaw), -sin(yaw))
        const worldX = localX * Math.cos(cameraYaw) + localZ * Math.sin(cameraYaw);
        const worldZ = -localX * Math.sin(cameraYaw) + localZ * Math.cos(cameraYaw);

        this.velocity.x = worldX * this.moveSpeed;
        this.velocity.z = worldZ * this.moveSpeed;

        // Character faces movement direction.
        if (n.x !== 0 || n.z !== 0) {
            this.facingYaw = Math.atan2(worldX, worldZ);
        }

        if (input.jump && this.grounded) {
            this.velocity.y = this.jumpSpeed;
            this.grounded = false;
        }

        this.velocity.y -= this.gravity * dt;

        const result = moveWithWorldCollision(this.position, this.size, this.velocity, dt, worldBlocks);
        this.position = result.position;
        this.velocity = result.velocity;
        this.grounded = result.grounded;

        const horizontalSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
        this.animTime += dt;
        if (horizontalSpeed > 0.25) {
            this.walkTime += dt * 9;
        }
    }

    getCameraPivot() {
        // Midpoint of the avatar body (torso center).
        return add(this.position, vec3(0, 0.2, 0));
    }

    getRenderParts() {
        const skin = this.avatarLook.bodyColor;
        const shirt = this.avatarLook.shirtColor || skin;
        const hat = this.avatarLook.hatColor;

        const p = this.position;
        const moving = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z) > 0.25;
        const armSwing = moving ? Math.sin(this.walkTime) * 0.35 : 0;
        const legSwing = moving ? Math.sin(this.walkTime + Math.PI) * 0.35 : 0;
        const bodyBob = moving ? Math.abs(Math.sin(this.walkTime * 2)) * 0.08 : 0;
        const jumpBob = this.grounded ? 0 : -0.12;
        const bob = bodyBob + jumpBob;

        const parts = [
            // torso
            partAt(p, vec3(0, 0.2 + bob, 0), this.facingYaw, (c, yaw) => block(c, vec3(1.2, 1.4, 0.8), shirt, yaw)),
            // head (cylinder, old Roblox style)
            partAt(p, vec3(0, 1.55 + bob, 0), this.facingYaw, (c, yaw) => cylinder(c, 0.5, 0.95, skin, 12, yaw)),
            // face decal
            partAt(p, vec3(0, 1.58 + bob, 0.53), this.facingYaw, (c, yaw) => sprite(c, 0.92, 0.92, '../assets/images/smile.png', yaw)),
            // left arm
            partAt(p, vec3(-1.0, 0.2 + bob, armSwing), this.facingYaw, (c, yaw) => block(c, vec3(0.58, 1.35, 0.58), skin, yaw)),
            // right arm
            partAt(p, vec3(1.0, 0.2 + bob, -armSwing), this.facingYaw, (c, yaw) => block(c, vec3(0.58, 1.35, 0.58), skin, yaw)),
            // left leg
            partAt(p, vec3(-0.35, -1.2 + bob, legSwing), this.facingYaw, (c, yaw) => block(c, vec3(0.5, 1.4, 0.58), '#2f3e46', yaw)),
            // right leg
            partAt(p, vec3(0.35, -1.2 + bob, -legSwing), this.facingYaw, (c, yaw) => block(c, vec3(0.5, 1.4, 0.58), '#2f3e46', yaw))
        ];

        if (hat) {
            parts.push(partAt(p, vec3(0, 2.28 + bob, 0), this.facingYaw, (c, yaw) => cylinder(c, 0.58, 0.34, hat, 12, yaw)));
        }

        return parts;
    }
}

function partAt(base, localOffset, yaw, builder) {
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    const rotatedOffset = {
        x: localOffset.x * c - localOffset.z * s,
        y: localOffset.y,
        z: localOffset.x * s + localOffset.z * c
    };
    const center = add(base, rotatedOffset);
    return builder(center, yaw);
}

function block(center, size, color, rotationY = 0) {
    return { type: 'box', center, size, color, rotationY, solid: false };
}

function cylinder(center, radius, height, color, segments, rotationY = 0) {
    return { type: 'cylinder', center, radius, height, color, segments, rotationY, solid: false };
}

function sprite(center, width, height, url, rotationY = 0) {
    return {
        type: 'sprite',
        center,
        width,
        height,
        url,
        normal: {
            x: Math.sin(rotationY),
            y: 0,
            z: Math.cos(rotationY)
        },
        solid: false
    };
}
