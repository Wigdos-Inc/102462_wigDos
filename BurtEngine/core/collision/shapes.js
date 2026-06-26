import { Vec3 } from "../engine/Vec3.js";

export class Sphere {
    constructor(center, radius) {
        this.type = "sphere";
        this.center = center;
        this.radius = radius;
    }
}

export class OBB {
    constructor(center, axes, halfSize) {
        this.type = "obb";

        this.center = center;
        this.axes = axes;
        this.halfSize = halfSize;
    }
}

export class Cylinder {
    constructor(center, axis, radius, height) {
        this.type = "cylinder";

        this.center = center;
        this.axis = normalize(axis);

        this.radius = radius;
        this.height = height;
    }
}

export class Triangle {
    constructor(a,b,c) {
        this.type = "triangle";

        this.a = a;
        this.b = b;
        this.c = c;
    }
}

export function createAxes() {
    const out = [];

    for (let i = 0; i < 3; i++) {
        out[i] = new Vec3(0,0,0);
    }

    out[0].x = 1;
    out[1].y = 1;
    out[2].z = 1;

    return out;
}

export function GenerateCollision(mesh) {
    const meshInds = mesh.indices;
    const meshVerts = mesh.vertices;

    const collisions = [];
    for (let i = 0; i < meshInds.length / 3; i++) {
        const o = (i * 3);
        const id1 = meshInds[o +0] * 3;
        const id2 = meshInds[o +1] * 3;
        const id3 = meshInds[o +2] * 3;

        const v1 = new Vec3(meshVerts[id1], meshVerts[id1 +1], meshVerts[id1 +2]);
        const v2 = new Vec3(meshVerts[id2], meshVerts[id2 +1], meshVerts[id2 +2]);
        const v3 = new Vec3(meshVerts[id3], meshVerts[id3 +1], meshVerts[id3 +2]);

        collisions[i] = new Triangle(v1, v2, v3);
    }

    return collisions;
}
