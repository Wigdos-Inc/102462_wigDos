import { clamp } from './math3d.js';

export function makeAabb(center, size) {
    return {
        minX: center.x - size.x * 0.5,
        maxX: center.x + size.x * 0.5,
        minY: center.y - size.y * 0.5,
        maxY: center.y + size.y * 0.5,
        minZ: center.z - size.z * 0.5,
        maxZ: center.z + size.z * 0.5
    };
}

export function aabbIntersects(a, b) {
    return (
        a.minX <= b.maxX &&
        a.maxX >= b.minX &&
        a.minY <= b.maxY &&
        a.maxY >= b.minY &&
        a.minZ <= b.maxZ &&
        a.maxZ >= b.minZ
    );
}

export function moveWithWorldCollision(position, size, velocity, dt, worldBlocks) {
    const result = {
        position: { ...position },
        velocity: { ...velocity },
        grounded: false
    };

    result.position.x += result.velocity.x * dt;
    resolveAxis(result, size, worldBlocks, 'x');

    result.position.y += result.velocity.y * dt;
    const touchedGround = resolveAxis(result, size, worldBlocks, 'y');
    if (touchedGround) {
        result.grounded = true;
    }

    result.position.z += result.velocity.z * dt;
    resolveAxis(result, size, worldBlocks, 'z');

    return result;
}

function resolveAxis(state, size, worldBlocks, axis) {
    const playerBox = makeAabb(state.position, size);
    let touchedGround = false;
    let corrected = false;
    let correctedValue = 0;

    const nearBlocks = getNearbySolidBlocks(state.position, size, worldBlocks);

    for (let i = 0; i < nearBlocks.length; i += 1) {
        const block = nearBlocks[i];
        const blockBox = makeAabb(block.center, block.size);

        if (axis === 'x') {
            if (!overlap(playerBox.minY, playerBox.maxY, blockBox.minY, blockBox.maxY)) continue;
            if (!overlap(playerBox.minZ, playerBox.maxZ, blockBox.minZ, blockBox.maxZ)) continue;

            if (state.velocity.x > 0 && playerBox.maxX > blockBox.minX && playerBox.minX < blockBox.minX) {
                const candidate = blockBox.minX - size.x * 0.5;
                if (!corrected || candidate < correctedValue) {
                    corrected = true;
                    correctedValue = candidate;
                }
            }

            if (state.velocity.x < 0 && playerBox.minX < blockBox.maxX && playerBox.maxX > blockBox.maxX) {
                const candidate = blockBox.maxX + size.x * 0.5;
                if (!corrected || candidate > correctedValue) {
                    corrected = true;
                    correctedValue = candidate;
                }
            }
        }

        if (axis === 'y') {
            if (!overlap(playerBox.minX, playerBox.maxX, blockBox.minX, blockBox.maxX)) continue;
            if (!overlap(playerBox.minZ, playerBox.maxZ, blockBox.minZ, blockBox.maxZ)) continue;

            if (state.velocity.y > 0 && playerBox.maxY > blockBox.minY && playerBox.minY < blockBox.minY) {
                const candidate = blockBox.minY - size.y * 0.5;
                if (!corrected || candidate < correctedValue) {
                    corrected = true;
                    correctedValue = candidate;
                }
            }

            if (state.velocity.y < 0 && playerBox.minY < blockBox.maxY && playerBox.maxY > blockBox.maxY) {
                const candidate = blockBox.maxY + size.y * 0.5;
                if (!corrected || candidate > correctedValue) {
                    corrected = true;
                    correctedValue = candidate;
                    touchedGround = true;
                }
            }
        }

        if (axis === 'z') {
            if (!overlap(playerBox.minX, playerBox.maxX, blockBox.minX, blockBox.maxX)) continue;
            if (!overlap(playerBox.minY, playerBox.maxY, blockBox.minY, blockBox.maxY)) continue;

            if (state.velocity.z > 0 && playerBox.maxZ > blockBox.minZ && playerBox.minZ < blockBox.minZ) {
                const candidate = blockBox.minZ - size.z * 0.5;
                if (!corrected || candidate < correctedValue) {
                    corrected = true;
                    correctedValue = candidate;
                }
            }

            if (state.velocity.z < 0 && playerBox.minZ < blockBox.maxZ && playerBox.maxZ > blockBox.maxZ) {
                const candidate = blockBox.maxZ + size.z * 0.5;
                if (!corrected || candidate > correctedValue) {
                    corrected = true;
                    correctedValue = candidate;
                }
            }
        }
    }

    if (corrected) {
        state.position[axis] = correctedValue;
        state.velocity[axis] = 0;
    }

    state.position.x = clamp(state.position.x, -120, 120);
    state.position.z = clamp(state.position.z, -120, 120);

    return touchedGround;
}

function overlap(aMin, aMax, bMin, bMax) {
    return aMin <= bMax && aMax >= bMin;
}

function getNearbySolidBlocks(position, size, worldBlocks) {
    const out = [];
    const rangeX = size.x + 8;
    const rangeY = size.y + 8;
    const rangeZ = size.z + 8;

    for (let i = 0; i < worldBlocks.length; i += 1) {
        const block = worldBlocks[i];
        if (!block.solid) continue;

        if (Math.abs(block.center.x - position.x) > rangeX + block.size.x) continue;
        if (Math.abs(block.center.y - position.y) > rangeY + block.size.y) continue;
        if (Math.abs(block.center.z - position.z) > rangeZ + block.size.z) continue;

        out.push(block);
    }

    return out;
}
