import { vec3 } from './vec3.js';
import { createPerspectiveMatrix, createLookAtMatrix, multiplyMatrices, createTranslationMatrix, createScaleMatrix, createOrthographicMatrix, createRotationZ, createRotationY, createRotationX } from './matrix.js';
import { createSphere, createCube } from './geometry.js';
import { Walker } from './entities.js';
import { createShaderProgram, createPostProcessProgram, createShadowProgram } from './shader.js';
import { createPlayer, drawJeff } from './player.js';
import { generateLevelLayout } from './terrainGenerator.js';
import { createPyramidInterior } from './structures.js';
import { initInput } from './inputs.js';

(function() {
    'use strict';

    const canvas = document.getElementById('gameCanvas');
    const gl = canvas.getContext('webgl');
    
    if (!gl) {
        alert('WebGL not supported!');
        return;
    }

    // we need the depth texture extension for shadow maps
    const depthExt = gl.getExtension('WEBGL_depth_texture') || gl.getExtension('WEBKIT_WEBGL_depth_texture');
    if (!depthExt) {
        console.warn('Depth texture extension not available; RTX shadows will be disabled');
    }

    const game = {
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
        rWasPressed: false,
        // music/player state values
        musicIndex: 0,
        moonsCollectedTotal: 0,
        overallMoons: 0,
        creditsShown: false,
        paused: false,
        pWasPressed: false,
        bWasPressed: false
    };

    // initialize input handling (keyboard + touch)
    initInput(game);

    // RTX mode toggle
    game.rtxMode = false;

    // ----- audio / music player setup -----
    const musicFiles = [
        'superGalaxyJeffTheme_1.mp3',
        'superGalaxyJeffTheme_2.mp3',
        'JeffOddeseyTheme2.mp3',
        'JeffOddeseyTheme.mp3',
        'themesong_old.mp3',
        'themesong.mp3',
        'themesong (1).mp3',
        "jeff's song (1).mp3",
        "jeff's song.mp3",
        "jeff's song (2).mp3",
        "jeff's song2.mp3",
        "jeff's song (5).mp3",
        "jeff's song (4).mp3",
        "jeff's song (3).mp3",
        "penutfacefinalfury2.mp3",
        "penutfacefinalfury.mp3",
        "PenutFace's fury (1).mp3",
        "PenutFace's fury.mp3",
        "bonustheme.mp3",
        "bonustheme2.mp3"
    ];

    const creditTrackName = "jeff's song (5).mp3";
    const musicBasePath = '../assets/sound/';

    const pauseTrackName = "themesong.mp3";
    const powerupTrackName = "jeff's song (2).mp3";
    const kingdomTrack = {
        cap: "jeff's song.mp3",
        cascade: "jeff's song (4).mp3",
        sand: "bonustheme.mp3",
        boss: "PenutFace's fury.mp3",
        final_boss: "penutfacefinalfury.mp3",
        bonus: "bonustheme2.mp3"
    };

    const audio = new Audio();
    audio.volume = 0.6;
    let musicStarted = false;
    let prePowerTrack;
    let prevMusicForPause;

    function playTrack(idx) {
        if (idx < 0 || idx >= musicFiles.length) return;
        game.musicIndex = idx;
        audio.loop = false;
        audio.src = musicBasePath + encodeURIComponent(musicFiles[idx]);
        audio.play().catch(() => {});
    }

    // play a short audio effect; stops after `duration` seconds (default 2)
    function playEffect(name, duration = 2) {
        const eff = new Audio(musicBasePath + encodeURIComponent(name));
        eff.volume = 0.7;
        eff.play().catch(() => {});
        if (duration > 0) {
            setTimeout(() => {
                eff.pause();
                // rewind in case reused
                eff.currentTime = 0;
            }, duration * 1000);
        }
        return eff;
    }

    function playRandomBackground() {
        if (game.creditsShown) return;
        const candidates = musicFiles.map((f,i) => i).filter(i => musicFiles[i] !== creditTrackName);
        const idx = candidates[Math.floor(Math.random() * candidates.length)];
        playTrack(idx);
    }

    document.addEventListener('click', () => {
        if (!musicStarted) {
            if (!audio.src) playRandomBackground();
            audio.play().catch(() => {});
            musicStarted = true;
        }
    }, { once: true });

    audio.addEventListener('ended', () => {
        if (musicFiles[game.musicIndex] === creditTrackName) {
            audio.loop = false;
        } else {
            playRandomBackground();
        }
    });
    
    function loadKingdom(kingdomKey) {
        const kingdom = kingdomConfigs[kingdomKey];
        game.currentKingdom = kingdomKey;
        game.collectibles = [];
        game.platforms = [];
        game.moons = 0;

        // switch music to kingdom theme unless pause/credits
        if (!game.paused && !game.creditsShown) {
            const trackName = kingdomTrack[kingdomKey];
            if (trackName) {
                const idx = musicFiles.indexOf(trackName);
                if (idx !== -1) playTrack(idx);
            }
        }

        // Show kingdom name
        const nameEl = document.getElementById('kingdom-name');
        nameEl.textContent = kingdom.name;
        nameEl.style.animation = 'none';
        setTimeout(() => nameEl.style.animation = 'fadeOut 3s forwards', 10);
        if (kingdomKey === 'boss') {
            showMessage('Defeat Peanutman and his robot!', '#FF4500');
        }

        const terrain = generateLevelLayout(kingdom);

        // Store terrain mesh data
        game.terrainMesh = terrain.terrainMesh;
        game.structures = terrain.structures || [];
        game.heightMap = terrain.heightMap;
        game.gridSize = terrain.gridSize;
        
        // Create WebGL buffers for terrain mesh if available
        if (game.terrainMesh && game.terrainMesh.vertices) {
            if (!game.terrainBuffers) game.terrainBuffers = {};
            
            // Position buffer
            if (!game.terrainBuffers.position) game.terrainBuffers.position = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, game.terrainBuffers.position);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(game.terrainMesh.vertices), gl.STATIC_DRAW);
            
            // Normal buffer
            if (!game.terrainBuffers.normal) game.terrainBuffers.normal = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, game.terrainBuffers.normal);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(game.terrainMesh.normals), gl.STATIC_DRAW);
            
            // Color buffer
            if (!game.terrainBuffers.color) game.terrainBuffers.color = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, game.terrainBuffers.color);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(game.terrainMesh.colors), gl.STATIC_DRAW);
            
            // Index buffer
            if (!game.terrainBuffers.index) game.terrainBuffers.index = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, game.terrainBuffers.index);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(game.terrainMesh.indices), gl.STATIC_DRAW);
            
            game.terrainIndexCount = game.terrainMesh.indices.length;
        }

        // Only add floating platforms (not the ground grid tiles)
        terrain.platforms.filter(p => p.y > terrain.averageHeight + 2).forEach(data => {
            game.platforms.push(new Platform(data.x, data.y, data.z, data.width, data.height, data.depth, data.color));
        });

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
            const dir = player.facingDir || vec3.create(0,0,1);
            const ang = Math.atan2(dir.z, dir.x);
            game.boss.peanutAngle = ang;
        } else {
            game.boss = null;
        }

        const centerHeight = terrain.centerHeight ?? kingdom.baseHeight;
        const spawnHeight = Math.max(centerHeight + 4, kingdom.baseHeight + 5, player.radius + 1);
        player.pos = vec3.create(0, spawnHeight, 12);
        player.vel = vec3.create(0, 0, 0);
        player.onGround = false;
        player.state = 'idle';

        updateHUD();
    }
    
    function enterPyramid() {
        // Save main world state
        game.savedMainWorld = {
            platforms: game.platforms,
            collectibles: game.collectibles,
            walkers: game.walkers,
            powerSoups: game.powerSoups,
            structures: game.structures,
            terrainMesh: game.terrainMesh,
            heightMap: game.heightMap,
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
        
        // Set player to spawn point
        const spawn = interior.spawnPoint || { x: 0, y: 2, z: 15 };
        player.pos = vec3.create(spawn.x, spawn.y, spawn.z);
        player.vel = vec3.create(0, 0, 0);
        player.onGround = false;
        
        game.insidePyramid = true;
        game.totalMoons = interior.moons.length;
        showMessage('Inside Pyramid - Press E to exit', '#FFD700');
        updateHUD();
    }
    
    function exitPyramid() {
        if (!game.savedMainWorld) return;
        
        // Restore main world
        game.platforms = game.savedMainWorld.platforms;
        game.collectibles = game.savedMainWorld.collectibles;
        game.walkers = game.savedMainWorld.walkers;
        game.powerSoups = game.savedMainWorld.powerSoups;
        game.structures = game.savedMainWorld.structures;
        game.terrainMesh = game.savedMainWorld.terrainMesh;
        game.heightMap = game.savedMainWorld.heightMap;
        
        // Restore player position
        player.pos = vec3.create(
            game.savedMainWorld.playerPos.x,
            game.savedMainWorld.playerPos.y,
            game.savedMainWorld.playerPos.z
        );
        player.vel = vec3.create(0, 0, 0);
        player.onGround = false;
        
        game.insidePyramid = false;
        game.totalMoons = game.collectibles.length;
        game.savedMainWorld = null;
        
        showMessage('Exited Pyramid', '#FFD700');
        updateHUD();
    }

    // play a short audio effect; stops after `duration` seconds (default 2)
    function playEffect(name, duration = 2) {
        const eff = new Audio(musicBasePath + encodeURIComponent(name));
        eff.volume = 0.7;
        eff.play().catch(() => {});
        if (duration > 0) {
            setTimeout(() => {
                eff.pause();
                // rewind in case reused
                eff.currentTime = 0;
            }, duration * 1000);
        }
        return eff;
    }

    function playRandomBackground() {
        if (game.creditsShown) return;
        const candidates = musicFiles.map((f,i) => i).filter(i => musicFiles[i] !== creditTrackName);
        const idx = candidates[Math.floor(Math.random() * candidates.length)];
        playTrack(idx);
    }

    document.addEventListener('click', () => {
        if (!musicStarted) {
            if (!audio.src) playRandomBackground();
            audio.play().catch(() => {});
            musicStarted = true;
        }
    }, { once: true });

    audio.addEventListener('ended', () => {
        if (musicFiles[game.musicIndex] === creditTrackName) {
            audio.loop = false;
        } else {
            playRandomBackground();
        }
    });

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
        // Resize post-process texture if present
        if (game.rtxFramebuffer) {
            gl.bindTexture(gl.TEXTURE_2D, game.rtxColorTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            gl.bindRenderbuffer(gl.RENDERBUFFER, game.rtxDepthBuffer);
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, canvas.width, canvas.height);
            gl.bindTexture(gl.TEXTURE_2D, null);
            gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        }
        // keep shadow map roughly square; we can just recreate at canvas size if larger
        if (game.shadowFramebuffer) {
            const size = Math.max(canvas.width, canvas.height);
            gl.bindTexture(gl.TEXTURE_2D, game.shadowTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, size, size, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);
            game.shadowSize = size;
            gl.bindTexture(gl.TEXTURE_2D, null);
        }
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const program = createShaderProgram(gl);
    gl.useProgram(program);

    // Post-process (RTX-like) program and framebuffer
    const postProgram = createPostProcessProgram(gl);
    // Fullscreen quad for post-process (-1..1)
    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
         1,  1
    ]), gl.STATIC_DRAW);

    // Setup an offscreen framebuffer for the scene color
    function createRTFramebuffer() {
        const fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        const depth = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, canvas.width, canvas.height);

        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);

        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (status !== gl.FRAMEBUFFER_COMPLETE) {
            console.warn('Incomplete framebuffer', status);
        }

        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        return { fb, tex, depth };
    }

    const rt = createRTFramebuffer();
    game.rtxFramebuffer = rt.fb;
    game.rtxColorTexture = rt.tex;
    game.rtxDepthBuffer = rt.depth;

    // create record texture procedurally
    function createRecordTexture() {
        const size = 512;
        const c = document.createElement('canvas');
        c.width = c.height = size;
        const ctx = c.getContext('2d');
        // black vinyl
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(size/2, size/2, size/2 - 2, 0, Math.PI*2);
        ctx.fill();
        // label
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(size/2, size/2, size/6, 0, Math.PI*2);
        ctx.fill();
        // grooves
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        for (let i = 0; i < 60; i++) {
            const angle = i * (Math.PI*2/60);
            const r1 = size/6 + 6;
            const r2 = size/2 - 4;
            ctx.beginPath();
            ctx.moveTo(size/2 + Math.cos(angle)*r1, size/2 + Math.sin(angle)*r1);
            ctx.lineTo(size/2 + Math.cos(angle)*r2, size/2 + Math.sin(angle)*r2);
            ctx.stroke();
        }
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
        gl.generateMipmap(gl.TEXTURE_2D);
        return tex;
    }
    game.recordTexture = createRecordTexture();

    // simple shadow map framebuffer / texture
    function createShadowFramebuffer(size) {
        const fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, size, size, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, tex, 0);

        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (status !== gl.FRAMEBUFFER_COMPLETE) {
            console.warn('Incomplete shadow framebuffer', status);
        }

        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        return { fb, tex };
    }

    let shadowProgram = null;
    const shadowSize = 1024;
    if (depthExt) {
        const sh = createShadowFramebuffer(shadowSize);
        game.shadowFramebuffer = sh.fb;
        game.shadowTexture = sh.tex;
        game.shadowSize = shadowSize;
        // compile shadow pass program
        shadowProgram = createShadowProgram(gl);
    } else {
        game.shadowFramebuffer = null;
        game.shadowTexture = null;
        game.shadowSize = 0;
    }


    const uniforms = {
        aPosition: gl.getAttribLocation(program, 'aPosition'),
        aNormal: gl.getAttribLocation(program, 'aNormal'),
        aTexCoord: gl.getAttribLocation(program, 'aTexCoord'),
        uMVP: gl.getUniformLocation(program, 'uMVP'),
        uModel: gl.getUniformLocation(program, 'uModel'),
        uColor: gl.getUniformLocation(program, 'uColor'),
        uLightPos: gl.getUniformLocation(program, 'uLightPos'),
        uShadowMatrix: gl.getUniformLocation(program, 'uShadowMatrix'),
        uShadowMap: gl.getUniformLocation(program, 'uShadowMap'),
        uUseShadows: gl.getUniformLocation(program, 'uUseShadows'),
        uViewPos: gl.getUniformLocation(program, 'uViewPos'),
        uUseTexture: gl.getUniformLocation(program, 'uUseTexture'),
        uTexture: gl.getUniformLocation(program, 'uTexture')
    };

    const sphereGeometry = createSphere(1, 16);
    const cubeGeometry = createCube();
    
    const buffers = {
        positionBuffer: gl.createBuffer(),
        normalBuffer: gl.createBuffer(),
        indexBuffer: gl.createBuffer(),
        cubePositionBuffer: gl.createBuffer(),
        cubeNormalBuffer: gl.createBuffer(),
        cubeIndexBuffer: gl.createBuffer(),
        sphereIndexCount: sphereGeometry.indices.length,
        // record quad for player
        recordPosBuffer: gl.createBuffer(),
        recordTexBuffer: gl.createBuffer()
    };

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereGeometry.positions), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereGeometry.normals), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(sphereGeometry.indices), gl.STATIC_DRAW);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.cubePositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cubeGeometry.positions), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.cubeNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cubeGeometry.normals), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.cubeIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeGeometry.indices), gl.STATIC_DRAW);

    // setup record quad buffers (XZ plane, 1x1 centered)
    const quadPos = new Float32Array([
        -0.5, 0, -0.5,
         0.5, 0, -0.5,
        -0.5, 0,  0.5,
         0.5, 0,  0.5
    ]);
    const quadTex = new Float32Array([
        0,0, 1,0, 0,1, 1,1
    ]);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.recordPosBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadPos, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.recordTexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadTex, gl.STATIC_DRAW);

    // Kingdom configurations (smooth terrain like Mario 64/Sunshine)
    const kingdomConfigs = {
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

    // total moons across all kingdom configs (used to trigger credits)
    game.overallMoons = Object.values(kingdomConfigs).reduce((sum, k) => sum + k.moons, 0);

    const player = createPlayer();

    // Power Moon class
    class PowerMoon {
        constructor(x, y, z) {
            this.pos = vec3.create(x, y, z);
            this.radius = 0.5;
            this.collected = false;
            this.rotation = 0;
            this.bobOffset = Math.random() * Math.PI * 2;
        }

        draw(viewMatrix, projMatrix) {
            if (this.collected) return;
            
            this.rotation += 0.03;
            const bobY = Math.sin(Date.now() * 0.003 + this.bobOffset) * 0.3;
            
            const modelMatrix = multiplyMatrices(
                createTranslationMatrix(this.pos.x, this.pos.y + bobY, this.pos.z),
                createScaleMatrix(this.radius, this.radius, this.radius)
            );
            const mvp = multiplyMatrices(projMatrix, multiplyMatrices(viewMatrix, modelMatrix));

            gl.uniformMatrix4fv(uniforms.uMVP, false, mvp);
            gl.uniformMatrix4fv(uniforms.uModel, false, modelMatrix);
            gl.uniform3f(uniforms.uColor, 1.0, 0.84, 0.0); // Gold color

            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.positionBuffer);
            gl.enableVertexAttribArray(uniforms.aPosition);
            gl.vertexAttribPointer(uniforms.aPosition, 3, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normalBuffer);
            gl.enableVertexAttribArray(uniforms.aNormal);
            gl.vertexAttribPointer(uniforms.aNormal, 3, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indexBuffer);
            gl.drawElements(gl.TRIANGLES, buffers.sphereIndexCount, gl.UNSIGNED_SHORT, 0);
        }
    }

    // Power Soup class - grants temporary buffs
    class PowerSoup {
        constructor(x, y, z) {
            this.pos = vec3.create(x, y, z);
            this.radius = 0.6;
            this.collected = false;
            this.color = [0.95, 0.5, 0.05]; // soup orange
            this.bobOffset = Math.random() * Math.PI * 2;
        }

        draw(viewMatrix, projMatrix) {
            if (this.collected) return;
            const bobY = Math.sin(Date.now() * 0.003 + this.bobOffset) * 0.25;
            const modelMatrix = multiplyMatrices(
                createTranslationMatrix(this.pos.x, this.pos.y + bobY, this.pos.z),
                createScaleMatrix(this.radius, this.radius * 0.6, this.radius)
            );
            const mvp = multiplyMatrices(projMatrix, multiplyMatrices(viewMatrix, modelMatrix));

            gl.uniformMatrix4fv(uniforms.uMVP, false, mvp);
            gl.uniformMatrix4fv(uniforms.uModel, false, modelMatrix);
            gl.uniform3fv(uniforms.uColor, this.color);

            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.positionBuffer);
            gl.enableVertexAttribArray(uniforms.aPosition);
            gl.vertexAttribPointer(uniforms.aPosition, 3, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normalBuffer);
            gl.enableVertexAttribArray(uniforms.aNormal);
            gl.vertexAttribPointer(uniforms.aNormal, 3, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indexBuffer);
            gl.drawElements(gl.TRIANGLES, buffers.sphereIndexCount, gl.UNSIGNED_SHORT, 0);
        }
    }

    // Platform class
    class Platform {
        constructor(x, y, z, width, height, depth, color) {
            this.pos = vec3.create(x, y, z);
            this.width = width;
            this.height = height;
            this.depth = depth;
            this.color = color;
        }

        draw(viewMatrix, projMatrix) {
            const modelMatrix = multiplyMatrices(
                createTranslationMatrix(this.pos.x, this.pos.y, this.pos.z),
                createScaleMatrix(this.width, this.height, this.depth)
            );
            const mvp = multiplyMatrices(projMatrix, multiplyMatrices(viewMatrix, modelMatrix));

            gl.uniformMatrix4fv(uniforms.uMVP, false, mvp);
            gl.uniformMatrix4fv(uniforms.uModel, false, modelMatrix);
            gl.uniform3fv(uniforms.uColor, this.color);

            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.cubePositionBuffer);
            gl.enableVertexAttribArray(uniforms.aPosition);
            gl.vertexAttribPointer(uniforms.aPosition, 3, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.cubeNormalBuffer);
            gl.enableVertexAttribArray(uniforms.aNormal);
            gl.vertexAttribPointer(uniforms.aNormal, 3, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.cubeIndexBuffer);
            gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
        }

        checkCollision(playerPos, playerRadius) {
            const dx = Math.max(this.pos.x - this.width/2, Math.min(playerPos.x, this.pos.x + this.width/2));
            const dy = Math.max(this.pos.y - this.height/2, Math.min(playerPos.y, this.pos.y + this.height/2));
            const dz = Math.max(this.pos.z - this.depth/2, Math.min(playerPos.z, this.pos.z + this.depth/2));
            
            const distSq = (playerPos.x - dx) ** 2 + (playerPos.y - dy) ** 2 + (playerPos.z - dz) ** 2;
            return distSq < playerRadius ** 2;
        }
    }

    // simple boss class for first encounter
    class Boss {
        constructor() {
            this.phase = 1; // 1 = peanutmobile, 2 = robot
            this.peanutAngle = 0;
            this.peanutPos = vec3.create(0, 2, 0);
            this.robotHealth = 3;
            this.robotPos = vec3.create(0, 4, 0);
            this.robotArmAngle = 0;
        }

        update(dt) {
            if (this.phase === 1) {
                // circle around arena center
                this.peanutAngle += dt * 0.5;
                const radius = 25;
                this.peanutPos.x = Math.cos(this.peanutAngle) * radius;
                this.peanutPos.z = Math.sin(this.peanutAngle) * radius;
            } else if (this.phase === 2) {
                // swing robot arms
                this.robotArmAngle += dt * 2.5;
            }
        }

        onHit() {
            if (this.phase === 1) {
                this.phase = 2;
                showMessage('Peanut down! Robot awakens!', '#FF0000');
                updateHUD();
            } else if (this.phase === 2) {
                this.robotHealth -= 1;
                showMessage('Robot hit! ' + this.robotHealth + ' left', '#FF0000');
                updateHUD();
                if (this.robotHealth <= 0) {
                    showMessage('Boss defeated!', '#00FF00');
                    // drop a moon as reward
                    game.collectibles.push(new PowerMoon(this.robotPos.x, this.robotPos.y + 5, this.robotPos.z));
                    game.boss = null;
                    updateHUD();
                }
            }
        }

        draw(viewMatrix, projMatrix) {
            if (this.phase === 1) {
                // draw peanutmobile as a brown sphere
                const model = multiplyMatrices(
                    createTranslationMatrix(this.peanutPos.x, this.peanutPos.y, this.peanutPos.z),
                    createScaleMatrix(2, 1.5, 1.5)
                );
                const mvp = multiplyMatrices(projMatrix, multiplyMatrices(viewMatrix, model));
                gl.uniformMatrix4fv(uniforms.uMVP, false, mvp);
                gl.uniformMatrix4fv(uniforms.uModel, false, model);
                gl.uniform3fv(uniforms.uColor, [0.6, 0.4, 0.2]);
                // use general sphere buffers (positionBuffer/normalBuffer) rather than nonexistent names
                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.positionBuffer);
                gl.enableVertexAttribArray(uniforms.aPosition);
                gl.vertexAttribPointer(uniforms.aPosition, 3, gl.FLOAT, false, 0, 0);
                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normalBuffer);
                gl.enableVertexAttribArray(uniforms.aNormal);
                gl.vertexAttribPointer(uniforms.aNormal, 3, gl.FLOAT, false, 0, 0);
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indexBuffer);
                gl.drawElements(gl.TRIANGLES, buffers.sphereIndexCount, gl.UNSIGNED_SHORT, 0);
            } else {
                // body cube
                let body = multiplyMatrices(
                    createTranslationMatrix(this.robotPos.x, this.robotPos.y, this.robotPos.z),
                    createScaleMatrix(3, 3, 3)
                );
                let mvp = multiplyMatrices(projMatrix, multiplyMatrices(viewMatrix, body));
                gl.uniformMatrix4fv(uniforms.uMVP, false, mvp);
                gl.uniformMatrix4fv(uniforms.uModel, false, body);
                gl.uniform3fv(uniforms.uColor, [0.8, 0.1, 0.1]);
                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.cubePositionBuffer);
                gl.enableVertexAttribArray(uniforms.aPosition);
                gl.vertexAttribPointer(uniforms.aPosition, 3, gl.FLOAT, false, 0, 0);
                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.cubeNormalBuffer);
                gl.enableVertexAttribArray(uniforms.aNormal);
                gl.vertexAttribPointer(uniforms.aNormal, 3, gl.FLOAT, false, 0, 0);
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.cubeIndexBuffer);
                gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
                // arms
                const armLen = 6;
                const leftOffset = vec3.create(-4, 0, 0);
                const rightOffset = vec3.create(4, 0, 0);
                const ang = Math.sin(this.robotArmAngle) * 0.75;
                // left arm
                let leftArmTrans = multiplyMatrices(
                    createTranslationMatrix(this.robotPos.x + leftOffset.x, this.robotPos.y, this.robotPos.z + leftOffset.z),
                    createRotationZ(ang)
                );
                leftArmTrans = multiplyMatrices(leftArmTrans, createTranslationMatrix(-armLen/2,0,0));
                leftArmTrans = multiplyMatrices(leftArmTrans, createScaleMatrix(armLen, 0.8, 0.8));
                mvp = multiplyMatrices(projMatrix, multiplyMatrices(viewMatrix, leftArmTrans));
                gl.uniformMatrix4fv(uniforms.uMVP, false, mvp);
                gl.uniformMatrix4fv(uniforms.uModel, false, leftArmTrans);
                gl.uniform3fv(uniforms.uColor, [0.5,0.5,0.5]);
                gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
                // right arm
                let rightArmTrans = multiplyMatrices(
                    createTranslationMatrix(this.robotPos.x + rightOffset.x, this.robotPos.y, this.robotPos.z + rightOffset.z),
                    createRotationZ(-ang)
                );
                rightArmTrans = multiplyMatrices(rightArmTrans, createTranslationMatrix(armLen/2,0,0));
                rightArmTrans = multiplyMatrices(rightArmTrans, createScaleMatrix(armLen, 0.8, 0.8));
                mvp = multiplyMatrices(projMatrix, multiplyMatrices(viewMatrix, rightArmTrans));
                gl.uniformMatrix4fv(uniforms.uMVP, false, mvp);
                gl.uniformMatrix4fv(uniforms.uModel, false, rightArmTrans);
                gl.uniform3fv(uniforms.uColor, [0.5,0.5,0.5]);
                gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
            }
        }
    }


    function update(deltaTime) {
        if (game.paused) return; // skip game logic while paused
        const dt = Math.min(deltaTime / 1000, 0.05);

        // handle pause key here now that keydown listener is elsewhere
        const pKey = game.keys['p'] || game.keys['P'] || game.keys['KeyP'];
        if (pKey && !game.pWasPressed) togglePause();
        game.pWasPressed = pKey;

        // boss logic if present
        if (game.boss) game.boss.update(dt);

        // Ground and platform collision
        player.onGround = false;
        
        // Check terrain heightmap collision
        if (game.heightMap && game.gridSize) {
            const ix = Math.round(player.pos.x / game.gridSize);
            const iz = Math.round(player.pos.z / game.gridSize);
            const terrainHeight = game.heightMap[`${ix},${iz}`];
            
            if (terrainHeight !== undefined) {
                const groundY = terrainHeight;
                if (player.pos.y - player.radius <= groundY) {
                    player.pos.y = groundY + player.radius;
                    player.vel.y = Math.max(0, player.vel.y);
                    player.onGround = true;
                }
            }
        }
        
        // Fallback to flat ground at y=0
        if (!player.onGround && player.pos.y - player.radius <= 0) {
            player.pos.y = player.radius;
            player.vel.y = Math.max(0, player.vel.y);
            player.onGround = true;
        }

        // Check platforms – only land if coming from above and horizontally overlapping
        game.platforms.forEach(platform => {
            const halfW = platform.width / 2;
            const halfD = platform.depth / 2;
            const dx = Math.abs(player.pos.x - platform.pos.x);
            const dz = Math.abs(player.pos.z - platform.pos.z);
            // require horizontal overlap within radius (relaxed slightly)
            if (dx < halfW + player.radius - 0.1 && dz < halfD + player.radius - 0.1) {
                const platformTop = platform.pos.y + platform.height / 2;
                // only adjust if player is above the top and moving downward
                // only land if center is at or just above the platform top and moving downward
                if (player.pos.y > platformTop - 0.1 && player.pos.y - player.radius <= platformTop && player.vel.y <= 0) {
                    player.pos.y = platformTop + player.radius;
                    player.vel.y = 0;
                    player.onGround = true;
                }
            }
        });

        // Standard gravity (not galaxy gravity) applied after collision checks
        if (!player.onGround) {
            player.vel.y -= 25 * dt; // Standard downward gravity
        }

        // Movement
        const wKey = game.keys['w'] || game.keys['W'] || game.keys['KeyW'] || game.keys['ArrowUp'];
        const sKey = game.keys['s'] || game.keys['S'] || game.keys['KeyS'] || game.keys['ArrowDown'];
        const aKey = game.keys['a'] || game.keys['A'] || game.keys['KeyA'] || game.keys['ArrowLeft'];
        const dKey = game.keys['d'] || game.keys['D'] || game.keys['KeyD'] || game.keys['ArrowRight'];
        const spaceKey = game.keys[' '] || game.keys['Space'];
        const shiftKey = game.keys['Shift'] || game.keys['ShiftLeft'] || game.keys['ShiftRight'];
        const qKey = game.keys['q'] || game.keys['Q'];
        const eKey = game.keys['e'] || game.keys['E'];
        const fKey = game.keys['f'] || game.keys['F']; // ADD
        const kKey = game.keys['k'] || game.keys['K'];
        const rKey = game.keys['r'] || game.keys['R'];
        const bKey = game.keys['b'] || game.keys['B']; // boss key

        // Mario Sunshine momentum-based movement
        const camYaw = game.camera.yaw;
        const forward = vec3.create(Math.sin(camYaw), 0, Math.cos(camYaw));
        const right = vec3.create(Math.cos(camYaw), 0, -Math.sin(camYaw));
        
        const maxSpeed = 18 * (player.speedMultiplier || 1.0);
        const acceleration = 60 * (player.speedMultiplier || 1.0);
        const airControl = 35;
        
        // Get input direction
        let inputX = 0, inputZ = 0;
        if (wKey) { inputX += forward.x; inputZ += forward.z; }
        if (sKey) { inputX -= forward.x; inputZ -= forward.z; }
        if (aKey) { inputX -= right.x; inputZ -= right.z; }
        if (dKey) { inputX += right.x; inputZ += right.z; }
        
        const inputLength = Math.sqrt(inputX * inputX + inputZ * inputZ);
        if (inputLength > 0.1) {
            inputX /= inputLength;
            inputZ /= inputLength;
            player.moveDir = vec3.create(inputX, 0, inputZ);
            player.facingDir = player.moveDir;
        }
        
        // Ground movement with momentum
        if (player.onGround && player.state !== 'attacking' && !player.diving && !player.canDiveJump) {
            if (inputLength > 0.1) {
                player.vel.x += inputX * acceleration * dt;
                player.vel.z += inputZ * acceleration * dt;
                
                // Limit to max speed
                const currentSpeed = Math.sqrt(player.vel.x * player.vel.x + player.vel.z * player.vel.z);
                if (currentSpeed > maxSpeed) {
                    player.vel.x = (player.vel.x / currentSpeed) * maxSpeed;
                    player.vel.z = (player.vel.z / currentSpeed) * maxSpeed;
                }
            }
        } else if (!player.onGround && !player.groundPounding && !player.diving) {
            // Air control (reduced)
            if (inputLength > 0.1) {
                player.vel.x += inputX * airControl * dt;
                player.vel.z += inputZ * airControl * dt;
            }
        }
        
        // Reset jump counter when grounded
        if (player.onGround && player.state !== 'jumping') {
            const now = Date.now();
            if (now - player.lastJumpTime > 800) {
                player.jumpCount = 0;
            }
        }
        
        // Long Jump (shift + space while running on ground)
        if (shiftKey && spaceKey && !game.spaceWasPressed && player.onGround && !player.canDiveJump) {
            const currentSpeed = Math.sqrt(player.vel.x * player.vel.x + player.vel.z * player.vel.z);
            if (currentSpeed > 5) {
                player.vel.y = 12 * (player.jumpMultiplier || 1.0);
                const dir = vec3.normalize(vec3.create(player.vel.x, 0, player.vel.z));
                player.vel.x = dir.x * 22;
                player.vel.z = dir.z * 22;
                player.state = 'longjump';
                player.stateTimer = 0.6;
                player.jumpCount = 0;
                showMessage('Long Jump!', '#FFD700');
                game.spaceWasPressed = true;
                return; // Skip other jump checks
            }
        }
        
        // Triple Jump system
        if (spaceKey && !game.spaceWasPressed && player.onGround && !player.canDiveJump) {
            const now = Date.now();
            const timeSinceLastJump = now - player.lastJumpTime;
            
            // Check for backflip (jumping while moving backward)
            const currentSpeed = Math.sqrt(player.vel.x * player.vel.x + player.vel.z * player.vel.z);
            const isMovingBack = sKey && currentSpeed > 3;
            
            if (isMovingBack) {
                // Side flip / Backflip
                player.vel.y = 18 * (player.jumpMultiplier || 1.0);
                player.vel.x = player.facingDir.x * -12;
                player.vel.z = player.facingDir.z * -12;
                player.state = 'backflip';
                player.rotation = 0;
                player.jumpCount = 0;
                showMessage('Backflip!', '#00FFFF');
            } else if (timeSinceLastJump < 600 && player.jumpCount < 3) {
                // Triple jump progression
                player.jumpCount++;
                if (player.jumpCount === 1) {
                    player.vel.y = 13 * (player.jumpMultiplier || 1.0);
                    player.state = 'jumping';
                } else if (player.jumpCount === 2) {
                    player.vel.y = 15 * (player.jumpMultiplier || 1.0);
                    player.state = 'jumping';
                    showMessage('Double Jump!', '#FFFF00');
                } else if (player.jumpCount === 3) {
                    player.vel.y = 20 * (player.jumpMultiplier || 1.0);
                    player.state = 'jumping';
                    showMessage('Triple Jump!', '#FF00FF');
                }
            } else {
                // First jump
                player.jumpCount = 1;
                player.vel.y = 13 * (player.jumpMultiplier || 1.0);
                player.state = 'jumping';
            }
            
            player.lastJumpTime = now;
            player.spinJumping = false;
        }
        
        // Spin Jump (press jump again in air)
        if (spaceKey && !game.spaceWasPressed && !player.onGround && !player.spinJumping && player.vel.y > 0) {
            player.vel.y += 8 * (player.jumpMultiplier || 1.0);
            player.spinJumping = true;
            player.state = 'spinjump';
            player.rotation = 0;
            showMessage('Spin Jump!', '#00FFFF');
        }
        
        // Ground Pound (shift while in air, no forward movement)
        if (shiftKey && !game.shiftWasPressed && !player.onGround && !player.groundPounding) {
            const horizontalSpeed = Math.sqrt(player.vel.x * player.vel.x + player.vel.z * player.vel.z);
            if (horizontalSpeed < 8) {
                player.vel.y = -30;
                player.vel.x *= 0.3;
                player.vel.z *= 0.3;
                player.groundPounding = true;
                player.state = 'groundpound';
                showMessage('Ground Pound!', '#FF8C00');
            } else {
                // Dive (shift while moving in air)
                player.diving = true;
                player.groundPounding = false;
                player.state = 'dive';
                const diveSpeed = 25;
                const dir = vec3.normalize(vec3.create(player.vel.x, 0, player.vel.z));
                player.vel.x = dir.x * diveSpeed;
                player.vel.z = dir.z * diveSpeed;
                player.vel.y = -8;
                showMessage('Dive!', '#00CED1');
            }
        }
        
        // Dive recovery jump
        if (player.diving && spaceKey && !game.spaceWasPressed && player.canDiveJump) {
            player.vel.y = 16 * (player.jumpMultiplier || 1.0);
            player.diving = false;
            player.canDiveJump = false;
            player.state = 'jumping';
            showMessage('Dive Jump!', '#7FFF00');
        }
        
        game.spaceWasPressed = spaceKey;
        game.shiftWasPressed = shiftKey;

        // Attack
        if (qKey && !game.qWasPressed && player.onGround) {
            player.state = 'attacking';
            player.stateTimer = 0.5;
        }
        game.qWasPressed = qKey;

        // Roll (now Summersault) - E key on ground
        if (eKey && !game.eWasPressed && player.onGround && !game.insidePyramid) {
            // Check if near pyramid first
            let nearPyramid = false;
            if (game.structures) {
                const pyramid = game.structures.find(s => s.type === 'pyramid' && s.hasInterior);
                if (pyramid) {
                    const dx = player.pos.x - pyramid.x;
                    const dz = player.pos.z - pyramid.z;
                    const distToPyramid = Math.sqrt(dx * dx + dz * dz);
                    if (distToPyramid < (pyramid.size || 15) * 1.2) {
                        nearPyramid = true;
                    }
                }
            }
            
            if (!nearPyramid) {
                player.vel.y = 10;
                player.state = 'summersault';
                player.stateTimer = 0.8;
                player.rotation = 0;
            }
        }

        // Hair Throw (Cappy mechanic) - F key
        if (fKey && !game.fWasPressed && !player.hairThrown) {
            // Throw hair in facing direction
            player.hairThrown = true;
            player.hairReturn = false;
            player.hairPos = vec3.add(player.pos, vec3.scale(vec3.create(0, 1, 0), 2));
            
            const throwDir = player.facingDir || vec3.create(0, 0, 1);
            player.hairVel = vec3.scale(vec3.normalize(vec3.add(throwDir, vec3.create(0, 0.2, 0))), 25);
            
            showMessage('Hair Throw!', '#FFD700');
            playEffect("jeff's song (3).mp3", 2);
        }
        game.fWasPressed = fKey;

        // Update hair projectile
        if (player.hairThrown && player.hairPos) {
            const hairSpeed = 25;
            const maxDist = 20;
            const returnSpeed = 30;
            
            if (!player.hairReturn) {
                // Hair flying out
                player.hairPos = vec3.add(player.hairPos, vec3.scale(player.hairVel, dt));
                player.hairVel.y -= 15 * dt; // Gravity on hair
                
                // Check distance or ground collision
                const distFromPlayer = vec3.length(vec3.sub(player.hairPos, player.pos));
                if (distFromPlayer > maxDist || player.hairPos.y < 0) {
                    player.hairReturn = true;
                }
                
                // Check moon collection with hair
                game.collectibles.forEach(moon => {
                    if (!moon.collected && player.hairPos) {
                        const dist = vec3.length(vec3.sub(player.hairPos, moon.pos));
                        if (dist < 1.5) {
                            moon.collected = true;
                            game.moons++;
                            updateHUD();
                            showMessage('Hair Capture! Power Moon!', '#FFD700');
                            player.hairReturn = true;
                        }
                    }
                });

                // Check soup collection with hair
                if (game.powerSoups) {
                    game.powerSoups.forEach(soup => {
                        if (!soup.collected && player.hairPos) {
                            const dist = vec3.length(vec3.sub(player.hairPos, soup.pos));
                            if (dist < 1.5) {
                                soup.collected = true;
                                soup.collectedTime = Date.now();
                                // Apply soup buff
                                player.speedMultiplier = 1.6;
                                player.jumpMultiplier = 1.2;
                                player.soupTimer = 8.0;
                                showMessage('Hair Capture! Power Soup activated!', '#FF8C00');
                                player.hairReturn = true;
                            }
                        }
                    });
                }

                // Check walker collision with hair
                game.walkers.forEach(walker => {
                    if (walker.alive && player.hairPos) {
                        const dist = vec3.length(vec3.sub(player.hairPos, walker.pos));
                        if (dist < 1.5) {
                            walker.die();
                            player.hairReturn = true;
                            game.moons++;
                            game.moonsCollectedTotal++;
                            updateHUD();
                            showMessage('Hair Hit! Enemy defeated!', '#FF8C00');
                            if (game.moonsCollectedTotal >= game.overallMoons) showCredits();
                        }
                    }
                });

                // boss hit detection
                if (game.boss && player.hairPos) {
                    if (game.boss.phase === 1) {
                        const dist = vec3.length(vec3.sub(player.hairPos, game.boss.peanutPos));
                        if (dist < 2) {
                            game.boss.onHit();
                            player.hairReturn = true;
                        }
                    } else if (game.boss.phase === 2) {
                        const dist = vec3.length(vec3.sub(player.hairPos, game.boss.robotPos));
                        if (dist < 3) {
                            game.boss.onHit();
                            player.hairReturn = true;
                        }
                    }
                }
            } else {
                // Hair returning
                const toPlayer = vec3.sub(player.pos, player.hairPos);
                const dist = vec3.length(toPlayer);
                
                if (dist < 1) {
                    // Hair returned
                    player.hairThrown = false;
                    player.hairPos = null;
                    player.hairVel = null;
                } else {
                    const returnDir = vec3.normalize(toPlayer);
                    player.hairPos = vec3.add(player.hairPos, vec3.scale(returnDir, returnSpeed * dt));
                }
            }
        }

        // Kingdom switch via K
        if (kKey && !game.kWasPressed) {
            const kingdomKeys = Object.keys(kingdomConfigs);
            const currentIndex = kingdomKeys.indexOf(game.currentKingdom);
            const nextIndex = (currentIndex + 1) % kingdomKeys.length;
            loadKingdom(kingdomKeys[nextIndex]);
        }
        game.kWasPressed = kKey;
        // direct boss debug key B
        if (bKey && !game.bWasPressed) {
            loadKingdom('boss');
        }
        game.bWasPressed = bKey;
        
        // Boss stomp collision
        if (game.boss) {
            const toBoss = vec3.sub(player.pos, game.boss.phase === 1 ? game.boss.peanutPos : game.boss.robotPos);
            const dist = vec3.length(toBoss);
            if (player.vel.y < 0 && player.pos.y > ((game.boss.phase === 1 ? game.boss.peanutPos.y : game.boss.robotPos.y) + 1)) {
                if ((game.boss.phase === 1 && dist < 2) || (game.boss.phase === 2 && dist < 3)) {
                    game.boss.onHit();
                    player.vel.y = 12;
                }
            }
        }
        
        // Pyramid teleporter (only in Sand Kingdom)
        if (game.structures && !game.insidePyramid && player.onGround) {
            const pyramid = game.structures.find(s => s.type === 'pyramid' && s.hasInterior);
            if (pyramid) {
                const dx = player.pos.x - pyramid.x;
                const dz = player.pos.z - pyramid.z;
                const distToPyramid = Math.sqrt(dx * dx + dz * dz);
                
                if (distToPyramid < (pyramid.size || 15) * 1.2) {
                    showMessage('Press E to enter pyramid', '#FFD700');
                    
                    if (eKey && !game.eWasPressed) {
                        enterPyramid();
                    }
                }
            }
        } else if (game.insidePyramid && player.onGround && eKey && !game.eWasPressed) {
            exitPyramid();
        }
        game.eWasPressed = eKey;

        // Toggle RTX mode
        if (rKey && !game.rWasPressed) {
            game.rtxMode = !game.rtxMode;
            showMessage(game.rtxMode ? 'RTX Mode ON' : 'RTX Mode OFF', '#8AE234');
        }
        game.rWasPressed = rKey;


        // Update timers
        if (player.stateTimer > 0) {
            player.stateTimer -= dt;
            if (player.stateTimer <= 0 && (player.state === 'attacking' || player.state === 'longjump' || player.state === 'summersault')) {
                player.state = 'idle';
            }
        }

        // Update Power Soup timer
        if (player.soupTimer > 0) {
            player.soupTimer -= dt;
            if (player.soupTimer <= 0) {
                player.soupTimer = 0;
                player.speedMultiplier = 1.0;
                player.jumpMultiplier = 1.0;
                showMessage('Power Soup expired');
                // restore background if we swapped for powerup
                if (prePowerTrack !== undefined) {
                    playTrack(prePowerTrack);
                    prePowerTrack = undefined;
                }
            }
        }

        // Handle landing from special states
        if (player.onGround) {
            if (player.groundPounding) {
                player.vel.x *= 0.1;
                player.vel.z *= 0.1;
                player.groundPounding = false;
                showMessage('Slam!', '#FF4500');
            }
            if (player.diving) {
                player.canDiveJump = true;
                player.vel.x *= 0.7;
                player.vel.z *= 0.7;
            } else {
                player.canDiveJump = false;
            }
            player.spinJumping = false;
        } else {
            // In air - no dive jump
            if (!player.diving) {
                player.canDiveJump = false;
            }
        }
        
        if (player.state === 'summersault' || player.state === 'spinjump') {
            player.rotation += dt * 15;
        }
        if (player.state === 'backflip') {
            player.rotation += dt * 8;
        }

        // Animation states
        const speed = Math.sqrt(player.vel.x ** 2 + player.vel.z ** 2);
        if (player.state === 'longjump' || player.state === 'summersault' || player.state === 'attacking' || 
            player.state === 'dive' || player.state === 'groundpound' || player.state === 'spinjump' || player.state === 'backflip') {
            // Keep special state
        } else if (!player.onGround) {
            player.state = 'jumping';
        } else if (speed > 1) {
            player.state = 'running';
            player.walkCycle += dt * 10;
        } else {
            player.state = 'idle';
            player.diving = false;
        }

        // Mario Sunshine-style damping (slower, more momentum)
        if (player.onGround) {
            player.vel.x *= 0.88;
            player.vel.z *= 0.88;
        } else {
            // Less air friction for better air control
            player.vel.x *= 0.97;
            player.vel.z *= 0.97;
        }

        // Update position
        player.pos.x += player.vel.x * dt;
        player.pos.y += player.vel.y * dt;
        player.pos.z += player.vel.z * dt;

        // Collect moons
        game.collectibles.forEach(moon => {
            if (!moon.collected) {
                const dist = vec3.length(vec3.sub(player.pos, moon.pos));
                if (dist < player.radius + moon.radius) {
                    moon.collected = true;
                    game.moons++;
                    game.moonsCollectedTotal++;
                    updateHUD();
                    showMessage('Power Moon collected!');
                    if (game.moonsCollectedTotal >= game.overallMoons) {
                        showCredits();
                    }
                }
            }
        });

        // Collect Power Soups
        if (game.powerSoups) {
            game.powerSoups.forEach(soup => {
                if (!soup.collected) {
                    const dist = vec3.length(vec3.sub(player.pos, soup.pos));
                    if (dist < player.radius + soup.radius) {
                        soup.collected = true;
                        // Apply temporary buffs
                        player.speedMultiplier = 1.6;
                        player.jumpMultiplier = 1.2;
                        player.soupTimer = 8.0; // seconds
                        showMessage('Power Soup! Speed & Jump UP!', '#FF8C00');
                        // play brief powerup music rather than replace background
                        playEffect(powerupTrackName, player.soupTimer);
                    }
                }
            });
        }

        // Update walkers and handle collisions with player
        game.walkers.forEach(walker => {
            walker.update(dt, game.platforms);

            if (!walker.alive) return;

            const dist = vec3.length(vec3.sub(player.pos, walker.pos));
            if (dist < player.radius + walker.radius) {
                // Stomp if player is falling onto the walker
                if (player.vel.y < -6 && player.pos.y > walker.pos.y + walker.radius * 0.4) {
                    walker.die();
                    player.vel.y = 12;
                    game.moons++;
                    game.moonsCollectedTotal++;
                    updateHUD();
                    showMessage('Stomp!');
                    if (game.moonsCollectedTotal >= game.overallMoons) showCredits();
                } else if (player.state === 'attacking') {
                    walker.die();
                    player.vel.y = 6;
                    game.moons++;
                    game.moonsCollectedTotal++;
                    updateHUD();
                    showMessage('Knockout!');
                    if (game.moonsCollectedTotal >= game.overallMoons) showCredits();
                } else {
                    // Hurt player
                    const knock = player.facingDir || vec3.create(0,0,1);
                    player.vel.x = -knock.x * 12;
                    player.vel.z = -knock.z * 12;
                    showMessage('Ouch!');
                }
            }
        });

        // Clean up dead walkers after a short time
        game.walkers = game.walkers.filter(w => !( !w.alive && w.deadTimer > 2.0 ));

        // Update & draw power soups (draw happens in draw())
        if (game.powerSoups) {
            game.powerSoups = game.powerSoups.filter(s => !(s.collected && s.collectedTime && (Date.now() - s.collectedTime) > 2000));
        }

        // Camera
        const camDist = game.camera.distance / game.camera.zoom;
        const camHeight = 15 / game.camera.zoom;
        const targetCamPos = vec3.add(player.pos, vec3.create(
            -Math.sin(game.camera.yaw) * camDist,
            camHeight,
            -Math.cos(game.camera.yaw) * camDist
        ));
        game.camera.x += (targetCamPos.x - game.camera.x) * 0.1;
        game.camera.y += (targetCamPos.y - game.camera.y) * 0.1;
        game.camera.z += (targetCamPos.z - game.camera.z) * 0.1;
    }

    // helper used during the shadow-map pass; draws all scene elements using
    // the simple shadow program with the supplied light-space matrix.
    function drawShadowPass(lightMatrix) {
        gl.useProgram(shadowProgram);
        const aPos = gl.getAttribLocation(shadowProgram, 'aPosition');
        const uLightMVP = gl.getUniformLocation(shadowProgram, 'uLightMVP');
        gl.enableVertexAttribArray(aPos);

        // helpers for shapes
        const drawCubeShadow = (pos, sx, sy, sz) => {
            const model = multiplyMatrices(
                createTranslationMatrix(pos.x, pos.y, pos.z),
                createScaleMatrix(sx, sy, sz)
            );
            const mvp = multiplyMatrices(lightMatrix, model);
            gl.uniformMatrix4fv(uLightMVP, false, mvp);
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.cubePositionBuffer);
            gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.cubeIndexBuffer);
            gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
        };
        const drawSphereShadow = (pos, r) => {
            const model = multiplyMatrices(
                createTranslationMatrix(pos.x, pos.y, pos.z),
                createScaleMatrix(r, r, r)
            );
            const mvp = multiplyMatrices(lightMatrix, model);
            gl.uniformMatrix4fv(uLightMVP, false, mvp);
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.positionBuffer);
            gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indexBuffer);
            gl.drawElements(gl.TRIANGLES, buffers.sphereIndexCount, gl.UNSIGNED_SHORT, 0);
        };

        // draw everything that contributes shadows
        game.platforms.forEach(p => drawCubeShadow(p.pos, p.width, p.height, p.depth));
        game.collectibles.forEach(m => drawSphereShadow(m.pos, m.radius));
        if (game.powerSoups) game.powerSoups.forEach(s => drawSphereShadow(s.pos, s.radius));
        game.walkers.forEach(w => drawSphereShadow(w.pos, w.radius));
        // approximate player as a sphere
        drawSphereShadow(player.pos, player.radius);
        // include boss in shadow calculation too
        if (game.boss) {
            if (game.boss.phase === 1) {
                drawSphereShadow(game.boss.peanutPos, 2);
            } else {
                // body
                drawCubeShadow(game.boss.robotPos, 3,3,3);
                // arms approximately as cubes
                const ang = Math.sin(game.boss.robotArmAngle) * 0.75;
                const armLen = 6;
                const leftOffset = vec3.create(-4,0,0);
                const rightOffset = vec3.create(4,0,0);
                // left arm
                drawCubeShadow(vec3.add(game.boss.robotPos, leftOffset), armLen,0.8,0.8);
                // right arm
                drawCubeShadow(vec3.add(game.boss.robotPos, rightOffset), armLen,0.8,0.8);
            }
        }
    }
    
    function drawTerrainMesh(viewMatrix, projMatrix) {
        if (!game.terrainBuffers || !game.terrainIndexCount) return;
        
        const modelMatrix = createTranslationMatrix(0, 0, 0);
        const mvp = multiplyMatrices(projMatrix, multiplyMatrices(viewMatrix, modelMatrix));
        
        gl.uniformMatrix4fv(uniforms.uMVP, false, mvp);
        gl.uniformMatrix4fv(uniforms.uModel, false, modelMatrix);
        
        // Bind position buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, game.terrainBuffers.position);
        gl.enableVertexAttribArray(uniforms.aPosition);
        gl.vertexAttribPointer(uniforms.aPosition, 3, gl.FLOAT, false, 0, 0);
        
        // Bind normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, game.terrainBuffers.normal);
        gl.enableVertexAttribArray(uniforms.aNormal);
        gl.vertexAttribPointer(uniforms.aNormal, 3, gl.FLOAT, false, 0, 0);
        
        // Use color from color buffer per-vertex
        if (game.terrainBuffers.color) {
            gl.bindBuffer(gl.ARRAY_BUFFER, game.terrainBuffers.color);
            // Note: shader expects a uniform color, so we'll use the first vertex color as a fallback
            // For per-vertex colors, shader would need modification
            // For now, use a terrain color
        }
        gl.uniform3fv(uniforms.uColor, [0.4, 0.6, 0.4]);
        
        // Bind index buffer and draw
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, game.terrainBuffers.index);
        gl.drawElements(gl.TRIANGLES, game.terrainIndexCount, gl.UNSIGNED_SHORT, 0);
    }
    
    function drawStructures(viewMatrix, projMatrix) {
        if (!game.structures || !game.heightMap) return;
        
        const getHeight = (x, z) => {
            const ix = Math.round(x / game.gridSize);
            const iz = Math.round(z / game.gridSize);
            return game.heightMap[`${ix},${iz}`] ?? 0;
        };
        
        game.structures.forEach(structure => {
            const { type, x, z } = structure;
            const groundY = getHeight(x, z);
            
            if (type === 'tophat') {
                // Draw top hat as cylinder with rim
                const h = structure.size || 4;
                const r = structure.size * 0.4 || 1.5;
                drawCylinder(x, groundY + h/2, z, r, h, structure.color || [0.1, 0.1, 0.1], viewMatrix, projMatrix);
                // Rim
                drawCylinder(x, groundY + 0.3, z, r * 1.6, 0.6, structure.color || [0.1, 0.1, 0.1], viewMatrix, projMatrix);
            } else if (type === 'building') {
                // Draw as cube
                const { width, height, depth, color } = structure;
                drawCube(x, groundY + height/2, z, width, height, depth, color || [0.5, 0.5, 0.5], viewMatrix, projMatrix);
            } else if (type === 'boulder') {
                // Draw as sphere
                const r = structure.size || 3;
                drawSphere(x, groundY + r, z, r, structure.color || [0.4, 0.4, 0.35], viewMatrix, projMatrix);
            } else if (type === 'pillar') {
                // Draw as tall thin cylinder
                const { height, radius, color } = structure;
                drawCylinder(x, groundY + height/2, z, radius || 1, height || 8, color || [0.5, 0.5, 0.45], viewMatrix, projMatrix);
            } else if (type === 'pyramid') {
                // Draw as cube for now (pyramids would need custom geometry)
                const { size, height, color } = structure;
                drawCube(x, groundY + height/2, z, size, height, size, color || [0.9, 0.8, 0.5], viewMatrix, projMatrix);
            } else if (type === 'palm') {
                // trunk
                const h = structure.height || 6;
                drawCylinder(x, groundY + h/2, z, 0.4, h, [0.4, 0.3, 0.2], viewMatrix, projMatrix);
                // leaves  
                drawSphere(x, groundY + h + 1, z, 2, [0.2, 0.6, 0.3], viewMatrix, projMatrix);
            } else if (type === 'dune') {
                // Draw as flattened sphere
                const r = structure.size || 4;
                drawSphere(x, groundY + r * 0.3, z, r, structure.color || [0.9, 0.8, 0.6], viewMatrix, projMatrix);
            }
        });
    }
    
    function drawCube(x, y, z, width, height, depth, color, viewMatrix, projMatrix) {
        const modelMatrix = multiplyMatrices(
            createTranslationMatrix(x, y, z),
            createScaleMatrix(width, height, depth)
        );
        const mvp = multiplyMatrices(projMatrix, multiplyMatrices(viewMatrix, modelMatrix));
        
        gl.uniformMatrix4fv(uniforms.uMVP, false, mvp);
        gl.uniformMatrix4fv(uniforms.uModel, false, modelMatrix);
        gl.uniform3fv(uniforms.uColor, color);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.cubePositionBuffer);
        gl.enableVertexAttribArray(uniforms.aPosition);
        gl.vertexAttribPointer(uniforms.aPosition, 3, gl.FLOAT, false, 0, 0);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.cubeNormalBuffer);
        gl.enableVertexAttribArray(uniforms.aNormal);
        gl.vertexAttribPointer(uniforms.aNormal, 3, gl.FLOAT, false, 0, 0);
        
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.cubeIndexBuffer);
        gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
    }
    
    function drawSphere(x, y, z, radius, color, viewMatrix, projMatrix) {
        const modelMatrix = multiplyMatrices(
            createTranslationMatrix(x, y, z),
            createScaleMatrix(radius, radius, radius)
        );
        const mvp = multiplyMatrices(projMatrix, multiplyMatrices(viewMatrix, modelMatrix));
        
        gl.uniformMatrix4fv(uniforms.uMVP, false, mvp);
        gl.uniformMatrix4fv(uniforms.uModel, false, modelMatrix);
        gl.uniform3fv(uniforms.uColor, color);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.positionBuffer);
        gl.enableVertexAttribArray(uniforms.aPosition);
        gl.vertexAttribPointer(uniforms.aPosition, 3, gl.FLOAT, false, 0, 0);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normalBuffer);
        gl.enableVertexAttribArray(uniforms.aNormal);
        gl.vertexAttribPointer(uniforms.aNormal, 3, gl.FLOAT, false, 0, 0);
        
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indexBuffer);
        gl.drawElements(gl.TRIANGLES, buffers.sphereIndexCount, gl.UNSIGNED_SHORT, 0);
    }
    
    function drawCylinder(x, y, z, radius, height, color, viewMatrix, projMatrix) {
        // Approximate cylinder as scaled sphere for simplicity
        const modelMatrix = multiplyMatrices(
            createTranslationMatrix(x, y, z),
            createScaleMatrix(radius, height/2, radius)
        );
        const mvp = multiplyMatrices(projMatrix, multiplyMatrices(viewMatrix, modelMatrix));
        
        gl.uniformMatrix4fv(uniforms.uMVP, false, mvp);
        gl.uniformMatrix4fv(uniforms.uModel, false, modelMatrix);
        gl.uniform3fv(uniforms.uColor, color);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.positionBuffer);
        gl.enableVertexAttribArray(uniforms.aPosition);
        gl.vertexAttribPointer(uniforms.aPosition, 3, gl.FLOAT, false, 0, 0);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normalBuffer);
        gl.enableVertexAttribArray(uniforms.aNormal);
        gl.vertexAttribPointer(uniforms.aNormal, 3, gl.FLOAT, false, 0, 0);
        
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indexBuffer);
        gl.drawElements(gl.TRIANGLES, buffers.sphereIndexCount, gl.UNSIGNED_SHORT, 0);
    }

    function draw() {
        gl.clearColor(0.53, 0.81, 0.92, 1.0); // Sky blue
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);

        const aspect = canvas.width / canvas.height;
        const projMatrix = createPerspectiveMatrix(Math.PI / 3, aspect, 0.1, 500);
        
        const eye = vec3.create(game.camera.x, game.camera.y, game.camera.z);
        const viewMatrix = createLookAtMatrix(eye, player.pos, vec3.create(0, 1, 0));

        // set basic light position (directional from above)
        const lightPos = vec3.create(0, 100, 0);
        gl.uniform3f(uniforms.uLightPos, lightPos.x, lightPos.y, lightPos.z);

        // camera position for specular
        gl.uniform3f(uniforms.uViewPos, game.camera.x, game.camera.y, game.camera.z);

        // compute light space matrix used for shadow mapping
        const lightView = createLookAtMatrix(lightPos, vec3.create(0,0,0), vec3.create(0,1,0));
        const lightProj = createOrthographicMatrix(-150,150,-150,150,1,200);
        const shadowMatrix = multiplyMatrices(lightProj, lightView);
        gl.uniformMatrix4fv(uniforms.uShadowMatrix, false, shadowMatrix);
        gl.uniform1i(uniforms.uUseShadows, (game.rtxMode && depthExt) ? 1 : 0);
        // ensure standard objects are not textured
        gl.uniform1i(uniforms.uUseTexture, 0);
        // bind shadow texture to unit 1 (if we have one)
        if (game.shadowTexture) {
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, game.shadowTexture);
            gl.uniform1i(uniforms.uShadowMap, 1);
        }

        // When RTX mode is on, render scene to offscreen texture first
        // before we render final scene, update shadow map if RTX mode enabled
        if (game.rtxMode && depthExt) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, game.shadowFramebuffer);
            gl.viewport(0, 0, game.shadowSize, game.shadowSize);
            gl.clear(gl.DEPTH_BUFFER_BIT);
            gl.colorMask(false, false, false, false);

            // draw all geometry to depth only
            drawShadowPass(shadowMatrix);

            gl.colorMask(true, true, true, true);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }

        if (game.rtxMode) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, game.rtxFramebuffer);
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            drawTerrainMesh(viewMatrix, projMatrix);
            drawStructures(viewMatrix, projMatrix);
            game.platforms.forEach(platform => platform.draw(viewMatrix, projMatrix));
            game.collectibles.forEach(moon => moon.draw(viewMatrix, projMatrix));
            if (game.powerSoups) game.powerSoups.forEach(s => s.draw(viewMatrix, projMatrix));
            game.walkers.forEach(w => w.draw(gl, buffers, uniforms, viewMatrix, projMatrix));
            if (game.boss) game.boss.draw(viewMatrix, projMatrix);
            drawJeff(player, gl, buffers, uniforms, viewMatrix, projMatrix, game.recordTexture);

            // Now apply post-process
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            gl.useProgram(postProgram);
            const aPos = gl.getAttribLocation(postProgram, 'aPosition');
            const uScene = gl.getUniformLocation(postProgram, 'uScene');
            const uTime = gl.getUniformLocation(postProgram, 'uTime');
            const uIntensity = gl.getUniformLocation(postProgram, 'uIntensity');
            const uResolution = gl.getUniformLocation(postProgram, 'uResolution');

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, game.rtxColorTexture);
            gl.uniform1i(uScene, 0);
            gl.uniform1f(uTime, performance.now() / 1000);
            gl.uniform1f(uIntensity, 1.0);
            gl.uniform2f(uResolution, canvas.width, canvas.height);

            gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
            gl.enableVertexAttribArray(aPos);
            gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

            gl.disable(gl.DEPTH_TEST);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            gl.enable(gl.DEPTH_TEST);

            // restore main program
            gl.useProgram(program);
        } else {
            // Normal render path
            drawTerrainMesh(viewMatrix, projMatrix);
            drawStructures(viewMatrix, projMatrix);
            game.platforms.forEach(platform => platform.draw(viewMatrix, projMatrix));
            game.collectibles.forEach(moon => moon.draw(viewMatrix, projMatrix));
            if (game.powerSoups) game.powerSoups.forEach(s => s.draw(viewMatrix, projMatrix));
            game.walkers.forEach(w => w.draw(gl, buffers, uniforms, viewMatrix, projMatrix));
            if (game.boss) game.boss.draw(viewMatrix, projMatrix);
            drawJeff(player, gl, buffers, uniforms, viewMatrix, projMatrix, game.recordTexture);
        }
    }

    function gameLoop(timestamp) {
        const deltaTime = timestamp - game.lastTime;
        game.lastTime = timestamp;
        update(deltaTime);
        draw();
        requestAnimationFrame(gameLoop);
    }

    function updateHUD() {
        document.getElementById('moons').textContent = game.moons;
        document.getElementById('totalMoons').textContent = game.totalMoons;
        document.getElementById('kingdom').textContent = kingdomConfigs[game.currentKingdom].name;
        const t = Math.max(0, Math.floor(player.soupTimer));
        const soupEl = document.getElementById('soupTimer');
        if (soupEl) soupEl.textContent = t > 0 ? (t + 's') : '0s';
        // boss health display
        const bossEl = document.getElementById('bossHealth');
        const bossVal = document.getElementById('bossVal');
        if (game.boss && game.boss.phase === 2) {
            bossEl.style.display = 'block';
            bossVal.textContent = game.boss.robotHealth;
        } else {
            bossEl.style.display = 'none';
        }
    }

    function showCredits() {
        if (game.creditsShown) return;
        game.creditsShown = true;
        // overlay message
        const overlay = document.createElement('div');
        overlay.id = 'credits-overlay';
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.background = 'rgba(0,0,0,0.85)';
        overlay.style.color = '#fff';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '200';
        overlay.style.fontSize = '2em';
        overlay.innerHTML = '<div>Thank you for playing!</div><div style="font-size:0.6em;margin-top:20px;">All moons collected</div>';
        document.body.appendChild(overlay);
        // play credit track
        const creditIndex = musicFiles.indexOf(creditTrackName);
        if (creditIndex !== -1) {
            playTrack(creditIndex);
            audio.loop = false;
        }
    }

    function togglePause() {
        game.paused = !game.paused;
        if (game.paused) {
            prevMusicForPause = game.musicIndex;
            const idx = musicFiles.indexOf(pauseTrackName);
            if (idx !== -1) playTrack(idx);
            audio.loop = true;
            const ov = document.createElement('div');
            ov.id = 'pause-overlay';
            ov.style.position = 'absolute';
            ov.style.top = '0';
            ov.style.left = '0';
            ov.style.width = '100%';
            ov.style.height = '100%';
            ov.style.background = 'rgba(0,0,0,0.65)';
            ov.style.display = 'flex';
            ov.style.alignItems = 'center';
            ov.style.justifyContent = 'center';
            ov.style.zIndex = '200';
            ov.style.color = '#fff';
            ov.style.fontSize = '3em';
            ov.textContent = 'PAUSED';
            document.body.appendChild(ov);
        } else {
            const ov = document.getElementById('pause-overlay');
            if (ov) ov.remove();
            if (prevMusicForPause !== undefined) {
                playTrack(prevMusicForPause);
                prevMusicForPause = undefined;
            }
        }
    }

    function showMessage(text, color = '#FFD700') {
        const msg = document.getElementById('message');
        msg.textContent = text;
        msg.style.color = color;
        setTimeout(() => { msg.textContent = ''; }, 2000);
    }


    // begin background music (use specific track for starting kingdom if available)
    const initTrack = kingdomTrack[game.currentKingdom];
    if (initTrack) {
        const idx = musicFiles.indexOf(initTrack);
        if (idx !== -1) playTrack(idx);
        else playRandomBackground();
    } else {
        playRandomBackground();
    }

    showMessage('Welcome to Cap Kingdom!', '#FFD700');
    loadKingdom('cap');
    requestAnimationFrame(gameLoop);
})();
