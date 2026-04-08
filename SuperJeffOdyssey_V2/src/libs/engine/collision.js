import { collision } from './../../globals.js';

const EPSILON = 1e-5;

function isFiniteVec3(v) {
    return !!v && Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);
}

function normalizeShapeRef(shapeOrWrapper) {
    if (!shapeOrWrapper) return null;
    return shapeOrWrapper.shape || shapeOrWrapper;
}

function shapeAABB(shape, radiusPadding = 0) {
    if (!shape) return null;

    if (shape.type === 0) {
        const halfW = shape.width * 0.5;
        const halfH = shape.height * 0.5;
        const halfD = shape.depth * 0.5;
        return {
            minX: shape.center.x - halfW - radiusPadding,
            maxX: shape.center.x + halfW + radiusPadding,
            minY: shape.center.y - halfH - radiusPadding,
            maxY: shape.center.y + halfH + radiusPadding,
            minZ: shape.center.z - halfD - radiusPadding,
            maxZ: shape.center.z + halfD + radiusPadding
        };
    }

    if (shape.type === 1) {
        const halfH = shape.height * 0.5;
        return {
            minX: shape.center.x - shape.radius - radiusPadding,
            maxX: shape.center.x + shape.radius + radiusPadding,
            minY: shape.center.y - halfH - radiusPadding,
            maxY: shape.center.y + halfH + radiusPadding,
            minZ: shape.center.z - shape.radius - radiusPadding,
            maxZ: shape.center.z + shape.radius + radiusPadding
        };
    }

    if (shape.type === 2) {
        return {
            minX: Math.min(shape.a.x, shape.b.x, shape.c.x) - radiusPadding,
            maxX: Math.max(shape.a.x, shape.b.x, shape.c.x) + radiusPadding,
            minY: Math.min(shape.a.y, shape.b.y, shape.c.y) - radiusPadding,
            maxY: Math.max(shape.a.y, shape.b.y, shape.c.y) + radiusPadding,
            minZ: Math.min(shape.a.z, shape.b.z, shape.c.z) - radiusPadding,
            maxZ: Math.max(shape.a.z, shape.b.z, shape.c.z) + radiusPadding
        };
    }

    return null;
}

function sphereCouldTouchShape(shape, pos, radius) {
    const bounds = shapeAABB(shape, radius);
    if (!bounds) return true;
    return (
        pos.x >= bounds.minX && pos.x <= bounds.maxX &&
        pos.y >= bounds.minY && pos.y <= bounds.maxY &&
        pos.z >= bounds.minZ && pos.z <= bounds.maxZ
    );
}

function canSphereReachShape(shape, x, y, z, radius) {
    if (!shape) return false;

    if (shape.type === 0) {
        const halfW = shape.width * 0.5;
        const halfH = shape.height * 0.5;
        const halfD = shape.depth * 0.5;
        const dx = Math.abs(x - shape.center.x);
        const dz = Math.abs(z - shape.center.z);
        if (dx > halfW + radius || dz > halfD + radius) return false;
        if (y < shape.center.y - halfH - radius) return false;
        if (y > shape.center.y + halfH + radius) return false;
        return true;
    }

    if (shape.type === 1) {
        const dx = x - shape.center.x;
        const dz = z - shape.center.z;
        const maxR = shape.radius + radius;
        if (dx * dx + dz * dz > maxR * maxR) return false;
        const top = shape.center.y + shape.height * 0.5;
        const bottom = shape.center.y - shape.height * 0.5;
        if (y < bottom - radius) return false;
        if (y > top + radius) return false;
        return true;
    }

    if (shape.type === 2) {
        const minX = Math.min(shape.a.x, shape.b.x, shape.c.x) - radius;
        const maxX = Math.max(shape.a.x, shape.b.x, shape.c.x) + radius;
        const minY = Math.min(shape.a.y, shape.b.y, shape.c.y) - radius;
        const maxY = Math.max(shape.a.y, shape.b.y, shape.c.y) + radius;
        const minZ = Math.min(shape.a.z, shape.b.z, shape.c.z) - radius;
        const maxZ = Math.max(shape.a.z, shape.b.z, shape.c.z) + radius;
        return x >= minX && x <= maxX && y >= minY && y <= maxY && z >= minZ && z <= maxZ;
    }

    return true;
}

export function supportHeightAtXZ(x, z, y, shapes, defaultHeight = 0, radius = 0.5) {
    const hasDefault = defaultHeight !== null && defaultHeight !== undefined;
    let maxY = hasDefault ? defaultHeight : null;

    if (!Array.isArray(shapes) || shapes.length === 0) {
        return maxY;
    }

    const spherePos = { x, y, z };
    const maxSupportY = y + radius;

    for (let i = 0; i < shapes.length; i++) {
        const wrapper = shapes[i];
        const shape = wrapper && wrapper.shape ? wrapper.shape : wrapper;
        if (!shape) continue;

        // Fast path: if point-over-footprint gives a valid top support, use it and skip expensive WASM call.
        const flatSupport = collision.heightAtXZ(shape, x, z);
        if (flatSupport !== null) {
            if (flatSupport <= maxSupportY && (maxY === null || flatSupport > maxY)) {
                maxY = flatSupport;
            }
            continue;
        }

        if (!canSphereReachShape(shape, x, y, z, radius)) {
            continue;
        }

        const hit = collision.sphereIntersectsShape(spherePos, radius, shape);
        if (hit && hit.hit && hit.normal && hit.normal.y > 0) {
            // Resolve penetration along the collision normal and convert center Y -> support Y.
            const candidate = y + (hit.normal.y * hit.depth) - radius;
            if (candidate <= y + 1e-4 && (maxY === null || candidate > maxY)) {
                maxY = candidate;
            }
        }
    }

    return maxY;
}

export function resolveSphereCollisions(position, radius, shapes, options = {}) {
    const maxIterations = Number.isFinite(options.maxIterations) ? Math.max(1, options.maxIterations) : 4;
    const pushEpsilon = Number.isFinite(options.pushEpsilon) ? Math.max(0, options.pushEpsilon) : 1e-4;

    if (!position || !Array.isArray(shapes) || shapes.length === 0) {
        return {
            position: position ? { x: position.x, y: position.y, z: position.z } : { x: 0, y: 0, z: 0 },
            hits: [],
            collided: false
        };
    }

    const pos = { x: position.x, y: position.y, z: position.z };
    const hits = [];

    for (let iter = 0; iter < maxIterations; iter++) {
        let movedThisPass = false;

        for (let i = 0; i < shapes.length; i++) {
            const wrapper = shapes[i];
            const shape = normalizeShapeRef(wrapper);
            if (!shape) continue;
            if (!sphereCouldTouchShape(shape, pos, radius)) continue;

            const hit = collision.sphereIntersectsShape(pos, radius, shape);
            if (!hit || !hit.hit || !isFiniteVec3(hit.normal) || !Number.isFinite(hit.depth)) continue;
            if (hit.depth <= EPSILON) continue;

            const correction = hit.depth + pushEpsilon;
            pos.x += hit.normal.x * correction;
            pos.y += hit.normal.y * correction;
            pos.z += hit.normal.z * correction;

            hits.push({
                normal: { x: hit.normal.x, y: hit.normal.y, z: hit.normal.z },
                depth: hit.depth,
                shape
            });

            movedThisPass = true;
        }

        if (!movedThisPass) break;
    }

    return {
        position: pos,
        hits,
        collided: hits.length > 0
    };
}

export function resolveSphereMotion(position, velocity, dt, radius, shapes, options = {}) {
    const target = {
        x: position.x + velocity.x * dt,
        y: position.y + velocity.y * dt,
        z: position.z + velocity.z * dt
    };

    const result = resolveSphereCollisions(target, radius, shapes, options);
    const outVel = { x: velocity.x, y: velocity.y, z: velocity.z };

    for (let i = 0; i < result.hits.length; i++) {
        const n = result.hits[i].normal;
        const inward = outVel.x * n.x + outVel.y * n.y + outVel.z * n.z;
        if (inward < 0) {
            outVel.x -= n.x * inward;
            outVel.y -= n.y * inward;
            outVel.z -= n.z * inward;
        }
    }

    return {
        position: result.position,
        velocity: outVel,
        hits: result.hits,
        collided: result.collided
    };
}
