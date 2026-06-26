import { Vec3, clamp } from "../engine/Vec3.js";

export function sphereSphere(a, b) {
    const r = a.radius + b.radius;
    return a.center.distanceSq(b.center) <= r*r;
}

export function sphereOBB(sphere, box) {
    const d = sphere.center.sub(box.center);

    let closest = new Vec3(box.center.x, box.center.y, box.center.z);

    const ext = [
        box.halfSize.x,
        box.halfSize.y,
        box.halfSize.z
    ];

    for (let i = 0; i < 3; i++) {
        const dist = d.dot(box.axes[i]);
        const clamped = clamp(dist, -ext[i], ext[i]);

        closest = closest.add(box.axes[i].mul(clamped));
    }

    const diff = closest.sub(sphere.center);

    return diff.dot(diff) <= sphere.radius * sphere.radius;
}

function overlapOnAxis(a, b, axis) {
    const lenSq = axis.dot(axis);
    if (lenSq < 1e-8) return true; // keep safe fallback ONLY here is okay

    axis = axis.normalize(axis);

    const t = b.center.sub(a.center);
    const distance = Math.abs(t.dot(axis));

    const ra =
        a.halfSize.x * Math.abs(a.axes[0].dot(axis)) +
        a.halfSize.y * Math.abs(a.axes[1].dot(axis)) +
        a.halfSize.z * Math.abs(a.axes[2].dot(axis));

    const rb =
        b.halfSize.x * Math.abs(b.axes[0].dot(axis)) +
        b.halfSize.y * Math.abs(b.axes[1].dot(axis)) +
        b.halfSize.z * Math.abs(b.axes[2].dot(axis));

    return distance <= ra + rb;
}

export function obbOBB(a, b) {
    const axes = [];

    axes.push(...a.axes);
    axes.push(...b.axes);

    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            const axis = a.axes[i].cross(b.axes[j]);
            const lenSq = axis.dot(axis);

            if (lenSq > 1e-8) {
                axes.push(axis.mul(1 / Math.sqrt(lenSq)));
            }
        }
    }

    for (const axis of axes) {
        const lenSq = axis.dot(axis);
        if (lenSq < 1e-8) continue;

        if (!overlapOnAxis(a, b, axis)) {
            return false;
        }
    }

    return true;
}

export function closestPointTriangle(p, tri) {
    const A = tri.a;
    const B = tri.b;
    const C = tri.c;

    const AB = B.sub(A);
    const AC = C.sub(A);
    const AP = p.sub(A);

    const d1 = AB.dot(AP);
    const d2 = AC.dot(AP);

    // Vertex A region
    if (d1 <= 0 && d2 <= 0) return A;

    const BP = p.sub(B);
    const d3 = AB.dot(BP);
    const d4 = AC.dot(BP);

    // Vertex B region
    if (d3 >= 0 && d4 <= d3) return B;

    // Edge AB region
    const vc = d1 * d4 - d3 * d2;

    if (vc <= 0 && d1 >= 0 && d3 <= 0) {
        const v = d1 / (d1 - d3);
        return A.add(AB.mul(v));
    }

    const CP = p.sub(C);
    const d5 = AB.dot(CP);
    const d6 = AC.dot(CP);

    // Vertex C region
    if (d6 >= 0 && d5 <= d6) return C;

    // Edge AC region
    const vb = d5 * d2 - d1 * d6;

    if (vb <= 0 && d2 >= 0 && d6 <= 0) {
        const w = d2 / (d2 - d6);
        return A.add(AC.mul(w));
    }

    // Edge BC region
    const va = d3 * d6 - d5 * d4;

    if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) {
        const BC = C.sub(B);
        const w = (d4 - d3) / ((d4 - d3) + (d5 - d6));

        return B.add(BC.mul(w));
    }

    // Face region
    const denom = 1 / (va + vb + vc);

    const v = vb * denom;
    const w = vc * denom;

    return A.add(AB.mul(v).add(AC.mul(w)));
}

export function sphereTriangle(sphere, tri) {
    const p = closestPointTriangle(sphere.center, tri);
    const diff = p.sub(sphere.center);

    return diff.dot(diff) <= sphere.radius * sphere.radius;
}

export function cylinderSphere(cyl, sphere) {
    const half = cyl.height * 0.5;

    const p0 = cyl.center.add(cyl.axis.mul(-half));
    const p1 = cyl.center.add(cyl.axis.mul(half));

    const seg = p1.sub(p0);
    const t = clamp(sphere.center.sub(p0).dot(seg) / seg.dot(seg), 0, 1);

    const closest = p0.add(seg.mul(t));
    const r = cyl.radius + sphere.radius;

    const diff = closest.sub(sphere.center);

    return diff.dot(diff) <= r*r;
}

export function collide(a, b) {
    if (
        a.type === "sphere" &&
        b.type === "sphere"
    ) return sphereSphere(a,b);

    if (
        a.type === "sphere" &&
        b.type === "obb"
    ) return sphereOBB(a,b);

    if (
        a.type === "obb" &&
        b.type === "sphere"
    ) return sphereOBB(b,a);

    if (
        a.type === "obb" &&
        b.type === "obb"
    ) return obbOBB(a,b);

    if (
        a.type === "sphere" &&
        b.type === "triangle"
    ) return sphereTriangle(a,b);

    if (
        a.type === "triangle" &&
        b.type === "sphere"
    ) return sphereTriangle(b,a);

    if (
        a.type === "cylinder" &&
        b.type === "sphere"
    ) return cylinderSphere(a,b);

    if (
        a.type === "sphere" &&
        b.type === "cylinder"
    ) return cylinderSphere(b,a);

    throw new Error(`${a.type} vs ${b.type} not implemented`);
}
