import { game, kingdomConfigs, vector } from './globals.js';
import { Walker } from './entities.js';
import { playTrack, getmusicfiles, getKingdomtrack } from './audio.js';
import { Boss, PowerMoon, PowerSoup, Platform } from './characters.js';
import { showMessage, updateHUD } from './ui.js';
import { player } from './player.js';
import { createPyramidInterior } from './structures.js';

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

export async function loadKingdom(kingdomKey) {
        const kingdom = kingdomConfigs[kingdomKey] || {};
        game.currentKingdom = kingdomKey;
        game.collectibles = [];
        game.platforms = [];
        game.moons = 0;

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

        game.terrainMesh = null;
        game.heightMap = null;
        game.terrainCollision = null;
        game.sampleTerrainHeight = null;
        game.gridSize = Number(levelJson?.config?.gridSize || kingdom.gridSize || 4);
        game.structures = parsed.structures;

        parsed.platforms
            .map(p => new Platform(p.x, p.y, p.z, p.width, p.height, p.depth, p.color))
            .forEach(p => game.platforms.push(p));

        game.collectibles = parsed.moons.map(m => new PowerMoon(m.x, m.y, m.z));
        game.totalMoons = parsed.moons.length;

        game.powerSoups = parsed.soups.map(s => new PowerSoup(s.x, s.y, s.z));
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
            game.platforms.push(new Platform(0, h/2, w/2 - t/2, w, h, t, wallColor));
            game.platforms.push(new Platform(0, h/2, -w/2 + t/2, w, h, t, wallColor));
            // left/right
            game.platforms.push(new Platform(w/2 - t/2, h/2, 0, t, h, w, wallColor));
            game.platforms.push(new Platform(-w/2 + t/2, h/2, 0, t, h, w, wallColor));

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
            new Platform(p.x, p.y, p.z, p.width, p.height, p.depth, p.color || [0.8, 0.7, 0.5])
        );
        game.collectibles = interior.moons.map(m => new PowerMoon(m.x, m.y, m.z));
        game.walkers = [];
        game.powerSoups = [];
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
        game.savedMainWorld = null;
        
        showMessage('Exited Pyramid', '#FFD700');
        updateHUD(game, kingdomConfigs, player);
    }
