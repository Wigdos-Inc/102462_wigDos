// Heightmap triangulation utility used by terrain generation.
export function createTerrainMesh(heightMap, gridSize, width, depth) {
    const vertices = [];
    const normals = [];
    const indices = [];
    const colors = [];

    const halfX = Math.ceil(width / gridSize / 2);
    const halfZ = Math.ceil(depth / gridSize / 2);
    const vertexMap = new Map();
    let vertexIndex = 0;

    for (let ix = -halfX; ix <= halfX; ix++) {
        for (let iz = -halfZ; iz <= halfZ; iz++) {
            const key = `${ix},${iz}`;
            const height = heightMap[key];
            if (height === undefined || height === null) continue;

            const x = ix * gridSize;
            const z = iz * gridSize;
            vertices.push(x, height, z);
            colors.push(0.5, 0.6, 0.4);
            vertexMap.set(key, vertexIndex++);
        }
    }

    const tempNormals = new Array(vertexIndex).fill(null).map(() => ({ x: 0, y: 0, z: 0 }));

    const addNormal = (idx0, idx1, idx2) => {
        const v0x = vertices[idx0 * 3];
        const v0y = vertices[idx0 * 3 + 1];
        const v0z = vertices[idx0 * 3 + 2];
        const v1x = vertices[idx1 * 3];
        const v1y = vertices[idx1 * 3 + 1];
        const v1z = vertices[idx1 * 3 + 2];
        const v2x = vertices[idx2 * 3];
        const v2y = vertices[idx2 * 3 + 1];
        const v2z = vertices[idx2 * 3 + 2];

        const ax = v1x - v0x;
        const ay = v1y - v0y;
        const az = v1z - v0z;
        const bx = v2x - v0x;
        const by = v2y - v0y;
        const bz = v2z - v0z;

        const nx = ay * bz - az * by;
        const ny = az * bx - ax * bz;
        const nz = ax * by - ay * bx;
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;

        for (const idx of [idx0, idx1, idx2]) {
            tempNormals[idx].x += nx / len;
            tempNormals[idx].y += ny / len;
            tempNormals[idx].z += nz / len;
        }
    };

    for (let ix = -halfX; ix < halfX; ix++) {
        for (let iz = -halfZ; iz < halfZ; iz++) {
            const key00 = `${ix},${iz}`;
            const key10 = `${ix + 1},${iz}`;
            const key01 = `${ix},${iz + 1}`;
            const key11 = `${ix + 1},${iz + 1}`;

            const i00 = vertexMap.get(key00);
            const i10 = vertexMap.get(key10);
            const i01 = vertexMap.get(key01);
            const i11 = vertexMap.get(key11);

            if (i00 === undefined || i10 === undefined || i01 === undefined || i11 === undefined) continue;

            indices.push(i00, i10, i11);
            indices.push(i00, i11, i01);

            addNormal(i00, i10, i11);
            addNormal(i00, i11, i01);
        }
    }

    for (const n of tempNormals) {
        const len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z) || 1;
        normals.push(n.x / len, n.y / len, n.z / len);
    }

    return { vertices, normals, indices, colors };
}

// Marching-cubes debug data removed with volumetric terrain path.
export const debugCubes = [];
