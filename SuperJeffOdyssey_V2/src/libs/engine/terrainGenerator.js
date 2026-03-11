import { createMeshFromDensity } from './terrainMesh.js';
import { generateCapStructures, generateCascadeStructures, generateSandStructures } from './../../structures.js';
import { kingdomConfigs } from '../../globals.js';

const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a, b, t) => a + (b - a) * t;

function pseudoRandom(x, z, seed) {
    let value = (x * 374761393 + z * 668265263 + seed * 1274126177) | 0;
    value = Math.imul(value ^ (value >>> 13), 1274126177);
    return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function valueNoise(x, z, seed) {
    const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
    const n00 = pseudoRandom(xi, zi, seed), n10 = pseudoRandom(xi + 1, zi, seed);
    const n01 = pseudoRandom(xi, zi + 1, seed), n11 = pseudoRandom(xi + 1, zi + 1, seed);
    return lerp(lerp(n00, n10, fade(xf)), lerp(n01, n11, fade(xf)), fade(zf));
}

const layeredNoise = (x, z, seed, opts) => {
    let amplitude = 1, frequency = 1, sum = 0, max = 0;
    for (let octave = 0; octave < opts.octaves; octave++) {
        sum += valueNoise(x * frequency, z * frequency, seed + octave * 31) * amplitude;
        max += amplitude;
        amplitude *= opts.persistence;
        frequency *= opts.lacunarity;
    }
    return sum / Math.max(max, 1);
};

const mulberry32 = (seed) => {
    let state = seed >>> 0;
    return () => {
        state |= 0; state = Math.imul(state + 0x6D2B79F5, 0xD2A4DAB5);
        state ^= state >>> 15; state = Math.imul(state, 0x85EBCA6B);
        return ((state ^ (state >>> 13)) >>> 0) / 4294967296;
    };
};

const defaultOptions = {
    baseHeight: 0,
    detailScale: 0.025,
    persistence: 0.5,
    lacunarity: 2.0,
    octaves: 5,
    voxelSize: 6,
    volumeHeight: 80,
    isoLevel: -0.1,
    collisionCellSize: 12,
    smoothingPasses: 2,
    islandRadiusFactor: 0.55,
    walkerDensity: 6,
    soupCount: 1,
    moons: 20,
    platformCount: 15,
    baseLayerScale: 0.018,
    elevationLayerScale: 0.024,
    detailLayerScale: 0.06,
    structureLayerScale: 0.015,
    caveThreshold: 0.55,
    structureStrength: 1.35
};

const idx3d = (x, y, z, dims) => (y * dims.z + z) * dims.x + x;

function buildLayerMaps(width, depth, cellSize, seeds, opts) {
    const dimX = Math.floor(width / cellSize) + 1;
    const dimZ = Math.floor(depth / cellSize) + 1;
    const base = new Float32Array(dimX * dimZ);
    const elev = new Float32Array(dimX * dimZ);
    const detail = new Float32Array(dimX * dimZ);
    const structure = new Float32Array(dimX * dimZ);

    for (let ix = 0; ix < dimX; ix++) {
        for (let iz = 0; iz < dimZ; iz++) {
            const x = (ix - dimX * 0.5) * cellSize;
            const z = (iz - dimZ * 0.5) * cellSize;
            const baseVal = layeredNoise(x * opts.baseLayerScale, z * opts.baseLayerScale, seeds.base, opts);
            const elevVal = layeredNoise(x * opts.elevationLayerScale, z * opts.elevationLayerScale, seeds.elevation, opts);
            const detailVal = layeredNoise(x * opts.detailLayerScale, z * opts.detailLayerScale, seeds.detail, opts);
            const ridgeVal = 1 - Math.abs(2 * valueNoise(x * opts.detailLayerScale * 0.6, z * opts.detailLayerScale * 0.6, seeds.detail + 777) - 1);
            const structureVal = layeredNoise(x * opts.structureLayerScale, z * opts.structureLayerScale, seeds.structure, opts) * 0.65 + ridgeVal * 0.35;

            base[idx3d(ix, 0, iz, { x: dimX, y: 1, z: dimZ })] = baseVal;
            elev[idx3d(ix, 0, iz, { x: dimX, y: 1, z: dimZ })] = elevVal;
            detail[idx3d(ix, 0, iz, { x: dimX, y: 1, z: dimZ })] = detailVal;
            structure[idx3d(ix, 0, iz, { x: dimX, y: 1, z: dimZ })] = structureVal;
        }
    }

    return { dimX, dimZ, base, elev, detail, structure };
}

function smoothVolume(volume, dims, passes = 1) {
    let current = volume;
    for (let p = 0; p < passes; p++) {
        const next = new Float32Array(current.length);
        for (let x = 0; x < dims.x; x++) {
            for (let y = 0; y < dims.y; y++) {
                for (let z = 0; z < dims.z; z++) {
                    let sum = 0, count = 0;
                    for (let dx = -1; dx <= 1; dx++) {
                        for (let dy = -1; dy <= 1; dy++) {
                            for (let dz = -1; dz <= 1; dz++) {
                                const nx = x + dx, ny = y + dy, nz = z + dz;
                                if (nx < 0 || ny < 0 || nz < 0 || nx >= dims.x || ny >= dims.y || nz >= dims.z) continue;
                                sum += current[idx3d(nx, ny, nz, dims)];
                                count++;
                            }
                        }
                    }
                    next[idx3d(x, y, z, dims)] = sum / Math.max(1, count);
                }
            }
        }
        current = next;
    }
    return current;
}

function buildDensityVolume(opts, width, depth) {
    const cell = opts.voxelSize;
    const dims = {
        x: Math.floor(width / cell) + 1,
        y: Math.floor(opts.volumeHeight / cell) + 1,
        z: Math.floor(depth / cell) + 1
    };

    const bounds = {
        minX: -width * 0.5,
        maxX: width * 0.5,
        minZ: -depth * 0.5,
        maxZ: depth * 0.5,
        minY: opts.baseHeight - opts.volumeHeight * 0.35,
        maxY: 0 // placeholder
    };
    bounds.maxY = bounds.minY + (dims.y - 1) * cell;
    const seeds = {
        base: ((opts.seed || 1) * 31) | 0,
        elevation: ((opts.seed || 1) * 47) | 0,
        detail: ((opts.seed || 1) * 71) | 0,
        structure: ((opts.seed || 1) * 101) | 0
    };

    const layers = buildLayerMaps(width, depth, cell, seeds, opts);
    const volume = new Float32Array(dims.x * dims.y * dims.z);

    for (let ix = 0; ix < dims.x; ix++) {
        for (let iz = 0; iz < dims.z; iz++) {
            const worldX = bounds.minX + ix * cell;
            const worldZ = bounds.minZ + iz * cell;
            const dist = Math.sqrt(worldX * worldX + worldZ * worldZ);
            const radialFade = Math.max(0, 1 - dist / (Math.max(width, depth) * (opts.islandRadiusFactor || 0.55)));
            const baseVal = layers.base[idx3d(ix, 0, iz, { x: layers.dimX, y: 1, z: layers.dimZ })];
            const elevVal = layers.elev[idx3d(ix, 0, iz, { x: layers.dimX, y: 1, z: layers.dimZ })];
            const detailVal = layers.detail[idx3d(ix, 0, iz, { x: layers.dimX, y: 1, z: layers.dimZ })];
            const structureVal = layers.structure[idx3d(ix, 0, iz, { x: layers.dimX, y: 1, z: layers.dimZ })];

            for (let iy = 0; iy < dims.y; iy++) {
                const worldY = bounds.minY + iy * cell;
                const ny = (worldY - bounds.minY) / (bounds.maxY - bounds.minY);

                let density = 1.25 * (1 - ny); // keep lower volume solid
                density += (baseVal - 0.48) * 1.9 * radialFade;
                density += (elevVal - 0.5) * (1.2 - ny) * 1.35;

                const ridge = Math.pow(Math.max(0, structureVal - 0.52), 1.25);
                density += ridge * 1.25 * radialFade;

                const caveCut = Math.max(0, detailVal - opts.caveThreshold);
                density -= caveCut * 1.9;

                const archBand = 1 - Math.abs(ny - 0.58) * 1.65;
                density += Math.max(0, structureVal - 0.48) * opts.structureStrength * archBand;

                const overhang = Math.max(0, 0.55 - detailVal) * 0.32 * (0.85 - ny);
                density += overhang;

                density -= (1 - radialFade) * 2.6; // carve outside radius harder to avoid shards
                density -= ny * 0.35; // soften ceiling

                if (radialFade < 0.08) density -= 2.5;
                density = Math.max(-4, Math.min(4, density));

                volume[idx3d(ix, iy, iz, dims)] = density;
            }
        }
    }

    const smoothed = smoothVolume(volume, dims, Math.max(1, opts.smoothingPasses || 1));
    return { volume: smoothed, dims, bounds };
}

function buildCollisionIndex(vertices, indices, cellSize) {
    const triangles = [];
    const cells = new Map();

    const addToCell = (ix, iz, triIndex) => {
        const key = `${ix},${iz}`;
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push(triIndex);
    };

    for (let i = 0; i < indices.length; i += 3) {
        const aIdx = indices[i] * 3;
        const bIdx = indices[i + 1] * 3;
        const cIdx = indices[i + 2] * 3;
        const tri = {
            a: { x: vertices[aIdx], y: vertices[aIdx + 1], z: vertices[aIdx + 2] },
            b: { x: vertices[bIdx], y: vertices[bIdx + 1], z: vertices[bIdx + 2] },
            c: { x: vertices[cIdx], y: vertices[cIdx + 1], z: vertices[cIdx + 2] }
        };
        triangles.push(tri);

        const minX = Math.min(tri.a.x, tri.b.x, tri.c.x);
        const maxX = Math.max(tri.a.x, tri.b.x, tri.c.x);
        const minZ = Math.min(tri.a.z, tri.b.z, tri.c.z);
        const maxZ = Math.max(tri.a.z, tri.b.z, tri.c.z);

        const startX = Math.floor(minX / cellSize) - 1;
        const endX = Math.floor(maxX / cellSize) + 1;
        const startZ = Math.floor(minZ / cellSize) - 1;
        const endZ = Math.floor(maxZ / cellSize) + 1;

        for (let gx = startX; gx <= endX; gx++) {
            for (let gz = startZ; gz <= endZ; gz++) {
                addToCell(gx, gz, triangles.length - 1);
            }
        }
    }

    return { triangles, cells, cellSize };
}

function barycentricHeight(tri, x, z) {
    const v0 = { x: tri.b.x - tri.a.x, z: tri.b.z - tri.a.z };
    const v1 = { x: tri.c.x - tri.a.x, z: tri.c.z - tri.a.z };
    const v2 = { x: x - tri.a.x, z: z - tri.a.z };
    const d00 = v0.x * v0.x + v0.z * v0.z;
    const d01 = v0.x * v1.x + v0.z * v1.z;
    const d11 = v1.x * v1.x + v1.z * v1.z;
    const d20 = v2.x * v0.x + v2.z * v0.z;
    const d21 = v2.x * v1.x + v2.z * v1.z;
    const denom = d00 * d11 - d01 * d01;
    if (Math.abs(denom) < 1e-6) return null;
    const v = (d11 * d20 - d01 * d21) / denom;
    const w = (d00 * d21 - d01 * d20) / denom;
    const u = 1 - v - w;
    if (u < -1e-4 || v < -1e-4 || w < -1e-4) return null;

    const y = u * tri.a.y + v * tri.b.y + w * tri.c.y;
    return y;
}

function queryHeightFromCollision(collision, x, z, maxY = Infinity) {
    if (!collision) return null;
    const cellSize = collision.cellSize;
    const cx = Math.floor(x / cellSize);
    const cz = Math.floor(z / cellSize);
    let best = null;

    for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
            const key = `${cx + dx},${cz + dz}`;
            const list = collision.cells.get(key);
            if (!list) continue;
            for (const triIndex of list) {
                const tri = collision.triangles[triIndex];
                const y = barycentricHeight(tri, x, z);
                if (y === null || y > maxY + 0.05) continue;
                if (best === null || y > best) best = y;
            }
        }
    }

    return best;
}

function bakeHeightMapFromCollision(collision, gridSize, width, depth, sampler) {
    const halfX = Math.ceil(width / gridSize / 2);
    const halfZ = Math.ceil(depth / gridSize / 2);
    const heightMap = {};
    for (let ix = -halfX; ix <= halfX; ix++) {
        for (let iz = -halfZ; iz <= halfZ; iz++) {
            const x = ix * gridSize;
            const z = iz * gridSize;
            const h = sampler(x, z, Infinity);
            if (h !== null) heightMap[`${ix},${iz}`] = h;
        }
    }
    return heightMap;
}

function averageHeightFromMap(heightMap, fallback) {
    const values = Object.values(heightMap);
    if (!values.length) return fallback;
    return values.reduce((a, b) => a + b, 0) / values.length;
}

function pickMaterial(bounds, opts) {
    return (pos, normal) => {
        const h = (pos.y - bounds.minY) / (bounds.maxY - bounds.minY);
        const slope = 1 - Math.max(-1, Math.min(1, normal.y));

        if (h > 0.72 && slope < 0.6) return [0.92, 0.92, 0.95]; // snow cap
        if (h < 0.32 && slope < 0.5) return [0.75, 0.65, 0.55]; // soil
        if (slope > 0.7) return [0.45, 0.46, 0.5]; // cliff rock
        if (opts.biome === 'desert') return [0.88, 0.8, 0.62];
        if (opts.biome === 'volcanic') return [0.4, 0.25, 0.22];
        if (opts.biome === 'city') return [0.55, 0.58, 0.62];
        return opts.groundColor || [0.35, 0.6, 0.45];
    };
}

export function generateLevelLayout(config = {}) {
    const opts = { ...defaultOptions, ...config };
    if (!opts.voxelSize && opts.gridSize) opts.voxelSize = opts.gridSize;
    const width = (opts.size && opts.size.x) || opts.size || 140;
    const depth = (opts.size && opts.size.z) || opts.size || 140;

    if (opts.kingdom === 'hub' && !opts.fromLevelFile) {
        return generateTropicalHub(opts);
    }

    const { volume, dims, bounds } = buildDensityVolume(opts, width, depth);
    const materialFn = pickMaterial(bounds, opts);
    const origin = { x: bounds.minX, y: bounds.minY, z: bounds.minZ };
    const mesh = createMeshFromDensity(volume, dims, opts.voxelSize, { isoLevel: opts.isoLevel, materialFn, origin });
    const collision = buildCollisionIndex(mesh.vertices, mesh.indices, opts.collisionCellSize || opts.voxelSize * 2);
    const sampleHeight = (x, z, maxY = Infinity) => queryHeightFromCollision(collision, x, z, maxY);
    const heightMap = bakeHeightMapFromCollision(collision, opts.voxelSize, width, depth, sampleHeight);
    const averageHeight = averageHeightFromMap(heightMap, opts.baseHeight);
    const centerHeight = sampleHeight(0, 0, Infinity) ?? averageHeight;

    const platforms = [];
    const rng = mulberry32(((opts.seed || 1) + 73) >>> 0);
    const randomInRange = (min, max) => min + rng() * (max - min);
    const objectNoiseSeed = ((opts.seed || 1) * 131) | 0;
    const objectNoiseFn = (x, z) => layeredNoise(x, z, objectNoiseSeed, opts);
    const spreadX = width * 0.45, spreadZ = depth * 0.45;

    const choosePos = () => {
        for (let tries = 0; tries < 12; tries++) {
            const x = randomInRange(bounds.minX * 0.8, bounds.maxX * 0.8);
            const z = randomInRange(bounds.minZ * 0.8, bounds.maxZ * 0.8);
            const mask = objectNoiseFn(x * opts.detailScale * 0.5, z * opts.detailScale * 0.5);
            if (mask > 0.42) return { x, z };
        }
        return { x: randomInRange(-spreadX, spreadX), z: randomInRange(-spreadZ, spreadZ) };
    };

    const objectsPreset = Array.isArray(opts.objects) ? opts.objects : null;

    let structures = [];
    let moons = [], soups = [], walkers = [];

    if (objectsPreset && objectsPreset.length) {
        objectsPreset.forEach(obj => {
            const x = obj.x ?? 0;
            const z = obj.z ?? 0;
            const groundH = sampleHeight(x, z, Infinity);
            const y = obj.y ?? (groundH !== null ? groundH : 0);
            if (obj.type === 'platform') {
                platforms.push({
                    x,
                    y,
                    z,
                    width: obj.width || 8,
                    depth: obj.depth || 8,
                    height: obj.height || 1,
                    color: obj.color || opts.platformColor || [0.5, 0.6, 0.7]
                });
            } else if (obj.type === 'moon') {
                moons.push({ x, y: y + 2, z });
            } else if (obj.type === 'soup') {
                soups.push({ x, y: y + 1.2, z });
            } else if (obj.type === 'walker') {
                walkers.push({ x, z, y: y + 0.6 });
            } else if (obj.type === 'entrance') {
                structures.push({
                    type: 'entrance',
                    x,
                    y,
                    z,
                    target: obj.target || obj.to || 'cap'
                });
            } else {
                structures.push({ ...obj, x, y, z });
            }
        });
    } else {
        for (let i = 0; i < (opts.platformCount || 15); i++) {
            const { x, z } = choosePos();
            const groundH = sampleHeight(x, z, Infinity);
            if (groundH === null) continue;
            platforms.push({
                x,
                y: groundH + randomInRange(6, 14),
                z,
                width: randomInRange(6, 12),
                depth: randomInRange(6, 12),
                height: 0.8,
                color: opts.platformColor || [0.5, 0.6, 0.7]
            });
        }

        if (opts.kingdom === 'cap') structures = generateCapStructures(rng, width, depth);
        else if (opts.kingdom === 'cascade') structures = generateCascadeStructures(rng, width, depth);
        else if (opts.kingdom === 'sand') structures = generateSandStructures(rng, width, depth);

        for (let i = 0; i < (opts.moons || 0); i++) {
            const { x, z } = choosePos();
            const baseH = sampleHeight(x, z, Infinity);
            if (baseH === null) continue;
            moons.push({ x, y: baseH + (rng() > 0.55 ? randomInRange(6, 16) : 2.5), z });
        }
        for (let i = 0; i < (opts.soupCount || 0); i++) {
            const { x, z } = choosePos();
            const baseH = sampleHeight(x, z, Infinity);
            if (baseH === null) continue;
            soups.push({ x, y: baseH + 1.5, z });
        }
        for (let i = 0; i < Math.max(4, opts.walkerDensity || 6); i++) {
            const { x, z } = choosePos();
            const baseH = sampleHeight(x, z, Infinity);
            if (baseH === null) continue;
            walkers.push({ x, z, y: baseH + 0.7 });
        }
    }

    return {
        platforms,
        moons,
        soups,
        walkers,
        structures,
        terrainMesh: mesh,
        collision,
        sampleHeight,
        centerHeight,
        averageHeight,
        heightMap,
        gridSize: opts.voxelSize
    };
}

function generateTropicalHub(opts) {
    const width = (opts.size && opts.size.x) || opts.size || 200;
    const depth = (opts.size && opts.size.z) || opts.size || 200;
    const cell = opts.voxelSize || 6;
    const dims = {
        x: Math.floor(width / cell) + 1,
        y: Math.floor(36 / cell) + 1,
        z: Math.floor(depth / cell) + 1
    };
    const bounds = { minY: -10, maxY: 26 };
    const volume = new Float32Array(dims.x * dims.y * dims.z);

    const islandRadius = Math.max(width, depth) * 0.6;
    for (let x = 0; x < dims.x; x++) {
        for (let z = 0; z < dims.z; z++) {
            const wx = (x - dims.x * 0.5) * cell;
            const wz = (z - dims.z * 0.5) * cell;
            const dist = Math.sqrt(wx * wx + wz * wz);
            const radial = Math.max(0, 1 - dist / islandRadius);

            for (let y = 0; y < dims.y; y++) {
                const wy = bounds.minY + y * cell;
                const ny = (wy - bounds.minY) / (bounds.maxY - bounds.minY);
                let density = 1.6 * radial - ny * 0.85;
                density += Math.max(0, radial - 0.35) * 0.9;
                if (radial < 0.12) density -= 3.0;
                density = Math.max(-4, Math.min(4, density));
                volume[idx3d(x, y, z, dims)] = density;
            }
        }
    }

    const smoothed = smoothVolume(volume, dims, 2);
    const origin = { x: -width * 0.5, y: bounds.minY, z: -depth * 0.5 };
    const mesh = createMeshFromDensity(smoothed, dims, cell, { materialFn: () => [0.48, 0.65, 0.55], origin });
    const collision = buildCollisionIndex(mesh.vertices, mesh.indices, (opts.collisionCellSize || cell * 2));
    const sampleHeight = (x, z, maxY = Infinity) => queryHeightFromCollision(collision, x, z, maxY);
    const heightMap = bakeHeightMapFromCollision(collision, cell, width, depth, sampleHeight);
    const averageHeight = averageHeightFromMap(heightMap, 0);

    const platforms = [];
    const structures = [];
    const moons = [];
    const soups = [];
    const walkers = [];

    const hubBase = sampleHeight(0, 0, Infinity) ?? 0;
    platforms.push({ x:0, y:hubBase, z:0, width: width*0.3, depth: depth*0.3, height:1.2, color:[0.9,0.9,0.85] });

    const roadWidth = 8;
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dz]) => {
        const rx = dx * width*0.2;
        const rz = dz * depth*0.2;
        const ry = (sampleHeight(rx, rz, Infinity) ?? hubBase) + 0.1;
        platforms.push({
            x: rx, y: ry, z: rz,
            width: dx!==0 ? roadWidth : width*0.4,
            depth: dz!==0 ? roadWidth : depth*0.4,
            height:1, color:[0.7,0.7,0.7]
        });
    });

    const kingdomKeys = Object.keys(kingdomConfigs).filter(k => k !== 'hub');
    const entranceAngles = kingdomKeys.map((_,i) => (i / kingdomKeys.length) * Math.PI * 2);
    kingdomKeys.forEach((key,i) => {
        const ang = entranceAngles[i];
        const ex = Math.cos(ang) * (width*0.15);
        const ez = Math.sin(ang) * (depth*0.15);
        const ey = (sampleHeight(ex, ez, Infinity) ?? hubBase) + 0.5;
        structures.push({
            type: 'entrance', x: ex, y: ey, z: ez,
            width: 4, height: 4, depth: 2,
            color: [1,0.5,0],
            target: key
        });
    });

    for (let i=0;i<50;i++){
        const vertical = Math.floor(Math.random()*4);
        const angle = entranceAngles[Math.floor(Math.random()*entranceAngles.length)];
        const cx = Math.cos(angle)*width*0.2 + (Math.random()-0.5)*20;
        const cz = Math.sin(angle)*depth*0.2 + (Math.random()-0.5)*20;
        moons.push({ x:cx, y:1+vertical*3, z:cz });
    }

    for (let i=0;i<10;i++){
        const cx = (Math.random()*2-1)*width*0.4;
        const cz = (Math.random()*2-1)*depth*0.4;
        moons.push({ x:cx, y:2, z:cz });
    }

    const caveX = -width*0.2;
    const caveZ = depth*0.1;
    const caveY = (sampleHeight(caveX, caveZ, Infinity) ?? hubBase) - 5;
    platforms.push({ x:caveX, y:caveY, z:caveZ, width:20, depth:20, height:1, color:[0.2,0.2,0.3] });
    structures.push({ type:'cave', x:caveX, y:caveY + 1, z:caveZ, width:10, height:6, depth:6, color:[0.1,0.1,0.2] });

    const waterX = width*0.3;
    const waterZ = 0;
    const waterY = (sampleHeight(waterX, waterZ, Infinity) ?? hubBase) - 0.6;
    platforms.push({ x:waterX, y:waterY, z:waterZ, width:width*0.4, depth:depth*0.4, height:1, color:[0.2,0.4,0.8] });

    for (let i=0;i<6;i++){
        const x = (Math.random()*2-1)*width*0.3;
        const z = (Math.random()*2-1)*depth*0.3;
        const wy = (sampleHeight(x, z, Infinity) ?? hubBase) + 1;
        walkers.push({ x,z,y:wy });
    }

    return {
        platforms,
        moons,
        soups,
        walkers,
        structures,
        terrainMesh: mesh,
        collision,
        sampleHeight,
        centerHeight:0,
        averageHeight,
        heightMap,
        gridSize: cell
    };
}
