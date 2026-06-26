import * as simplexNoise from './noise.js';
import * as table from './generateTables.js';
import { Mesh } from '../engine/Mesh.js';

const VOXEL_SIZE = 1;
const ISO_LEVEL = 0;
const BASE_HEIGHT = 10;

const tables = table.buildMarchingTables();

const CORNERS = tables.CORNERS;
const EDGES = tables.EDGES;
const EDGE_TABLE = tables.EDGE_TABLE;
const TRI_TABLE = tables.TRI_TABLE;

function interpolateVertex(p1, p2, v1, v2, isoLevel = 0) {
    const denom = (v2 - v1);

    if (Math.abs(denom) < 1e-6) {
        return {
            x: (p1.x + p2.x) * 0.5,
            y: (p1.y + p2.y) * 0.5,
            z: (p1.z + p2.z) * 0.5
        };
    }

    const t = (isoLevel - v1) / denom;

    return {
        x: p1.x + (p2.x - p1.x) * t,
        y: p1.y + (p2.y - p1.y) * t,
        z: p1.z + (p2.z - p1.z) * t
    };
}

function polygonizeCube(x, y, z, densities, isoLevel, vertices, indices, texCoords) {
    let cubeIndex = 0;

    // Build cube index
    for (let i = 0; i < 8; i++) {
        if (densities[i] >= isoLevel) {
            cubeIndex |= (1 << i);
        }
    }

    const config = TRI_TABLE[cubeIndex];
    if (!config || config[0] === -1) return;

    const edgeVerts = new Array(12);

    for (let edge = 0; edge < 12; edge++) {

        const [a, b] = EDGES[edge];

        const da = densities[a];
        const db = densities[b];

        const ca = CORNERS[a];
        const cb = CORNERS[b];

        const pa = {
            x: (x + ca[0]) * VOXEL_SIZE,
            y: (y + ca[1]) * VOXEL_SIZE,
            z: (z + ca[2]) * VOXEL_SIZE
        };

        const pb = {
            x: (x + cb[0]) * VOXEL_SIZE,
            y: (y + cb[1]) * VOXEL_SIZE,
            z: (z + cb[2]) * VOXEL_SIZE
        };

        //edgeVerts[edge] = interpolateVertex(pa, pb, da, db, isoLevel);

		const crosses =
    		(da < isoLevel && db >= isoLevel) ||
    		(db < isoLevel && da >= isoLevel);

		if (crosses) {
    		edgeVerts[edge] = interpolateVertex(pa, pb, da, db, isoLevel);
		}
    }

    let ptr = 0;

    // Build triangles
    while (config[ptr] !== -1) {

        const e0 = config[ptr++];
        const e1 = config[ptr++];
        const e2 = config[ptr++];

        const v0 = edgeVerts[e0];
        const v1 = edgeVerts[e1];
        const v2 = edgeVerts[e2];

        // Safety check (should almost never trigger now)
        if (!v0 || !v1 || !v2) continue;

        const start = vertices.length / 3;
        const uvScale = 0.05;

        vertices.push(
            v0.x, v0.y, v0.z,
            v1.x, v1.y, v1.z,
            v2.x, v2.y, v2.z
        );

        texCoords.push(
            v0.x * uvScale, v0.z * uvScale,
            v1.x * uvScale, v1.z * uvScale,
            v2.x * uvScale, v2.z * uvScale
        );

        indices.push(start, start + 1, start + 2);
    }
}

function density(noise, x, y, z) {
    return y - noise.getTerrainHeight(x, z, BASE_HEIGHT);
}

export function computeNormals(vertices, indices) {
    const normals = new Array(vertices.length).fill(0);

    for (let i = 0; i < indices.length; i += 3)
    {
        const ai = indices[i];
        const bi = indices[i + 1];
        const ci = indices[i + 2];

        const ax = vertices[ai * 3];
        const ay = vertices[ai * 3 + 1];
        const az = vertices[ai * 3 + 2];

        const bx = vertices[bi * 3];
        const by = vertices[bi * 3 + 1];
        const bz = vertices[bi * 3 + 2];

        const cx = vertices[ci * 3];
        const cy = vertices[ci * 3 + 1];
        const cz = vertices[ci * 3 + 2];

        const ux = bx - ax;
        const uy = by - ay;
        const uz = bz - az;

        const vx = cx - ax;
        const vy = cy - ay;
        const vz = cz - az;

        const nx = uy * vz - uz * vy;
        const ny = uz * vx - ux * vz;
        const nz = ux * vy - uy * vx;

        normals[ai * 3]     += nx;
        normals[ai * 3 + 1] += ny;
        normals[ai * 3 + 2] += nz;

        normals[bi * 3]     += nx;
        normals[bi * 3 + 1] += ny;
        normals[bi * 3 + 2] += nz;

        normals[ci * 3]     += nx;
        normals[ci * 3 + 1] += ny;
        normals[ci * 3 + 2] += nz;
    }

    return normals;
}

export function generateLandscape(chunkX, chunkY, chunkZ, chunkSize, noise) {
    const vertices = [];
    const indices = [];
	const texCoords = [];

    const densities = new Array(8);

    const baseX = chunkX * chunkSize;
    const baseY = chunkY * chunkSize;
    const baseZ = chunkZ * chunkSize;

    for (let z = 0; z < chunkSize; z++)
    for (let y = 0; y < chunkSize; y++)
    for (let x = 0; x < chunkSize; x++) {
        const wx = baseX + x;
        const wy = baseY + y;
        const wz = baseZ + z;

        for (let c = 0; c < 8; c++) {
            const corner = CORNERS[c];

            densities[c] = density(noise, wx + corner[0], wy + corner[1], wz + corner[2]);
        }

        polygonizeCube(wx, wy, wz, densities, ISO_LEVEL, vertices, indices, texCoords);
    }

    const normals = computeNormals(vertices, indices);
    return {vertices: vertices, indices: indices, normals: normals, texCoords: texCoords};
}
