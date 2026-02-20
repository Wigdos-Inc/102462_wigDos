import { createTerrainMesh, detectCliffs, createIslands } from './terrainMesh.js';
import { generateCapStructures, generateCascadeStructures, generateSandStructures } from './structures.js';

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
    baseHeight: 0, heightScale: 15, detailScale: 0.025, persistence: 0.5,
    lacunarity: 2.0, octaves: 5, gridSize: 4, walkerDensity: 6, 
    soupCount: 1, moons: 20, cliffThreshold: 6, platformCount: 15,
    islandThreshold: 0.65, createIslandAreas: true
};

export function generateLevelLayout(config = {}) {
    const opts = { ...defaultOptions, ...config };
    const width = (opts.size && opts.size.x) || opts.size || 140;
    const depth = (opts.size && opts.size.z) || opts.size || 140;
    const platforms = [];
    const rng = mulberry32(((opts.seed || 1) + 73) >>> 0);
    const randomInRange = (min, max) => min + rng() * (max - min);
    const noiseSeed = ((opts.seed || 1) * 47) | 0;
    const gridSize = opts.gridSize || 4;
    const halfX = Math.ceil(width / gridSize / 2);
    const halfZ = Math.ceil(depth / gridSize / 2);
    const heightMap = {};
    let heightSum = 0, count = 0;
    
    const noiseFn = (x, z) => layeredNoise(x, z, noiseSeed, opts);
    
    // Build heightmap with island support
    for (let ix = -halfX; ix <= halfX; ix++) {
        for (let iz = -halfZ; iz <= halfZ; iz++) {
            const x = ix * gridSize, z = iz * gridSize;
            const dist = Math.sqrt(x * x + z * z);
            if (dist > width * 0.55) continue;
            
            let noiseVal = noiseFn(x * opts.detailScale, z * opts.detailScale);
            const radialFade = Math.max(0, 1 - (dist / (width * 0.5)));
            
            // Island creation - elevate certain areas
            if (opts.createIslandAreas) {
                const islandNoise = noiseFn(x * 0.015, z * 0.015);
                if (islandNoise > opts.islandThreshold) {
                    noiseVal += 0.3 * (islandNoise - opts.islandThreshold);
                }
            }
            
            const height = opts.baseHeight + (noiseVal - 0.3) * opts.heightScale * radialFade;
            heightMap[`${ix},${iz}`] = height;
            heightSum += height;
            count++;
        }
    }
    
    const averageHeight = count > 0 ? heightSum / count : opts.baseHeight;
    const terrainMesh = createTerrainMesh(heightMap, gridSize, width, depth);
    const cliffs = detectCliffs(heightMap, gridSize, opts.cliffThreshold);
    const islands = createIslands(heightMap, gridSize, opts.islandThreshold, noiseFn);
    
    const getHeight = (x, z) => {
        const ix = Math.round(x / gridSize), iz = Math.round(z / gridSize);
        return heightMap[`${ix},${iz}`] ?? opts.baseHeight;
    };
    
    // Add floating platforms
    const spreadX = width * 0.4, spreadZ = depth * 0.4;
    for (let i = 0; i < (opts.platformCount || 15); i++) {
        const x = randomInRange(-spreadX, spreadX);
        const z = randomInRange(-spreadZ, spreadZ);
        const groundH = getHeight(x, z);
        platforms.push({
            x, y: groundH + randomInRange(5, 12), z,
            width: randomInRange(6, 12), depth: randomInRange(6, 12), height: 0.8,
            color: opts.platformColor || [0.5, 0.6, 0.7]
        });
    }
    
    // Generate themed structures
    let structures = [];
    if (opts.kingdom === 'cap') structures = generateCapStructures(rng, width, depth);
    else if (opts.kingdom === 'cascade') structures = generateCascadeStructures(rng, width, depth);
    else if (opts.kingdom === 'sand') structures = generateSandStructures(rng, width, depth);
    
    // Place moons, soups, walkers
    const moons = [], soups = [], walkers = [];
    for (let i = 0; i < (opts.moons || 0); i++) {
        const x = randomInRange(-spreadX, spreadX), z = randomInRange(-spreadZ, spreadZ);
        moons.push({ x, y: getHeight(x, z) + (rng() > 0.5 ? randomInRange(6, 14) : 2), z });
    }
    for (let i = 0; i < (opts.soupCount || 0); i++) {
        const x = randomInRange(-spreadX, spreadX), z = randomInRange(-spreadZ, spreadZ);
        soups.push({ x, y: getHeight(x, z) + 1.5, z });
    }
    for (let i = 0; i < Math.max(4, opts.walkerDensity || 6); i++) {
        const x = randomInRange(-spreadX, spreadX), z = randomInRange(-spreadZ, spreadZ);
        walkers.push({ x, z, y: getHeight(x, z) + 0.7 });
    }
    
    return { 
        platforms, moons, soups, walkers, structures, terrainMesh, cliffs, islands,
        centerHeight: getHeight(0, 0), averageHeight, heightMap, gridSize
    };
}
