import { game, kingdomConfigs, vector } from './globals.js';
import { Walker } from './entities.js';
import { playTrack, getmusicfiles, getKingdomtrack } from './audio.js';
import { Boss, PowerMoon, PowerSoup, Platform } from './characters.js';
import { showMessage, updateHUD } from './ui.js';
import { player } from './player.js';
import { createPyramidInterior } from './structures.js';

const DETAIL_COLOR = {
    cap: [0.56, 0.7, 0.9],
    cascade: [0.44, 0.66, 0.5],
    sand: [0.92, 0.84, 0.62],
    hub: [0.75, 0.77, 0.72],
    boss: [0.68, 0.28, 0.28]
};

function mulberry32(seed) {
    let t = seed >>> 0;
    return function rand() {
        t += 0x6D2B79F5;
        let r = Math.imul(t ^ t >>> 15, 1 | t);
        r ^= r + Math.imul(r ^ r >>> 7, 61 | r);
        return ((r ^ r >>> 14) >>> 0) / 4294967296;
    };
}

function enrichLevelContent(kingdomKey, levelData, parsed) {
    const cfg = levelData?.config || {};
    const sizeX = Number(cfg?.size?.x || 160);
    const sizeZ = Number(cfg?.size?.z || 160);
    const ringCount = kingdomKey === 'hub' ? 18 : (kingdomKey === 'boss' ? 10 : 14);
    const baseY = kingdomKey === 'boss' ? 4 : 2.4;
    const tex = Array.isArray(cfg.detailTextures)
        ? cfg.detailTextures.filter(t => typeof t === 'string' && t.length > 0)
        : [];
    const col = DETAIL_COLOR[kingdomKey] || DETAIL_COLOR.cap;
    const idSeed = kingdomKey.split('').reduce((n, ch) => n + ch.charCodeAt(0), 0);
    const seed = ((Number(cfg.seed) || 0) + idSeed + ringCount * 17) >>> 0;
    const rand = mulberry32(seed || 1337);
    const limitR = Math.min(sizeX, sizeZ) * 0.45;

    for (let i = 0; i < ringCount; i++) {
        const t = i / ringCount;
        const ang = t * Math.PI * 2 + rand() * 0.35;
        const r = Math.min(limitR, (sizeX * 0.14) + t * (sizeX * 0.28) + rand() * 5);
        const px = Math.cos(ang) * r;
        const pz = Math.sin(ang) * r;
        const w = 5 + rand() * 5;
        const d = 5 + rand() * 5;
        const h = 0.8 + rand() * 0.6;
        const y = baseY + (i % 4) * 1.8 + rand() * 0.6;

        parsed.platforms.push({
            x: px,
            y,
            z: pz,
            width: w,
            height: h,
            depth: d,
            color: [col[0], col[1], col[2]],
            texture: tex.length > 0 ? tex[i % tex.length] : null
        });

        if (i % 5 === 0) parsed.moons.push({ x: px, y: y + 2.3, z: pz });
        if (i % 6 === 0) parsed.walkers.push({ x: px + 1.5, y: y + 1, z: pz - 1.5 });
        if (i % 9 === 0) parsed.soups.push({ x: px - 1.2, y: y + 1.4, z: pz + 1.2 });
    }
}

function createFallbackLevel(kingdomKey, kingdom) {
    const sizeX = kingdom.size?.x || 120;
    const sizeZ = kingdom.size?.z || 120;
    return {
        name: kingdom.name || kingdomKey,
        spawn: { x: 0, y: 5, z: 10 },
        objects: [
            {
                type: 'platform',
                x: 0,
                y: 0,
                z: 0,
                width: sizeX,
                depth: sizeZ,
                height: 2,
                texture: null,
                color: kingdom.platformColor || [0.5, 0.6, 0.7]
            }
        ]
    };
}

function parseLevelObjects(levelData) {
    const objects = Array.isArray(levelData?.objects) ? levelData.objects : [];
    const platforms = [];
    const moons = [];
    const soups = [];
    const walkers = [];
    const structures = [];

    for (const obj of objects) {
        if (!obj || typeof obj !== 'object') continue;
        const type = obj.type;
        const x = Number(obj.x) || 0;
        const y = Number(obj.y) || 0;
        const z = Number(obj.z) || 0;

        if (type === 'platform') {
            platforms.push({
                x,
                y,
                z,
                width: Number(obj.width) || 8,
                height: Number(obj.height) || 1,
                depth: Number(obj.depth) || 8,
                texture: typeof obj.texture === 'string' ? obj.texture : null,
                color: obj.color || [0.5, 0.6, 0.7]
            });
        } else if (type === 'moon') {
            moons.push({ x, y, z });
        } else if (type === 'soup') {
            soups.push({ x, y, z });
        } else if (type === 'walker') {
            walkers.push({ x, y, z });
        } else {
            structures.push({ ...obj, x, y, z });
        }
    }

    return { platforms, moons, soups, walkers, structures };
}

export async function loadKingdom(kingdomKey, options = {}) {
    const forceLoad = !!(options && options.force);
    if (kingdomKey === 'boss' && !game.bossUnlocked && !forceLoad) {
        showMessage('Boss gate is locked. Clear the main kingdoms first.', '#FF5555');
        return;
    }

        const kingdom = kingdomConfigs[kingdomKey] || {};
        game.currentKingdom = kingdomKey;
        game.collectibles = [];
        game.platforms = [];
        game.moons = 0;
    game.kingdomCompletionTriggered = false;

        let levelJson = null;
        try {
            const res = await fetch(`../levels/${kingdomKey}.json?ts=${Date.now()}`);
            if (res.ok) {
                levelJson = await res.json();
            }
        } catch (err) {
            console.warn('Level JSON load failed, using fallback level', err);
        }

        if (!levelJson) {
            levelJson = createFallbackLevel(kingdomKey, kingdom);
        }

        const displayName = levelJson?.name || kingdom.name || kingdomKey;

        // switch music to kingdom theme unless pause/credits
        if (!game.paused && !game.creditsShown) {
            const kingdomTrack = getKingdomtrack();
            const trackName = kingdomTrack[kingdomKey];
            if (trackName) {
                const musicFiles = getmusicfiles();
                const idx = musicFiles.indexOf(trackName);
                if (idx !== -1) playTrack(idx);
            }
        }

        // Show kingdom name
        const nameEl = document.getElementById('kingdom-name');
        nameEl.textContent = displayName;
        nameEl.style.animation = 'none';
        setTimeout(() => nameEl.style.animation = 'fadeOut 3s forwards', 10);
        if (kingdomKey === 'boss') {
            showMessage('Defeat Peanutman and his robot!', '#FF4500');
        }
        if (kingdomKey === 'hub') {
            showMessage('Welcome to the Hub! Walk into orange arches to visit kingdoms.', '#00CED1');
        }

        const parsed = parseLevelObjects(levelJson);
        enrichLevelContent(kingdomKey, levelJson, parsed);

        game.terrainMesh = null;
        game.heightMap = null;
        game.terrainCollision = null;
        game.sampleTerrainHeight = null;
        game.gridSize = Number(levelJson?.config?.gridSize || kingdom.gridSize || 4);
        game.structures = parsed.structures;

        parsed.platforms
            .map(p => new Platform(p.x, p.y, p.z, p.width, p.height, p.depth, p.color, p.texture))
            .forEach(p => game.platforms.push(p));

        game.collectibles = parsed.moons.map(m => new PowerMoon(m.x, m.y, m.z));
        game.totalMoons = parsed.moons.length;

        game.powerSoups = parsed.soups.map(s => new PowerSoup(s.x, s.y, s.z));
        game.totalSoups = game.powerSoups.length;
        game.soupsCollected = 0;
        game.miniBoss = null;
        game.miniBossThemePlaying = false;
        game._miniBossHitCooldown = 0;
        game.walkers = parsed.walkers.map(w => new Walker(w.x, w.z, w.y));
        if (kingdomKey === 'boss') {
            // remove random walkers, boss arena shouldn't have them
            game.walkers = [];
            // boss arena special setup
            // create boundary walls so the player can't leave easily
            const w = kingdom.size.x || 120;
            const h = 8;
            const t = 2;
            const wallColor = [0.5,0,0];
            // front/back
            game.platforms.push(new Platform(0, h/2, w/2 - t/2, w, h, t, wallColor, 'brick'));
            game.platforms.push(new Platform(0, h/2, -w/2 + t/2, w, h, t, wallColor, 'brick'));
            // left/right
            game.platforms.push(new Platform(w/2 - t/2, h/2, 0, t, h, w, wallColor, 'brick'));
            game.platforms.push(new Platform(-w/2 + t/2, h/2, 0, t, h, w, wallColor, 'brick'));

            game.boss = new Boss();
            // position peanutmobile relative to the player's facing direction
            const dir = player.facingDir || vector.create(0,0,1);
            const ang = Math.atan2(dir.z, dir.x);
            game.boss.peanutAngle = ang;
        } else {
            game.boss = null;
        }

        const spawn = levelJson?.spawn || { x: 0, y: Math.max((kingdom.baseHeight || 0) + 5, player.radius + 1), z: 12 };
        player.pos = vector.create(spawn.x || 0, Math.max(spawn.y || 0, player.radius + 1), spawn.z || 12);
        player.vel = vector.create(0, 0, 0);
        player.onGround = false;
        player.state = 'idle';

        updateHUD(game, kingdomConfigs, player);
    }

export function enterPyramid() {
        // Save main world state
        game.savedMainWorld = {
            platforms: game.platforms,
            collectibles: game.collectibles,
            walkers: game.walkers,
            powerSoups: game.powerSoups,
            totalSoups: game.totalSoups,
            soupsCollected: game.soupsCollected,
            miniBoss: game.miniBoss,
            miniBossThemePlaying: game.miniBossThemePlaying,
            structures: game.structures,
            terrainMesh: game.terrainMesh,
            heightMap: game.heightMap,
            terrainCollision: game.terrainCollision,
            sampleTerrainHeight: game.sampleTerrainHeight,
            playerPos: { ...player.pos }
        };
        
        // Generate pyramid interior
        const interior = createPyramidInterior();
        
        // Clear main world entities
        game.platforms = interior.platforms.map(p => 
            new Platform(p.x, p.y, p.z, p.width, p.height, p.depth, p.color || [0.8, 0.7, 0.5], p.texture)
        );
        game.collectibles = interior.moons.map(m => new PowerMoon(m.x, m.y, m.z));
        game.walkers = [];
        game.powerSoups = [];
        game.totalSoups = 0;
        game.soupsCollected = 0;
        game.miniBoss = null;
        game.miniBossThemePlaying = false;
        game._miniBossHitCooldown = 0;
        game.structures = [];
        game.terrainMesh = null;
        game.heightMap = null;
        game.terrainCollision = null;
        game.sampleTerrainHeight = null;
        
        // Set player to spawn point
        const spawn = interior.spawnPoint || { x: 0, y: 2, z: 15 };
        player.pos = vector.create(spawn.x, spawn.y, spawn.z);
        player.vel = vector.create(0, 0, 0);
        player.onGround = false;
        
        game.insidePyramid = true;
        game.totalMoons = interior.moons.length;
        showMessage('Inside Pyramid - Press E to exit', '#FFD700');
        updateHUD(game, kingdomConfigs, player);
    }
    
export function exitPyramid() {
        if (!game.savedMainWorld) return;
        
        // Restore main world
        game.platforms = game.savedMainWorld.platforms;
        game.collectibles = game.savedMainWorld.collectibles;
        game.walkers = game.savedMainWorld.walkers;
        game.powerSoups = game.savedMainWorld.powerSoups;
        game.totalSoups = game.savedMainWorld.totalSoups || 0;
        game.soupsCollected = game.savedMainWorld.soupsCollected || 0;
        game.miniBoss = game.savedMainWorld.miniBoss || null;
        game.miniBossThemePlaying = !!game.savedMainWorld.miniBossThemePlaying;
        game.structures = game.savedMainWorld.structures;
        game.terrainMesh = game.savedMainWorld.terrainMesh;
        game.heightMap = game.savedMainWorld.heightMap;
        game.terrainCollision = game.savedMainWorld.terrainCollision;
        game.sampleTerrainHeight = game.savedMainWorld.sampleTerrainHeight;
        
        // Restore player position
        player.pos = vector.create(
            game.savedMainWorld.playerPos.x,
            game.savedMainWorld.playerPos.y,
            game.savedMainWorld.playerPos.z
        );
        player.vel = vector.create(0, 0, 0);
        player.onGround = false;
        
        game.insidePyramid = false;
        game.totalMoons = game.collectibles.length;
        game._miniBossHitCooldown = 0;
        game.savedMainWorld = null;
        
        showMessage('Exited Pyramid', '#FFD700');
        updateHUD(game, kingdomConfigs, player);
    }
