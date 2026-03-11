import { uploadTerrainMesh } from './libs/engine/engine.js';
import { game, kingdomConfigs, vector } from './globals.js';
import { generateLevelLayout } from './libs/engine/terrainGenerator.js';
import { Walker } from './entities.js';
import { playTrack, getmusicfiles, getKingdomtrack } from './audio.js';
import { Boss, PowerMoon, PowerSoup, Platform } from './characters.js';
import { showMessage, updateHUD } from './ui.js';
import { player } from './player.js';

export async function loadKingdom(kingdomKey) {
        const kingdom = kingdomConfigs[kingdomKey] || {};
        game.currentKingdom = kingdomKey;
        game.collectibles = [];
        game.platforms = [];
        game.moons = 0;

        // Try loading external level JSON; fall back to baked config
        let levelJson = null;
        try {
            const res = await fetch(`../levels/${kingdomKey}.jsony?ts=${Date.now()}`);
            if (res.ok) {
                levelJson = await res.json();
            }
        } catch (err) {
            console.warn('Level JSON load failed, using defaults', err);
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

        const mergedConfig = { ...kingdom, ...(levelJson?.config || {}) };
        const terrain = generateLevelLayout({ ...mergedConfig, objects: levelJson?.objects, fromLevelFile: !!levelJson });

        // Store terrain mesh data
        game.terrainMesh = terrain.terrainMesh;
        game.structures = terrain.structures || [];
        game.heightMap = terrain.heightMap;
        game.terrainCollision = terrain.collision;
        game.sampleTerrainHeight = terrain.sampleHeight;
        game.gridSize = terrain.gridSize;
        
        // Pass terrain mesh data to engine for buffering; the engine takes care of
        // creating and updating its own GL resources.
        if (game.terrainMesh && game.terrainMesh.vertices) {
            uploadTerrainMesh(game.terrainMesh);
        }

        // Only add floating platforms (not the ground grid tiles)
        terrain.platforms.map(p => new Platform(p.x, p.y, p.z, p.width, p.height, p.depth, p.color)).forEach(p => game.platforms.push(p));

        game.collectibles = terrain.moons.map(m => new PowerMoon(m.x, m.y, m.z));
        game.totalMoons = terrain.moons.length;

        const soups = terrain.soups || [];
        game.powerSoups = soups.map(s => new PowerSoup(s.x, s.y, s.z));

        const walkers = terrain.walkers || [];
        game.walkers = walkers.map(p => new Walker(p.x, p.z, p.y));
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

        const centerHeight = terrain.centerHeight ?? kingdom.baseHeight;
        const spawnHeight = Math.max(centerHeight + 4, kingdom.baseHeight + 5, player.radius + 1);
        player.pos = vector.create(0, spawnHeight, 12);
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
