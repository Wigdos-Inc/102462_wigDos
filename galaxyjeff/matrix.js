import { vec3 } from './vec3.js';

export function createPerspectiveMatrix(fov, aspect, near, far) {
    const f = 1.0 / Math.tan(fov / 2);
    const nf = 1 / (near - far);
    return new Float32Array([
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (far + near) * nf, -1,
        0, 0, 2 * far * near * nf, 0
    ]);
}

export function createLookAtMatrix(eye, target, up) {
    const z = vec3.normalize(vec3.sub(eye, target));
    const x = vec3.normalize(vec3.cross(up, z));
    const y = vec3.cross(z, x);
    
    return new Float32Array([
        x.x, y.x, z.x, 0,
        x.y, y.y, z.y, 0,
        x.z, y.z, z.z, 0,
        -vec3.dot(x, eye), -vec3.dot(y, eye), -vec3.dot(z, eye), 1
    ]);
}

export function multiplyMatrices(a, b) {
    const result = new Float32Array(16);
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            result[i * 4 + j] = 
                a[j] * b[i * 4] +
                a[4 + j] * b[i * 4 + 1] +
                a[8 + j] * b[i * 4 + 2] +
                a[12 + j] * b[i * 4 + 3];
        }
    }
    return result;
}

export function createTranslationMatrix(x, y, z) {
    return new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        x, y, z, 1
    ]);
}

export function createScaleMatrix(x, y, z) {
    return new Float32Array([
        x, 0, 0, 0,
        0, y, 0, 0,
        0, 0, z, 0,
        0, 0, 0, 1
    ]);
}
