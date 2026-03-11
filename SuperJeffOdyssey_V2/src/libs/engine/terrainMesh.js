// Legacy heightmap triangulation kept for compatibility. New volumetric
// generation paths should prefer createMeshFromDensity below.
export function createTerrainMesh(heightMap, gridSize, width, depth) {
    const vertices = [], normals = [], indices = [], colors = [];
    const halfX = Math.ceil(width / gridSize / 2);
    const halfZ = Math.ceil(depth / gridSize / 2);
    const vertexMap = {};
    let vertexIndex = 0;

    for (let ix = -halfX; ix <= halfX; ix++) {
        for (let iz = -halfZ; iz <= halfZ; iz++) {
            const key = `${ix},${iz}`;
            const height = heightMap[key];
            if (height === undefined) continue;

            const x = ix * gridSize, z = iz * gridSize;
            vertices.push(x, height, z);
            colors.push(0.5, 0.6, 0.4);
            vertexMap[key] = vertexIndex++;
        }
    }

    const tempNormals = new Array(vertexIndex).fill(null).map(() => ({ x: 0, y: 0, z: 0 }));

    const addNormal = (idx0, idx1, idx2) => {
        const v0x = vertices[idx0 * 3], v0y = vertices[idx0 * 3 + 1], v0z = vertices[idx0 * 3 + 2];
        const v1x = vertices[idx1 * 3], v1y = vertices[idx1 * 3 + 1], v1z = vertices[idx1 * 3 + 2];
        const v2x = vertices[idx2 * 3], v2y = vertices[idx2 * 3 + 1], v2z = vertices[idx2 * 3 + 2];

        const ax = v1x - v0x, ay = v1y - v0y, az = v1z - v0z;
        const bx = v2x - v0x, by = v2y - v0y, bz = v2z - v0z;

        const nx = ay * bz - az * by;
        const ny = az * bx - ax * bz;
        const nz = ax * by - ay * bx;
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;

        [idx0, idx1, idx2].forEach(idx => {
            tempNormals[idx].x += nx / len;
            tempNormals[idx].y += ny / len;
            tempNormals[idx].z += nz / len;
        });
    };

    for (let ix = -halfX; ix < halfX; ix++) {
        for (let iz = -halfZ; iz < halfZ; iz++) {
            const key00 = `${ix},${iz}`, key10 = `${ix + 1},${iz}`;
            const key01 = `${ix},${iz + 1}`, key11 = `${ix + 1},${iz + 1}`;

            const i00 = vertexMap[key00], i10 = vertexMap[key10];
            const i01 = vertexMap[key01], i11 = vertexMap[key11];

            if (i00 === undefined || i10 === undefined || i01 === undefined || i11 === undefined) continue;

            indices.push(i00, i10, i11);
            indices.push(i00, i11, i01);

            addNormal(i00, i10, i11);
            addNormal(i00, i11, i01);
        }
    }

    tempNormals.forEach(n => {
        const len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z) || 1;
        normals.push(n.x / len, n.y / len, n.z / len);
    });

    return { vertices, normals, indices, colors };
}

// -------------------------------------------------------------------------
// Marching Cubes mesh extraction from volumetric density
// -------------------------------------------------------------------------

const edgeTable = [
	0x0, 0x109, 0x203, 0x30a, 0x80c, 0x905, 0xa0f, 0xb06, 
	0x406, 0x50f, 0x605, 0x70c, 0xc0a, 0xd03, 0xe09, 0xf00, 
	0x190, 0x99, 0x393, 0x29a, 0x99c, 0x895, 0xb9f, 0xa96, 
	0x596, 0x49f, 0x795, 0x69c, 0xd9a, 0xc93, 0xf99, 0xe90, 
	0x230, 0x339, 0x33, 0x13a, 0xa3c, 0xb35, 0x83f, 0x936, 
	0x636, 0x73f, 0x435, 0x53c, 0xe3a, 0xf33, 0xc39, 0xd30, 
	0x3a0, 0x2a9, 0x1a3, 0xaa, 0xbac, 0xaa5, 0x9af, 0x8a6, 
	0x7a6, 0x6af, 0x5a5, 0x4ac, 0xfaa, 0xea3, 0xda9, 0xca0, 
	0x8c0, 0x9c9, 0xac3, 0xbca, 0xcc, 0x1c5, 0x2cf, 0x3c6, 
	0xcc6, 0xdcf, 0xec5, 0xfcc, 0x4ca, 0x5c3, 0x6c9, 0x7c0, 
	0x950, 0x859, 0xb53, 0xa5a, 0x15c, 0x55, 0x35f, 0x256, 
	0xd56, 0xc5f, 0xf55, 0xe5c, 0x55a, 0x453, 0x759, 0x650, 
	0xaf0, 0xbf9, 0x8f3, 0x9fa, 0x2fc, 0x3f5, 0xff, 0x1f6, 
	0xef6, 0xfff, 0xcf5, 0xdfc, 0x6fa, 0x7f3, 0x4f9, 0x5f0, 
	0xb60, 0xa69, 0x963, 0x86a, 0x36c, 0x265, 0x16f, 0x66, 
	0xf66, 0xe6f, 0xd65, 0xc6c, 0x76a, 0x663, 0x569, 0x460, 
	0x460, 0x569, 0x663, 0x76a, 0xc6c, 0xd65, 0xe6f, 0xf66, 
	0x66, 0x16f, 0x265, 0x36c, 0x86a, 0x963, 0xa69, 0xb60, 
	0x5f0, 0x4f9, 0x7f3, 0x6fa, 0xdfc, 0xcf5, 0xfff, 0xef6, 
	0x1f6, 0xff, 0x3f5, 0x2fc, 0x9fa, 0x8f3, 0xbf9, 0xaf0, 
	0x650, 0x759, 0x453, 0x55a, 0xe5c, 0xf55, 0xc5f, 0xd56, 
	0x256, 0x35f, 0x55, 0x15c, 0xa5a, 0xb53, 0x859, 0x950, 
	0x7c0, 0x6c9, 0x5c3, 0x4ca, 0xfcc, 0xec5, 0xdcf, 0xcc6, 
	0x3c6, 0x2cf, 0x1c5, 0xcc, 0xbca, 0xac3, 0x9c9, 0x8c0, 
	0xca0, 0xda9, 0xea3, 0xfaa, 0x4ac, 0x5a5, 0x6af, 0x7a6, 
	0x8a6, 0x9af, 0xaa5, 0xbac, 0xaa, 0x1a3, 0x2a9, 0x3a0, 
	0xd30, 0xc39, 0xf33, 0xe3a, 0x53c, 0x435, 0x73f, 0x636, 
	0x936, 0x83f, 0xb35, 0xa3c, 0x13a, 0x33, 0x339, 0x230, 
	0xe90, 0xf99, 0xc93, 0xd9a, 0x69c, 0x795, 0x49f, 0x596, 
	0xa96, 0xb9f, 0x895, 0x99c, 0x29a, 0x393, 0x99, 0x190, 
	0xf00, 0xe09, 0xd03, 0xc0a, 0x70c, 0x605, 0x50f, 0x406, 
	0xb06, 0xa0f, 0x905, 0x80c, 0x30a, 0x203, 0x109, 0x0, 
];


const triTable = [
	[ -1 ],
	[ 0, 3, 8, -1 ],
	[ 0, 9, 1, -1 ],
	[ 3, 8, 1, 1, 8, 9, -1 ],
	[ 2, 11, 3, -1 ],
	[ 8, 0, 11, 11, 0, 2, -1 ],
	[ 3, 2, 11, 1, 0, 9, -1 ],
	[ 11, 1, 2, 11, 9, 1, 11, 8, 9, -1 ],
	[ 1, 10, 2, -1 ],
	[ 0, 3, 8, 2, 1, 10, -1 ],
	[ 10, 2, 9, 9, 2, 0, -1 ],
	[ 8, 2, 3, 8, 10, 2, 8, 9, 10, -1 ],
	[ 11, 3, 10, 10, 3, 1, -1 ],
	[ 10, 0, 1, 10, 8, 0, 10, 11, 8, -1 ],
	[ 9, 3, 0, 9, 11, 3, 9, 10, 11, -1 ],
	[ 8, 9, 11, 11, 9, 10, -1 ],
	[ 4, 8, 7, -1 ],
	[ 7, 4, 3, 3, 4, 0, -1 ],
	[ 4, 8, 7, 0, 9, 1, -1 ],
	[ 1, 4, 9, 1, 7, 4, 1, 3, 7, -1 ],
	[ 8, 7, 4, 11, 3, 2, -1 ],
	[ 4, 11, 7, 4, 2, 11, 4, 0, 2, -1 ],
	[ 0, 9, 1, 8, 7, 4, 11, 3, 2, -1 ],
	[ 7, 4, 11, 11, 4, 2, 2, 4, 9, 2, 9, 1, -1 ],
	[ 4, 8, 7, 2, 1, 10, -1 ],
	[ 7, 4, 3, 3, 4, 0, 10, 2, 1, -1 ],
	[ 10, 2, 9, 9, 2, 0, 7, 4, 8, -1 ],
	[ 10, 2, 3, 10, 3, 4, 3, 7, 4, 9, 10, 4, -1 ],
	[ 1, 10, 3, 3, 10, 11, 4, 8, 7, -1 ],
	[ 10, 11, 1, 11, 7, 4, 1, 11, 4, 1, 4, 0, -1 ],
	[ 7, 4, 8, 9, 3, 0, 9, 11, 3, 9, 10, 11, -1 ],
	[ 7, 4, 11, 4, 9, 11, 9, 10, 11, -1 ],
	[ 9, 4, 5, -1 ],
	[ 9, 4, 5, 8, 0, 3, -1 ],
	[ 4, 5, 0, 0, 5, 1, -1 ],
	[ 5, 8, 4, 5, 3, 8, 5, 1, 3, -1 ],
	[ 9, 4, 5, 11, 3, 2, -1 ],
	[ 2, 11, 0, 0, 11, 8, 5, 9, 4, -1 ],
	[ 4, 5, 0, 0, 5, 1, 11, 3, 2, -1 ],
	[ 5, 1, 4, 1, 2, 11, 4, 1, 11, 4, 11, 8, -1 ],
	[ 1, 10, 2, 5, 9, 4, -1 ],
	[ 9, 4, 5, 0, 3, 8, 2, 1, 10, -1 ],
	[ 2, 5, 10, 2, 4, 5, 2, 0, 4, -1 ],
	[ 10, 2, 5, 5, 2, 4, 4, 2, 3, 4, 3, 8, -1 ],
	[ 11, 3, 10, 10, 3, 1, 4, 5, 9, -1 ],
	[ 4, 5, 9, 10, 0, 1, 10, 8, 0, 10, 11, 8, -1 ],
	[ 11, 3, 0, 11, 0, 5, 0, 4, 5, 10, 11, 5, -1 ],
	[ 4, 5, 8, 5, 10, 8, 10, 11, 8, -1 ],
	[ 8, 7, 9, 9, 7, 5, -1 ],
	[ 3, 9, 0, 3, 5, 9, 3, 7, 5, -1 ],
	[ 7, 0, 8, 7, 1, 0, 7, 5, 1, -1 ],
	[ 7, 5, 3, 3, 5, 1, -1 ],
	[ 5, 9, 7, 7, 9, 8, 2, 11, 3, -1 ],
	[ 2, 11, 7, 2, 7, 9, 7, 5, 9, 0, 2, 9, -1 ],
	[ 2, 11, 3, 7, 0, 8, 7, 1, 0, 7, 5, 1, -1 ],
	[ 2, 11, 1, 11, 7, 1, 7, 5, 1, -1 ],
	[ 8, 7, 9, 9, 7, 5, 2, 1, 10, -1 ],
	[ 10, 2, 1, 3, 9, 0, 3, 5, 9, 3, 7, 5, -1 ],
	[ 7, 5, 8, 5, 10, 2, 8, 5, 2, 8, 2, 0, -1 ],
	[ 10, 2, 5, 2, 3, 5, 3, 7, 5, -1 ],
	[ 8, 7, 5, 8, 5, 9, 11, 3, 10, 3, 1, 10, -1 ],
	[ 5, 11, 7, 10, 11, 5, 1, 9, 0, -1 ],
	[ 11, 5, 10, 7, 5, 11, 8, 3, 0, -1 ],
	[ 5, 11, 7, 10, 11, 5, -1 ],
	[ 6, 7, 11, -1 ],
	[ 7, 11, 6, 3, 8, 0, -1 ],
	[ 6, 7, 11, 0, 9, 1, -1 ],
	[ 9, 1, 8, 8, 1, 3, 6, 7, 11, -1 ],
	[ 3, 2, 7, 7, 2, 6, -1 ],
	[ 0, 7, 8, 0, 6, 7, 0, 2, 6, -1 ],
	[ 6, 7, 2, 2, 7, 3, 9, 1, 0, -1 ],
	[ 6, 7, 8, 6, 8, 1, 8, 9, 1, 2, 6, 1, -1 ],
	[ 11, 6, 7, 10, 2, 1, -1 ],
	[ 3, 8, 0, 11, 6, 7, 10, 2, 1, -1 ],
	[ 0, 9, 2, 2, 9, 10, 7, 11, 6, -1 ],
	[ 6, 7, 11, 8, 2, 3, 8, 10, 2, 8, 9, 10, -1 ],
	[ 7, 10, 6, 7, 1, 10, 7, 3, 1, -1 ],
	[ 8, 0, 7, 7, 0, 6, 6, 0, 1, 6, 1, 10, -1 ],
	[ 7, 3, 6, 3, 0, 9, 6, 3, 9, 6, 9, 10, -1 ],
	[ 6, 7, 10, 7, 8, 10, 8, 9, 10, -1 ],
	[ 11, 6, 8, 8, 6, 4, -1 ],
	[ 6, 3, 11, 6, 0, 3, 6, 4, 0, -1 ],
	[ 11, 6, 8, 8, 6, 4, 1, 0, 9, -1 ],
	[ 1, 3, 9, 3, 11, 6, 9, 3, 6, 9, 6, 4, -1 ],
	[ 2, 8, 3, 2, 4, 8, 2, 6, 4, -1 ],
	[ 4, 0, 6, 6, 0, 2, -1 ],
	[ 9, 1, 0, 2, 8, 3, 2, 4, 8, 2, 6, 4, -1 ],
	[ 9, 1, 4, 1, 2, 4, 2, 6, 4, -1 ],
	[ 4, 8, 6, 6, 8, 11, 1, 10, 2, -1 ],
	[ 1, 10, 2, 6, 3, 11, 6, 0, 3, 6, 4, 0, -1 ],
	[ 11, 6, 4, 11, 4, 8, 10, 2, 9, 2, 0, 9, -1 ],
	[ 10, 4, 9, 6, 4, 10, 11, 2, 3, -1 ],
	[ 4, 8, 3, 4, 3, 10, 3, 1, 10, 6, 4, 10, -1 ],
	[ 1, 10, 0, 10, 6, 0, 6, 4, 0, -1 ],
	[ 4, 10, 6, 9, 10, 4, 0, 8, 3, -1 ],
	[ 4, 10, 6, 9, 10, 4, -1 ],
	[ 6, 7, 11, 4, 5, 9, -1 ],
	[ 4, 5, 9, 7, 11, 6, 3, 8, 0, -1 ],
	[ 1, 0, 5, 5, 0, 4, 11, 6, 7, -1 ],
	[ 11, 6, 7, 5, 8, 4, 5, 3, 8, 5, 1, 3, -1 ],
	[ 3, 2, 7, 7, 2, 6, 9, 4, 5, -1 ],
	[ 5, 9, 4, 0, 7, 8, 0, 6, 7, 0, 2, 6, -1 ],
	[ 3, 2, 6, 3, 6, 7, 1, 0, 5, 0, 4, 5, -1 ],
	[ 6, 1, 2, 5, 1, 6, 4, 7, 8, -1 ],
	[ 10, 2, 1, 6, 7, 11, 4, 5, 9, -1 ],
	[ 0, 3, 8, 4, 5, 9, 11, 6, 7, 10, 2, 1, -1 ],
	[ 7, 11, 6, 2, 5, 10, 2, 4, 5, 2, 0, 4, -1 ],
	[ 8, 4, 7, 5, 10, 6, 3, 11, 2, -1 ],
	[ 9, 4, 5, 7, 10, 6, 7, 1, 10, 7, 3, 1, -1 ],
	[ 10, 6, 5, 7, 8, 4, 1, 9, 0, -1 ],
	[ 4, 3, 0, 7, 3, 4, 6, 5, 10, -1 ],
	[ 10, 6, 5, 8, 4, 7, -1 ],
	[ 9, 6, 5, 9, 11, 6, 9, 8, 11, -1 ],
	[ 11, 6, 3, 3, 6, 0, 0, 6, 5, 0, 5, 9, -1 ],
	[ 11, 6, 5, 11, 5, 0, 5, 1, 0, 8, 11, 0, -1 ],
	[ 11, 6, 3, 6, 5, 3, 5, 1, 3, -1 ],
	[ 9, 8, 5, 8, 3, 2, 5, 8, 2, 5, 2, 6, -1 ],
	[ 5, 9, 6, 9, 0, 6, 0, 2, 6, -1 ],
	[ 1, 6, 5, 2, 6, 1, 3, 0, 8, -1 ],
	[ 1, 6, 5, 2, 6, 1, -1 ],
	[ 2, 1, 10, 9, 6, 5, 9, 11, 6, 9, 8, 11, -1 ],
	[ 9, 0, 1, 3, 11, 2, 5, 10, 6, -1 ],
	[ 11, 0, 8, 2, 0, 11, 10, 6, 5, -1 ],
	[ 3, 11, 2, 5, 10, 6, -1 ],
	[ 1, 8, 3, 9, 8, 1, 5, 10, 6, -1 ],
	[ 6, 5, 10, 0, 1, 9, -1 ],
	[ 8, 3, 0, 5, 10, 6, -1 ],
	[ 6, 5, 10, -1 ],
	[ 10, 5, 6, -1 ],
	[ 0, 3, 8, 6, 10, 5, -1 ],
	[ 10, 5, 6, 9, 1, 0, -1 ],
	[ 3, 8, 1, 1, 8, 9, 6, 10, 5, -1 ],
	[ 2, 11, 3, 6, 10, 5, -1 ],
	[ 8, 0, 11, 11, 0, 2, 5, 6, 10, -1 ],
	[ 1, 0, 9, 2, 11, 3, 6, 10, 5, -1 ],
	[ 5, 6, 10, 11, 1, 2, 11, 9, 1, 11, 8, 9, -1 ],
	[ 5, 6, 1, 1, 6, 2, -1 ],
	[ 5, 6, 1, 1, 6, 2, 8, 0, 3, -1 ],
	[ 6, 9, 5, 6, 0, 9, 6, 2, 0, -1 ],
	[ 6, 2, 5, 2, 3, 8, 5, 2, 8, 5, 8, 9, -1 ],
	[ 3, 6, 11, 3, 5, 6, 3, 1, 5, -1 ],
	[ 8, 0, 1, 8, 1, 6, 1, 5, 6, 11, 8, 6, -1 ],
	[ 11, 3, 6, 6, 3, 5, 5, 3, 0, 5, 0, 9, -1 ],
	[ 5, 6, 9, 6, 11, 9, 11, 8, 9, -1 ],
	[ 5, 6, 10, 7, 4, 8, -1 ],
	[ 0, 3, 4, 4, 3, 7, 10, 5, 6, -1 ],
	[ 5, 6, 10, 4, 8, 7, 0, 9, 1, -1 ],
	[ 6, 10, 5, 1, 4, 9, 1, 7, 4, 1, 3, 7, -1 ],
	[ 7, 4, 8, 6, 10, 5, 2, 11, 3, -1 ],
	[ 10, 5, 6, 4, 11, 7, 4, 2, 11, 4, 0, 2, -1 ],
	[ 4, 8, 7, 6, 10, 5, 3, 2, 11, 1, 0, 9, -1 ],
	[ 1, 2, 10, 11, 7, 6, 9, 5, 4, -1 ],
	[ 2, 1, 6, 6, 1, 5, 8, 7, 4, -1 ],
	[ 0, 3, 7, 0, 7, 4, 2, 1, 6, 1, 5, 6, -1 ],
	[ 8, 7, 4, 6, 9, 5, 6, 0, 9, 6, 2, 0, -1 ],
	[ 7, 2, 3, 6, 2, 7, 5, 4, 9, -1 ],
	[ 4, 8, 7, 3, 6, 11, 3, 5, 6, 3, 1, 5, -1 ],
	[ 5, 0, 1, 4, 0, 5, 7, 6, 11, -1 ],
	[ 9, 5, 4, 6, 11, 7, 0, 8, 3, -1 ],
	[ 11, 7, 6, 9, 5, 4, -1 ],
	[ 6, 10, 4, 4, 10, 9, -1 ],
	[ 6, 10, 4, 4, 10, 9, 3, 8, 0, -1 ],
	[ 0, 10, 1, 0, 6, 10, 0, 4, 6, -1 ],
	[ 6, 10, 1, 6, 1, 8, 1, 3, 8, 4, 6, 8, -1 ],
	[ 9, 4, 10, 10, 4, 6, 3, 2, 11, -1 ],
	[ 2, 11, 8, 2, 8, 0, 6, 10, 4, 10, 9, 4, -1 ],
	[ 11, 3, 2, 0, 10, 1, 0, 6, 10, 0, 4, 6, -1 ],
	[ 6, 8, 4, 11, 8, 6, 2, 10, 1, -1 ],
	[ 4, 1, 9, 4, 2, 1, 4, 6, 2, -1 ],
	[ 3, 8, 0, 4, 1, 9, 4, 2, 1, 4, 6, 2, -1 ],
	[ 6, 2, 4, 4, 2, 0, -1 ],
	[ 3, 8, 2, 8, 4, 2, 4, 6, 2, -1 ],
	[ 4, 6, 9, 6, 11, 3, 9, 6, 3, 9, 3, 1, -1 ],
	[ 8, 6, 11, 4, 6, 8, 9, 0, 1, -1 ],
	[ 11, 3, 6, 3, 0, 6, 0, 4, 6, -1 ],
	[ 8, 6, 11, 4, 6, 8, -1 ],
	[ 10, 7, 6, 10, 8, 7, 10, 9, 8, -1 ],
	[ 3, 7, 0, 7, 6, 10, 0, 7, 10, 0, 10, 9, -1 ],
	[ 6, 10, 7, 7, 10, 8, 8, 10, 1, 8, 1, 0, -1 ],
	[ 6, 10, 7, 10, 1, 7, 1, 3, 7, -1 ],
	[ 3, 2, 11, 10, 7, 6, 10, 8, 7, 10, 9, 8, -1 ],
	[ 2, 9, 0, 10, 9, 2, 6, 11, 7, -1 ],
	[ 0, 8, 3, 7, 6, 11, 1, 2, 10, -1 ],
	[ 7, 6, 11, 1, 2, 10, -1 ],
	[ 2, 1, 9, 2, 9, 7, 9, 8, 7, 6, 2, 7, -1 ],
	[ 2, 7, 6, 3, 7, 2, 0, 1, 9, -1 ],
	[ 8, 7, 0, 7, 6, 0, 6, 2, 0, -1 ],
	[ 7, 2, 3, 6, 2, 7, -1 ],
	[ 8, 1, 9, 3, 1, 8, 11, 7, 6, -1 ],
	[ 11, 7, 6, 1, 9, 0, -1 ],
	[ 6, 11, 7, 0, 8, 3, -1 ],
	[ 11, 7, 6, -1 ],
	[ 7, 11, 5, 5, 11, 10, -1 ],
	[ 10, 5, 11, 11, 5, 7, 0, 3, 8, -1 ],
	[ 7, 11, 5, 5, 11, 10, 0, 9, 1, -1 ],
	[ 7, 11, 10, 7, 10, 5, 3, 8, 1, 8, 9, 1, -1 ],
	[ 5, 2, 10, 5, 3, 2, 5, 7, 3, -1 ],
	[ 5, 7, 10, 7, 8, 0, 10, 7, 0, 10, 0, 2, -1 ],
	[ 0, 9, 1, 5, 2, 10, 5, 3, 2, 5, 7, 3, -1 ],
	[ 9, 7, 8, 5, 7, 9, 10, 1, 2, -1 ],
	[ 1, 11, 2, 1, 7, 11, 1, 5, 7, -1 ],
	[ 8, 0, 3, 1, 11, 2, 1, 7, 11, 1, 5, 7, -1 ],
	[ 7, 11, 2, 7, 2, 9, 2, 0, 9, 5, 7, 9, -1 ],
	[ 7, 9, 5, 8, 9, 7, 3, 11, 2, -1 ],
	[ 3, 1, 7, 7, 1, 5, -1 ],
	[ 8, 0, 7, 0, 1, 7, 1, 5, 7, -1 ],
	[ 0, 9, 3, 9, 5, 3, 5, 7, 3, -1 ],
	[ 9, 7, 8, 5, 7, 9, -1 ],
	[ 8, 5, 4, 8, 10, 5, 8, 11, 10, -1 ],
	[ 0, 3, 11, 0, 11, 5, 11, 10, 5, 4, 0, 5, -1 ],
	[ 1, 0, 9, 8, 5, 4, 8, 10, 5, 8, 11, 10, -1 ],
	[ 10, 3, 11, 1, 3, 10, 9, 5, 4, -1 ],
	[ 3, 2, 8, 8, 2, 4, 4, 2, 10, 4, 10, 5, -1 ],
	[ 10, 5, 2, 5, 4, 2, 4, 0, 2, -1 ],
	[ 5, 4, 9, 8, 3, 0, 10, 1, 2, -1 ],
	[ 2, 10, 1, 4, 9, 5, -1 ],
	[ 8, 11, 4, 11, 2, 1, 4, 11, 1, 4, 1, 5, -1 ],
	[ 0, 5, 4, 1, 5, 0, 2, 3, 11, -1 ],
	[ 0, 11, 2, 8, 11, 0, 4, 9, 5, -1 ],
	[ 5, 4, 9, 2, 3, 11, -1 ],
	[ 4, 8, 5, 8, 3, 5, 3, 1, 5, -1 ],
	[ 0, 5, 4, 1, 5, 0, -1 ],
	[ 5, 4, 9, 3, 0, 8, -1 ],
	[ 5, 4, 9, -1 ],
	[ 11, 4, 7, 11, 9, 4, 11, 10, 9, -1 ],
	[ 0, 3, 8, 11, 4, 7, 11, 9, 4, 11, 10, 9, -1 ],
	[ 11, 10, 7, 10, 1, 0, 7, 10, 0, 7, 0, 4, -1 ],
	[ 3, 10, 1, 11, 10, 3, 7, 8, 4, -1 ],
	[ 3, 2, 10, 3, 10, 4, 10, 9, 4, 7, 3, 4, -1 ],
	[ 9, 2, 10, 0, 2, 9, 8, 4, 7, -1 ],
	[ 3, 4, 7, 0, 4, 3, 1, 2, 10, -1 ],
	[ 7, 8, 4, 10, 1, 2, -1 ],
	[ 7, 11, 4, 4, 11, 9, 9, 11, 2, 9, 2, 1, -1 ],
	[ 1, 9, 0, 4, 7, 8, 2, 3, 11, -1 ],
	[ 7, 11, 4, 11, 2, 4, 2, 0, 4, -1 ],
	[ 4, 7, 8, 2, 3, 11, -1 ],
	[ 9, 4, 1, 4, 7, 1, 7, 3, 1, -1 ],
	[ 7, 8, 4, 1, 9, 0, -1 ],
	[ 3, 4, 7, 0, 4, 3, -1 ],
	[ 7, 8, 4, -1 ],
	[ 11, 10, 8, 8, 10, 9, -1 ],
	[ 0, 3, 9, 3, 11, 9, 11, 10, 9, -1 ],
	[ 1, 0, 10, 0, 8, 10, 8, 11, 10, -1 ],
	[ 10, 3, 11, 1, 3, 10, -1 ],
	[ 3, 2, 8, 2, 10, 8, 10, 9, 8, -1 ],
	[ 9, 2, 10, 0, 2, 9, -1 ],
	[ 8, 3, 0, 10, 1, 2, -1 ],
	[ 2, 10, 1, -1 ],
	[ 2, 1, 11, 1, 9, 11, 9, 8, 11, -1 ],
	[ 11, 2, 3, 9, 0, 1, -1 ],
	[ 11, 0, 8, 2, 0, 11, -1 ],
	[ 3, 11, 2, -1 ],
	[ 1, 8, 3, 9, 8, 1, -1 ],
	[ 1, 9, 0, -1 ],
	[ 8, 3, 0, -1 ],
	[ -1 ],
];

export const debugCubes = [];

const cornerOffset = [
    [0,0,0],
    [1,0,0],
    [1,0,1],
    [0,0,1],
    [0,1,0],
    [1,1,0],
    [1,1,1],
    [0,1,1]
];

const edgeConnection = [
    [0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]
];

function interpolateVertex(p1, p2, valP1, valP2, isoLevel) {
    if (Math.abs(valP2 - valP1) < 1e-6) return p1;
    const t = (isoLevel - valP1) / (valP2 - valP1);
    return [
        p1[0] + t * (p2[0] - p1[0]),
        p1[1] + t * (p2[1] - p1[1]),
        p1[2] + t * (p2[2] - p1[2])
    ];
}

const edgeKey = (x, y, z, edge) => {
    return `${x}|${y}|${z}|${edge}`;
};

function accumulateFaceNormal(indices, vertices) {
    const normals = new Array(vertices.length / 3).fill(null).map(() => ({ x: 0, y: 0, z: 0 }));
    for (let i = 0; i < indices.length; i += 3) {
        const i0 = indices[i], i1 = indices[i + 1], i2 = indices[i + 2];
        if (i0 === undefined || i1 === undefined || i2 === undefined) continue;
        const v0x = vertices[i0 * 3], v0y = vertices[i0 * 3 + 1], v0z = vertices[i0 * 3 + 2];
        const v1x = vertices[i1 * 3], v1y = vertices[i1 * 3 + 1], v1z = vertices[i1 * 3 + 2];
        const v2x = vertices[i2 * 3], v2y = vertices[i2 * 3 + 1], v2z = vertices[i2 * 3 + 2];

        const ax = v1x - v0x, ay = v1y - v0y, az = v1z - v0z;
        const bx = v2x - v0x, by = v2y - v0y, bz = v2z - v0z;
        const nx = ay * bz - az * by;
        const ny = az * bx - ax * bz;
        const nz = ax * by - ay * bx;

        normals[i0].x += nx; normals[i0].y += ny; normals[i0].z += nz;
        normals[i1].x += nx; normals[i1].y += ny; normals[i1].z += nz;
        normals[i2].x += nx; normals[i2].y += ny; normals[i2].z += nz;
    }

    const flattened = [];
    normals.forEach(n => {
        const len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z) || 1;
        flattened.push(n.x / len, n.y / len, n.z / len);
    });
    return flattened;
}

export function createMeshFromDensity(volume, dims, cellSize, opts = {}) {
    const isoLevel = opts.isoLevel ?? 0;
    const materialFn = opts.materialFn;
    const origin = opts.origin || { x: 0, y: 0, z: 0 };
    const vertices = [];
    const indices = [];
    const colors = [];
    const vertexCache = new Map();

    const indexFor = (x, y, z) => (y * dims.z + z) * dims.x + x;

    const getDensity = (x, y, z) => volume[indexFor(x, y, z)];

    for (let x = 0; x < dims.x - 1; x++) {
        for (let y = 0; y < dims.y - 1; y++) {
            for (let z = 0; z < dims.z - 1; z++) {
                const cube = new Array(8);
                for (let i = 0; i < 8; i++) {
                    const vx = x + cornerOffset[i][0];
                    const vy = y + cornerOffset[i][1];
                    const vz = z + cornerOffset[i][2];
                    cube[i] = getDensity(vx, vy, vz);
                }

                let cubeIndex = 0;
                if (cube[0] <= isoLevel) cubeIndex |= 1;
                if (cube[1] <= isoLevel) cubeIndex |= 2;
                if (cube[2] <= isoLevel) cubeIndex |= 4;
                if (cube[3] <= isoLevel) cubeIndex |= 8;
                if (cube[4] <= isoLevel) cubeIndex |= 16;
                if (cube[5] <= isoLevel) cubeIndex |= 32;
                if (cube[6] <= isoLevel) cubeIndex |= 64;
                if (cube[7] <= isoLevel) cubeIndex |= 128;

                const edges = edgeTable[cubeIndex];
                if (edges === 0) continue;

                debugCubes.push({
                    x: origin.x + x * cellSize,
                    y: origin.y + y * cellSize,
                    z: origin.z + z * cellSize,
                    size: cellSize,
                    edgesActive: edges
                });

                const vertList = new Array(12);
                for (let i = 0; i < 12; i++) {
                    if (edges & (1 << i)) {
                        const [c1, c2] = edgeConnection[i];
                        const p1 = cornerOffset[c1];
                        const p2 = cornerOffset[c2];
                        const worldP1 = [
                            origin.x + (x + p1[0]) * cellSize,
                            origin.y + (y + p1[1]) * cellSize,
                            origin.z + (z + p1[2]) * cellSize
                        ];
                        const worldP2 = [
                            origin.x + (x + p2[0]) * cellSize,
                            origin.y + (y + p2[1]) * cellSize,
                            origin.z + (z + p2[2]) * cellSize
                        ];

                        const key = edgeKey(x, y, z, i);
                        if (vertexCache.has(key)) {
                            vertList[i] = vertexCache.get(key);
                        } else {
                            const v = interpolateVertex(worldP1, worldP2, cube[c1], cube[c2], isoLevel);
                            vertList[i] = vertices.length / 3;
                            vertices.push(v[0], v[1], v[2]);
                            vertexCache.set(key, vertList[i]);
                        }
                    }
                }

                const t = triTable[cubeIndex];
                for (let i = 0; i < t.length; i += 3) {
                    const a = vertList[t[i]];
                    const b = vertList[t[i + 1]];
                    const c = vertList[t[i + 2]];
                    if (a === undefined || b === undefined || c === undefined || a === b || b === c || c === a) continue;
                    indices.push(a, b, c);
                }
            }
        }
    }

    const normals = accumulateFaceNormal(indices, vertices);

    if (materialFn) {
        for (let i = 0; i < vertices.length; i += 3) {
            const pos = { x: vertices[i], y: vertices[i + 1], z: vertices[i + 2] };
            const normal = { x: normals[i], y: normals[i + 1], z: normals[i + 2] };
            const c = materialFn(pos, normal);
            colors.push(c[0], c[1], c[2]);
        }
    } else {
        for (let i = 0; i < vertices.length; i += 3) {
            colors.push(0.5, 0.6, 0.4);
        }
    }

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
