// Very small math helpers so logic is easy to port to C/C++.

export function vec3(x = 0, y = 0, z = 0) {
    return { x, y, z };
}

export function add(a, b) {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function sub(a, b) {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scale(v, s) {
    return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function length(v) {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function normalize(v) {
    const len = length(v);
    if (len === 0) {
        return vec3(0, 0, 0);
    }
    return vec3(v.x / len, v.y / len, v.z / len);
}

export function rotateY(v, yaw) {
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    return {
        x: v.x * c - v.z * s,
        y: v.y,
        z: v.x * s + v.z * c
    };
}

export function makeYRotationMatrix(yaw) {
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    return [
        c, 0, -s,
        0, 1, 0,
        s, 0, c
    ];
}

export function transformVec3Mat3(v, m) {
    return {
        x: v.x * m[0] + v.y * m[1] + v.z * m[2],
        y: v.x * m[3] + v.y * m[4] + v.z * m[5],
        z: v.x * m[6] + v.y * m[7] + v.z * m[8]
    };
}

export function rotateX(v, pitch) {
    const c = Math.cos(pitch);
    const s = Math.sin(pitch);
    return {
        x: v.x,
        y: v.y * c - v.z * s,
        z: v.y * s + v.z * c
    };
}

export function clamp(value, min, max) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
}

export function projectPoint(worldPoint, camera, width, height) {
    const relative = sub(worldPoint, camera.position);
    const yawed = rotateY(relative, -camera.yaw);
    const local = rotateX(yawed, -camera.pitch);

    if (local.z <= 0.05) {
        return null;
    }

    const focal = camera.fovScale;
    const sx = (local.x / local.z) * focal + width * 0.5;
    const sy = (-local.y / local.z) * focal + height * 0.5;

    return {
        x: sx,
        y: sy,
        depth: local.z
    };
}
