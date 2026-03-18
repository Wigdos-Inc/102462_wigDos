import { createTerrainMesh } from './terrainMesh.js';
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
    const xi = Math.floor(x);
    const zi = Math.floor(z);
    const xf = x - xi;
    const zf = z - zi;

    const n00 = pseudoRandom(xi, zi, seed);
    const n10 = pseudoRandom(xi + 1, zi, seed);
    const n01 = pseudoRandom(xi, zi + 1, seed);
    const n11 = pseudoRandom(xi + 1, zi + 1, seed);

    return lerp(lerp(n00, n10, fade(xf)), lerp(n01, n11, fade(xf)), fade(zf));
}

const layeredNoise = (x, z, seed, opts) => {
    let amplitude = 1;
    let frequency = 1;
    let sum = 0;
    let max = 0;

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
        state |= 0;
        state = Math.imul(state + 0x6D2B79F5, 0xD2A4DAB5);
        state ^= state >>> 15;
        state = Math.imul(state, 0x85EBCA6B);
        return ((state ^ (state >>> 13)) >>> 0) / 4294967296;
    };
};

const defaultOptions = {
    baseHeight: 0,
    detailScale: 0.025,
    persistence: 0.5,
    lacunarity: 2.0,
    octaves: 5,
    gridSize: 6,
    islandRadiusFactor: 0.62,
    moons: 20,
    platformCount: 15,
    walkerDensity: 6,
    soupCount: 1
};

function averageHeightFromMap(heightMap, fallback) {
    const values = Object.values(heightMap);
    if (!values.length) return fallback;
    return values.reduce((a, b) => a + b, 0) / values.length;
}

function buildHeightMap(opts, width, depth) {
    const cell = opts.gridSize;
    const halfX = Math.ceil(width / cell / 2);
    const halfZ = Math.ceil(depth / cell / 2);
    const seed = (opts.seed || 1) | 0;
    const radius = Math.max(width, depth) * (opts.islandRadiusFactor || 0.62);
    const heightMap = {};

    for (let ix = -halfX; ix <= halfX; ix++) {
        for (let iz = -halfZ; iz <= halfZ; iz++) {
            const x = ix * cell;
            const z = iz * cell;
            const dist = Math.sqrt(x * x + z * z);
            const radial = Math.max(0, 1 - dist / radius);

            const base = layeredNoise(x * opts.detailScale * 0.4, z * opts.detailScale * 0.4, seed + 41, opts);
            const detail = layeredNoise(x * opts.detailScale, z * opts.detailScale, seed + 113, opts);
            const ridge = 1 - Math.abs(2 * valueNoise(x * opts.detailScale * 0.8, z * opts.detailScale * 0.8, seed + 197) - 1);

            let h = opts.baseHeight;
            h += (base - 0.5) * 16;
            h += (detail - 0.5) * 8;
            h += ridge * 4;
            h += radial * 10;
            h -= (1 - radial) * 18;

            if (radial < 0.03) continue;
            heightMap[`${ix},${iz}`] = h;
        }
    }

    return { heightMap, halfX, halfZ, cell };
}

function readHeight(heightMap, ix, iz) {
    const h = heightMap[`${ix},${iz}`];
    return h === undefined ? null : h;
}

function createHeightSampler(heightMap, gridSize) {
    return (x, z, maxY = Infinity) => {
        const gx = x / gridSize;
        const gz = z / gridSize;
        const x0 = Math.floor(gx);
        const z0 = Math.floor(gz);
        const x1 = x0 + 1;
        const z1 = z0 + 1;

        const h00 = readHeight(heightMap, x0, z0);
        const h10 = readHeight(heightMap, x1, z0);
        const h01 = readHeight(heightMap, x0, z1);
        const h11 = readHeight(heightMap, x1, z1);

        if (h00 === null || h10 === null || h01 === null || h11 === null) return null;

        const tx = gx - x0;
        const tz = gz - z0;
        const h0 = lerp(h00, h10, tx);
        const h1 = lerp(h01, h11, tx);
        const h = lerp(h0, h1, tz);
        return h <= maxY + 0.05 ? h : null;
    };
}

function choosePosition(rng, minX, maxX, minZ, maxZ, sampleHeight) {
    for (let tries = 0; tries < 24; tries++) {
        const x = minX + rng() * (maxX - minX);
        const z = minZ + rng() * (maxZ - minZ);
        const h = sampleHeight(x, z, Infinity);
        if (h !== null) return { x, z, h };
    }
    return null;
}

export function generateLevelLayout(config = {}) {
    const opts = { ...defaultOptions, ...config };
    if (!opts.gridSize && opts.voxelSize) opts.gridSize = opts.voxelSize;

    const width = (opts.size && opts.size.x) || opts.size || 140;
    const depth = (opts.size && opts.size.z) || opts.size || 140;

    if (opts.kingdom === 'hub' && !opts.fromLevelFile) {
        return generateTropicalHub(opts, width, depth);
    }

    const { heightMap } = buildHeightMap(opts, width, depth);
    const mesh = createTerrainMesh(heightMap, opts.gridSize, width, depth);
    const sampleHeight = createHeightSampler(heightMap, opts.gridSize);

    const averageHeight = averageHeightFromMap(heightMap, opts.baseHeight);
    const centerHeight = sampleHeight(0, 0, Infinity) ?? averageHeight;

    const rng = mulberry32(((opts.seed || 1) + 73) >>> 0);
    const bounds = {
        minX: -width * 0.45,
        maxX: width * 0.45,
        minZ: -depth * 0.45,
        maxZ: depth * 0.45
    };

    const platforms = [];
    const objectsPreset = Array.isArray(opts.objects) ? opts.objects : null;
    let structures = [];
    let moons = [];
    let soups = [];
    let walkers = [];

    if (objectsPreset && objectsPreset.length) {
        objectsPreset.forEach((obj) => {
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
            const pick = choosePosition(rng, bounds.minX, bounds.maxX, bounds.minZ, bounds.maxZ, sampleHeight);
            if (!pick) continue;
            platforms.push({
                x: pick.x,
                y: pick.h + 6 + rng() * 8,
                z: pick.z,
                width: 6 + rng() * 6,
                depth: 6 + rng() * 6,
                height: 0.8,
                color: opts.platformColor || [0.5, 0.6, 0.7]
            });
        }

        if (opts.kingdom === 'cap') structures = generateCapStructures(rng, width, depth);
        else if (opts.kingdom === 'cascade') structures = generateCascadeStructures(rng, width, depth);
        else if (opts.kingdom === 'sand') structures = generateSandStructures(rng, width, depth);

        for (let i = 0; i < (opts.moons || 0); i++) {
            const pick = choosePosition(rng, bounds.minX, bounds.maxX, bounds.minZ, bounds.maxZ, sampleHeight);
            if (!pick) continue;
            moons.push({ x: pick.x, y: pick.h + (rng() > 0.55 ? (6 + rng() * 10) : 2.5), z: pick.z });
        }

        for (let i = 0; i < (opts.soupCount || 0); i++) {
            const pick = choosePosition(rng, bounds.minX, bounds.maxX, bounds.minZ, bounds.maxZ, sampleHeight);
            if (!pick) continue;
            soups.push({ x: pick.x, y: pick.h + 1.5, z: pick.z });
        }

        for (let i = 0; i < Math.max(4, opts.walkerDensity || 6); i++) {
            const pick = choosePosition(rng, bounds.minX, bounds.maxX, bounds.minZ, bounds.maxZ, sampleHeight);
            if (!pick) continue;
            walkers.push({ x: pick.x, z: pick.z, y: pick.h + 0.7 });
        }
    }

    return {
        platforms,
        moons,
        soups,
        walkers,
        structures,
        terrainMesh: mesh,
        collision: null,
        sampleHeight,
        centerHeight,
        averageHeight,
        heightMap,
        gridSize: opts.gridSize
    };
}

function generateTropicalHub(opts, width, depth) {
    const cell = opts.gridSize || 6;
    const halfX = Math.ceil(width / cell / 2);
    const halfZ = Math.ceil(depth / cell / 2);
    const radius = Math.max(width, depth) * 0.62;
    const heightMap = {};

    for (let ix = -halfX; ix <= halfX; ix++) {
        for (let iz = -halfZ; iz <= halfZ; iz++) {
            const x = ix * cell;
            const z = iz * cell;
            const dist = Math.sqrt(x * x + z * z);
            const radial = Math.max(0, 1 - dist / radius);
            if (radial < 0.04) continue;

            const n = valueNoise(x * 0.02, z * 0.02, (opts.seed || 1) + 23);
            const h = -2 + radial * 10 + (n - 0.5) * 2;
            heightMap[`${ix},${iz}`] = h;
        }
    }

    const mesh = createTerrainMesh(heightMap, cell, width, depth);
    const sampleHeight = createHeightSampler(heightMap, cell);
    const averageHeight = averageHeightFromMap(heightMap, 0);
    const hubBase = sampleHeight(0, 0, Infinity) ?? 0;

    const rng = mulberry32(((opts.seed || 1) + 9) >>> 0);
    const platforms = [];
    const structures = [];
    const moons = [];
    const soups = [];
    const walkers = [];

    platforms.push({ x: 0, y: hubBase, z: 0, width: width * 0.3, depth: depth * 0.3, height: 1.2, color: [0.9, 0.9, 0.85] });

    const roadWidth = 8;
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dz]) => {
        const rx = dx * width * 0.2;
        const rz = dz * depth * 0.2;
        const ry = (sampleHeight(rx, rz, Infinity) ?? hubBase) + 0.1;
        platforms.push({
            x: rx,
            y: ry,
            z: rz,
            width: dx !== 0 ? roadWidth : width * 0.4,
            depth: dz !== 0 ? roadWidth : depth * 0.4,
            height: 1,
            color: [0.7, 0.7, 0.7]
        });
    });

    const kingdomKeys = Object.keys(kingdomConfigs).filter((k) => k !== 'hub');
    const entranceAngles = kingdomKeys.map((_, i) => (i / kingdomKeys.length) * Math.PI * 2);

    kingdomKeys.forEach((key, i) => {
        const ang = entranceAngles[i];
        const ex = Math.cos(ang) * (width * 0.15);
        const ez = Math.sin(ang) * (depth * 0.15);
        const ey = (sampleHeight(ex, ez, Infinity) ?? hubBase) + 0.5;
        structures.push({
            type: 'entrance',
            x: ex,
            y: ey,
            z: ez,
            width: 4,
            height: 4,
            depth: 2,
            color: [1, 0.5, 0],
            target: key
        });
    });

    for (let i = 0; i < 60; i++) {
        const angle = entranceAngles[Math.floor(rng() * entranceAngles.length)] || 0;
        const x = Math.cos(angle) * width * 0.2 + (rng() - 0.5) * 20;
        const z = Math.sin(angle) * depth * 0.2 + (rng() - 0.5) * 20;
        const baseY = sampleHeight(x, z, Infinity) ?? hubBase;
        moons.push({ x, y: baseY + 2 + Math.floor(rng() * 4) * 3, z });
    }

    for (let i = 0; i < 6; i++) {
        const x = (rng() * 2 - 1) * width * 0.3;
        const z = (rng() * 2 - 1) * depth * 0.3;
        const y = (sampleHeight(x, z, Infinity) ?? hubBase) + 1;
        walkers.push({ x, z, y });
    }

    return {
        platforms,
        moons,
        soups,
        walkers,
        structures,
        terrainMesh: mesh,
        collision: null,
        sampleHeight,
        centerHeight: hubBase,
        averageHeight,
        heightMap,
        gridSize: cell
    };
}
