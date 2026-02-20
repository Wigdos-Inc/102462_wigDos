// Generates connected triangulated terrain mesh from heightmap
export function createTerrainMesh(heightMap, gridSize, width, depth) {
    const vertices = [], normals = [], indices = [], colors = [];
    const halfX = Math.ceil(width / gridSize / 2);
    const halfZ = Math.ceil(depth / gridSize / 2);
    const vertexMap = {};
    let vertexIndex = 0;

    // Build vertex array
    for (let ix = -halfX; ix <= halfX; ix++) {
        for (let iz = -halfZ; iz <= halfZ; iz++) {
            const key = `${ix},${iz}`;
            const height = heightMap[key];
            if (height === undefined) continue;

            const x = ix * gridSize, z = iz * gridSize;
            vertices.push(x, height, z);
            colors.push(0.5, 0.6, 0.4); // Will be overridden per vertex
            vertexMap[key] = vertexIndex++;
        }
    }

    // Build triangle indices and compute normals
    const tempNormals = new Array(vertexIndex).fill(null).map(() => ({ x: 0, y: 0, z: 0, count: 0 }));

    for (let ix = -halfX; ix < halfX; ix++) {
        for (let iz = -halfZ; iz < halfZ; iz++) {
            const key00 = `${ix},${iz}`, key10 = `${ix + 1},${iz}`;
            const key01 = `${ix},${iz + 1}`, key11 = `${ix + 1},${iz + 1}`;

            const i00 = vertexMap[key00], i10 = vertexMap[key10];
            const i01 = vertexMap[key01], i11 = vertexMap[key11];

            if (i00 === undefined || i10 === undefined || i01 === undefined || i11 === undefined) continue;

            // Create two triangles for the quad
            indices.push(i00, i10, i11);
            indices.push(i00, i11, i01);

            // Compute face normals and accumulate
            const addNormal = (idx0, idx1, idx2) => {
                const v0x = vertices[idx0 * 3], v0y = vertices[idx0 * 3 + 1], v0z = vertices[idx0 * 3 + 2];
                const v1x = vertices[idx1 * 3], v1y = vertices[idx1 * 3 + 1], v1z = vertices[idx1 * 3 + 2];
                const v2x = vertices[idx2 * 3], v2y = vertices[idx2 * 3 + 1], v2z = vertices[idx2 * 3 + 2];

                const ax = v1x - v0x, ay = v1y - v0y, az = v1z - v0z;
                const bx = v2x - v0x, by = v2y - v0y, bz = v2z - v0z;

                const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
                const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;

                [idx0, idx1, idx2].forEach(idx => {
                    tempNormals[idx].x += nx / len;
                    tempNormals[idx].y += ny / len;
                    tempNormals[idx].z += nz / len;
                    tempNormals[idx].count++;
                });
            };

            addNormal(i00, i10, i11);
            addNormal(i00, i11, i01);
        }
    }

    // Normalize and flatten normals
    tempNormals.forEach((n, i) => {
        const len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z) || 1;
        normals.push(n.x / len, n.y / len, n.z / len);
    });

    return { vertices, normals, indices, colors };
}

export function detectCliffs(heightMap, gridSize, cliffThreshold = 5) {
    const cliffs = [];
    const keys = Object.keys(heightMap);

    keys.forEach(key => {
        const [ix, iz] = key.split(',').map(Number);
        const height = heightMap[key];

        // Check neighbors for steep drops
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dz]) => {
            const neighborKey = `${ix + dx},${iz + dz}`;
            const neighborHeight = heightMap[neighborKey];
            if (neighborHeight !== undefined && Math.abs(height - neighborHeight) > cliffThreshold) {
                cliffs.push({
                    x: ix * gridSize,
                    z: iz * gridSize,
                    height,
                    heightDiff: height - neighborHeight
                });
            }
        });
    });

    return cliffs;
}

export function createIslands(heightMap, gridSize, islandThreshold = 0.6, noiseFn) {
    const islands = [];
    const processedKeys = new Set();
    const keys = Object.keys(heightMap);

    // Identify island peaks
    keys.forEach(key => {
        if (processedKeys.has(key)) return;
        const [ix, iz] = key.split(',').map(Number);
        const height = heightMap[key];

        // Island detection using noise and height
        const x = ix * gridSize, z = iz * gridSize;
        const islandNoise = noiseFn ? noiseFn(x * 0.03, z * 0.03) : Math.random();

        if (islandNoise > islandThreshold && height > 8) {
            islands.push({ x, z, height, radius: 15 + Math.random() * 10 });
            processedKeys.add(key);
        }
    });

    return islands;
}
