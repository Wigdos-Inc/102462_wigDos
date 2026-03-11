import { vector } from './../../globals.js';

// Primitive shape constructors ------------------------------------------------

export function createBox(x, y, z, width, height, depth) {
    return {
        type: 'box',
        center: vector.create(x, y, z),
        width,
        height,
        depth
    };
}

export function createCylinder(x, y, z, radius, height) {
    return {
        type: 'cylinder',
        center: vector.create(x, y, z),
        radius,
        height
    };
}

export function createTriangle(a, b, c) {
    return {
        type: 'triangle',
        a: vector.create(a.x, a.y, a.z),
        b: vector.create(b.x, b.y, b.z),
        c: vector.create(c.x, c.y, c.z)
    };
}

// Collision helpers -----------------------------------------------------------

function closestPointOnBox(point, box) {
    const half = {
        x: box.width / 2,
        y: box.height / 2,
        z: box.depth / 2
    };
    return vector.create(
        Math.max(box.center.x - half.x, Math.min(point.x, box.center.x + half.x)),
        Math.max(box.center.y - half.y, Math.min(point.y, box.center.y + half.y)),
        Math.max(box.center.z - half.z, Math.min(point.z, box.center.z + half.z))
    );
}

function closestPointOnTriangle(p, a, b, c) {
    // from Real-Time Collision Detection (Ericson)
    const ab = vector.sub(b, a);
    const ac = vector.sub(c, a);
    const ap = vector.sub(p, a);

    const d1 = vector.dot(ab, ap);
    const d2 = vector.dot(ac, ap);
    if (d1 <= 0 && d2 <= 0) return a;

    const bp = vector.sub(p, b);
    const d3 = vector.dot(ab, bp);
    const d4 = vector.dot(ac, bp);
    if (d3 >= 0 && d4 <= d3) return b;

    const vc = d1 * d4 - d3 * d2;
    if (vc <= 0 && d1 >= 0 && d3 <= 0) {
        const v = d1 / (d1 - d3);
        return vector.add(a, vector.scale(ab, v));
    }

    const cp = vector.sub(p, c);
    const d5 = vector.dot(ab, cp);
    const d6 = vector.dot(ac, cp);
    if (d6 >= 0 && d5 <= d6) return c;

    const vb = d5 * d2 - d1 * d6;
    if (vb <= 0 && d2 >= 0 && d6 <= 0) {
        const w = d2 / (d2 - d6);
        return vector.add(a, vector.scale(ac, w));
    }

    const va = d3 * d6 - d5 * d4;
    if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) {
        const w = (d4 - d3) / ((d4 - d3) + (d5 - d6));
        return vector.add(b, vector.scale(vector.sub(c, b), w));
    }

    // inside face region
    const denom = 1 / (va + vb + vc);
    const v = vb * denom;
    const w = vc * denom;
    return vector.add(a, vector.add(vector.scale(ab, v), vector.scale(ac, w)));
}

// Public collision tests ------------------------------------------------------

export function sphereIntersectsBox(spherePos, sphereRadius, box) {
    const closest = closestPointOnBox(spherePos, box);
    const dx = spherePos.x - closest.x;
    const dy = spherePos.y - closest.y;
    const dz = spherePos.z - closest.z;
    return (dx * dx + dy * dy + dz * dz) < (sphereRadius * sphereRadius);
}

export function sphereIntersectsCylinder(spherePos, sphereRadius, cyl) {
    // cylinder is assumed to be aligned along the Y axis
    const dx = spherePos.x - cyl.center.x;
    const dz = spherePos.z - cyl.center.z;
    const distXZ = dx * dx + dz * dz;
    if (distXZ > (cyl.radius + sphereRadius) ** 2) return false;

    const top = cyl.center.y + cyl.height / 2;
    const bottom = cyl.center.y - cyl.height / 2;
    if (spherePos.y + sphereRadius < bottom) return false;
    if (spherePos.y - sphereRadius > top) return false;
    return true;
}

export function sphereIntersectsTriangle(spherePos, sphereRadius, tri) {
    const closest = closestPointOnTriangle(spherePos, tri.a, tri.b, tri.c);
    const dx = spherePos.x - closest.x;
    const dy = spherePos.y - closest.y;
    const dz = spherePos.z - closest.z;
    return (dx * dx + dy * dy + dz * dz) < (sphereRadius * sphereRadius);
}

export function sphereIntersectsShape(spherePos, sphereRadius, shapeWrapper) {
    const shape = shapeWrapper.shape || shapeWrapper;
    switch (shape.type) {
        case 'box':
            return sphereIntersectsBox(spherePos, sphereRadius, shape);
        case 'cylinder':
            return sphereIntersectsCylinder(spherePos, sphereRadius, shape);
        case 'triangle':
            return sphereIntersectsTriangle(spherePos, sphereRadius, shape);
    }
    return false;
}

// Height/support queries -----------------------------------------------------

export function heightAtXZ(shape, x, z) {
    switch (shape.type) {
        case 'box': {
            const c = shape.center;
            const halfW = shape.width / 2;
            const halfD = shape.depth / 2;
            if (x >= c.x - halfW && x <= c.x + halfW &&
                z >= c.z - halfD && z <= c.z + halfD) {
                return c.y + shape.height / 2;
            }
            return null;
        }
        case 'cylinder': {
            const dx = x - shape.center.x;
            const dz = z - shape.center.z;
            if (dx * dx + dz * dz <= shape.radius * shape.radius) {
                return shape.center.y + shape.height / 2;
            }
            return null;
        }
        case 'triangle': {
            const n = vector.cross(vector.sub(shape.b, shape.a), vector.sub(shape.c, shape.a));
            if (Math.abs(n.y) < 1e-6) return null;

            const y = shape.a.y - (n.x * (x - shape.a.x) + n.z * (z - shape.a.z)) / n.y;
            const p = vector.create(x, y, z);

            const v0 = vector.sub(shape.b, shape.a);
            const v1 = vector.sub(shape.c, shape.a);
            const v2 = vector.sub(p, shape.a);
            const d00 = vector.dot(v0, v0);
            const d01 = vector.dot(v0, v1);
            const d11 = vector.dot(v1, v1);
            const d20 = vector.dot(v2, v0);
            const d21 = vector.dot(v2, v1);
            const denom = d00 * d11 - d01 * d01;
            if (denom === 0) return null;
            const v = (d11 * d20 - d01 * d21) / denom;
            const w = (d00 * d21 - d01 * d20) / denom;
            const u = 1 - v - w;
            if (u >= 0 && v >= 0 && w >= 0) {
                return y;
            }
            return null;
        }
    }
    return null;
}

export function supportHeightAtXZ(x, z, shapes, defaultHeight = 0) {
    let maxY = defaultHeight;
    shapes.forEach(wrapper => {
        const shape = wrapper.shape || wrapper;
        const h = heightAtXZ(shape, x, z);
        if (h !== null && h > maxY) maxY = h;
    });
    return maxY;
}
