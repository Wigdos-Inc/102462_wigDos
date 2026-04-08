import EngineModule from './libs/jeffsgine.js';
import { renderOnce, getTextureData } from "./libs/engine/texgen.js";

export let engine = null;
export let vector = null;
export let texBuffer = null;
export let textureBuffers = null;
export let collision = null;

export const BOX = 0;
export const CYLINDER = 1;
export const TRIANGLE = 2;

const TEX_PRESETS = {
    default: [1, 1484.72, 12.0, 8.0, 5, 0.5, 0.2, 1.4],
    grass: [1, 1091.4, 10.8, 8.6, 5, 0.54, 0.08, 1.25],
    dirt: [2, 2873.2, 11.6, 8.2, 5, 0.54, 0.03, 1.18],
    pebble: [3, 612.0, 10.3, 8.0, 5, 0.56, -0.04, 1.26],
    stone: [4, 1733.5, 13.0, 7.2, 6, 0.58, 0.0, 1.32],
    brick: [5, 2211.0, 9.6, 8.1, 5, 0.52, -0.02, 1.3],
    tile: [6, 943.0, 8.2, 8.2, 5, 0.56, 0.06, 1.2],
    wood: [7, 704.0, 9.1, 7.2, 5, 0.56, 0.02, 1.2],
    cloth: [8, 141.0, 9.0, 10.2, 5, 0.5, 0.03, 1.24]
};

function buildTexturePixels(Module, spec) {
    const width = 512;
    const height = 512;
    const pixels = new Module.TexBuffer;
    renderOnce(width, height, spec[0], spec[1], spec[2], spec[3], spec[4], spec[5], spec[6], spec[7]);
    const texture = getTextureData();
    for (let i = 0; i < texture.length; i++) {
        const px = texture[i];
        pixels.push_back(px[0]);
        pixels.push_back(px[1]);
        pixels.push_back(px[2]);
        pixels.push_back(px[3]);
    }
    return { width: width, height: height, pixels };
}

function createEngineTexture(id, rawTexture) {
    if (!engine || typeof engine.createTexture !== 'function') {
        return rawTexture;
    }
    return engine.createTexture({
        id,
        width: rawTexture.width,
        height: rawTexture.height,
        pixels: rawTexture.pixels
    });
}

export function getTextureBuffer(key) {
    if (!textureBuffers) return texBuffer;
    return textureBuffers[key] || texBuffer;
}

async function loadEngine() {
    const Module = await EngineModule();
    console.log(Module);
    engine = new Module.Engine;
    vector = new Module.Vector;
    collision = new Module.Collision;

    engine.engineInit();

    textureBuffers = {};
    const names = Object.keys(TEX_PRESETS);
    for (let i = 0; i < names.length; i++) {
        const name = names[i];
        const rawTexture = buildTexturePixels(Module, TEX_PRESETS[name]);
        textureBuffers[name] = createEngineTexture(i, rawTexture);
    }

    texBuffer = textureBuffers.default;
}
await loadEngine();

export const game = {
    currentKingdom: 'cap',
    moons: 0,
    totalMoons: 0,
    collectibles: [],
    platforms: [],
    keys: {},
    camera: { x: 0, y: 15, z: 30, pitch: -0.3, yaw: 0, distance: 20, zoom: 1.0 },
    lastTime: 0,
    spaceWasPressed: false,
    shiftWasPressed: false,
    qWasPressed: false,
    eWasPressed: false,
    fWasPressed: false, // ADD for hair throw
    useGalaxyGravity: false, // Mario Odyssey uses standard gravity
    walkers: [],
    terrainCollision: null,
    sampleTerrainHeight: null,
    rWasPressed: false,
    // music/player state values
    moonsCollectedTotal: 0,
    overallMoons: 0,
    creditsShown: false,
    paused: false,
    pWasPressed: false,
    bWasPressed: false,
    bossUnlocked: false,
    completedKingdoms: {},
    kingdomCompletionTriggered: false,
    totalSoups: 0,
    soupsCollected: 0,
    miniBoss: null,
    completedMiniBosses: {},
    miniBossThemePlaying: false,
    playerMaxHealth: 3,
    playerHealth: 3,
    playerInvuln: 0,
    gameOverActive: false,
    gameOverTimer: 0,
    gameOverOverlayShown: false,
    gameOverRedirectDone: false
};

// Kingdom configurations (smooth terrain like Mario 64/Sunshine)
export const kingdomConfigs = {
    cap: {
        name: 'Cap Kingdom',
        kingdom: 'cap',
        color: [0.8, 0.8, 0.9],
        baseHeight: 0,
        size: { x: 150, z: 150 },
        moons: 22,
        seed: 1031,
        heightScale: 18,
        detailScale: 0.025,
        persistence: 0.52,
        lacunarity: 2.1,
        octaves: 5,
        gridSize: 4,
        platformCount: 12,
        walkerDensity: 7,
        soupCount: 2,
        platformTexture: 'cloth',
        groundColor: [0.35, 0.5, 0.75],
        platformColor: [0.5, 0.65, 0.85]
    },
    cascade: {
        name: 'Cascade Kingdom',
        kingdom: 'cascade',
        color: [0.6, 0.7, 0.5],
        baseHeight: 2,
        size: { x: 140, z: 140 },
        moons: 24,
        seed: 2645,
        heightScale: 22,
        detailScale: 0.028,
        persistence: 0.48,
        lacunarity: 2.2,
        octaves: 6,
        gridSize: 4,
        platformCount: 14,
        walkerDensity: 8,
        soupCount: 2,
        platformTexture: 'stone',
        groundColor: [0.3, 0.6, 0.45],
        platformColor: [0.4, 0.7, 0.6]
    },
    sand: {
        name: 'Sand Kingdom',
        kingdom: 'sand',
        color: [0.9, 0.85, 0.6],
        baseHeight: 1,
        size: { x: 160, z: 160 },
        moons: 26,
        seed: 987654,
        heightScale: 16,
        detailScale: 0.032,
        persistence: 0.55,
        lacunarity: 2.0,
        octaves: 5,
        gridSize: 4,
        platformCount: 16,
        walkerDensity: 6,
        soupCount: 1,
        platformTexture: 'dirt',
        groundColor: [0.85, 0.7, 0.5],
        platformColor: [0.9, 0.8, 0.6]
    },
    hub: {
        name: 'Tropical Hub',
        kingdom: 'hub',
        color: [0.7, 0.9, 0.8],
        baseHeight: 0,
        size: { x: 200, z: 200 },
        moons: 60,
        seed: 13579,
        heightScale: 0,
        detailScale: 0,
        persistence: 0,
        lacunarity: 1,
        octaves: 1,
        gridSize: 4,
        platformCount: 0,
        walkerDensity: 0,
        soupCount: 0,
        platformTexture: 'tile',
        groundColor: [0.5, 0.7, 0.4],
        platformColor: [0.7, 0.6, 0.4]
    },
    boss: {
        name: 'Boss Arena',
        kingdom: 'boss',
        color: [0.6, 0.1, 0.1],
        baseHeight: 0,
        size: { x: 120, z: 120 },
        moons: 0,
        seed: 42,
        heightScale: 0,
        detailScale: 0,
        persistence: 0,
        lacunarity: 1,
        octaves: 1,
        gridSize: 4,
        platformCount: 0,
        walkerDensity: 0,
        soupCount: 0,
        platformTexture: 'brick',
        groundColor: [0.4, 0.1, 0.1],
        platformColor: [0.6, 0.1, 0.1]
    }
}; 
