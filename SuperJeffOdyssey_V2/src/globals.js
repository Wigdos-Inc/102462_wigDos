import EngineModule from './libs/jeffsgine.js';
import { renderOnce, getTextureData } from "./libs/engine/texgen.js";

export let engine = null;
export let vector = null;
export let texBuffer = null;
export let collision = null;

export const BOX = 0;
export const CYLINDER = 1;
export const TRIANGLE = 2;

async function loadEngine() {
    const Module = await EngineModule();
    console.log(Module);
    engine = new Module.Engine;
    vector = new Module.Vector;
    texBuffer = new Module.TexBuffer;
    collision = new Module.Collision;

    renderOnce(128, 128, 1, 1484.72, 12.0, 8.0, 5, 0.5, 0.2, 1.4);
    const texture = getTextureData();
    for (let i = 0; i < texture.length; i++) {
        texBuffer.push_back(texture[i][0]);
        texBuffer.push_back(texture[i][1]);
        texBuffer.push_back(texture[i][2]);
        texBuffer.push_back(texture[i][3]);
    }
    texBuffer = {width: 128, height: 128, pixels: texBuffer};

    engine.engineInit();
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
    bWasPressed: false
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
        groundColor: [0.4, 0.1, 0.1],
        platformColor: [0.6, 0.1, 0.1]
    }
}; 
