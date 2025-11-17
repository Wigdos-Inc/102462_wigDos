import { vec3 } from './vec3.js';
import { createPerspectiveMatrix, createLookAtMatrix, multiplyMatrices, createTranslationMatrix, createScaleMatrix } from './matrix.js';
import { createSphere, createCube } from './geometry.js';
import { createShaderProgram } from './shader.js';
import { Planet, Star, Enemy } from './entities.js';
import { createPlayer, drawJeff } from './player.js';

(function() {
    'use strict';

    const canvas = document.getElementById('gameCanvas');
    const gl = canvas.getContext('webgl');
    
    if (!gl) {
        alert('WebGL not supported!');
        return;
    }

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize shader program
    const program = createShaderProgram(gl);
    gl.useProgram(program);

    // Get uniforms
    const uniforms = {
        aPosition: gl.getAttribLocation(program, 'aPosition'),
        aNormal: gl.getAttribLocation(program, 'aNormal'),
        uMVP: gl.getUniformLocation(program, 'uMVP'),
        uModel: gl.getUniformLocation(program, 'uModel'),
        uColor: gl.getUniformLocation(program, 'uColor'),
        uLightPos: gl.getUniformLocation(program, 'uLightPos')
    };

    // Create geometry
    const sphereGeometry = createSphere(1, 16);
    const cubeGeometry = createCube();
    
    // Create buffers
    const buffers = {
        positionBuffer: gl.createBuffer(),
        normalBuffer: gl.createBuffer(),
        indexBuffer: gl.createBuffer(),
        cubePositionBuffer: gl.createBuffer(),
        cubeNormalBuffer: gl.createBuffer(),
        cubeIndexBuffer: gl.createBuffer(),
        sphereIndexCount: sphereGeometry.indices.length
    };

    // Fill buffers
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

    // Game state
    const game = {
        currentLevel: 1,
        stars: 0,
        totalStars: 0,
        planets: [],
        collectibles: [],
        enemies: [],
        keys: {},
        camera: { x: 0, y: 10, z: 20, pitch: 0, yaw: 0, distance: 10, zoom: 1.0 },
        lastTime: 0,
        spaceWasPressed: false,
        shiftWasPressed: false, // ADD
        qWasPressed: false, // ADD for attack
        eWasPressed: false // ADD for summersault
    };

    const player = createPlayer();

    function generateLevel(levelNum) {
        game.planets = [];
        game.collectibles = [];
        game.enemies = [];
        game.currentLevel = levelNum;

        const numPlanets = 2 + levelNum;
        const starsPerPlanet = 20 + levelNum * 10;
        const numEnemies = levelNum * 3;

        for (let i = 0; i < numPlanets; i++) {
            const angle = (Math.PI * 2 * i) / numPlanets;
            const dist = 50 + i * 30;
            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist;
            const y = (Math.random() - 0.5) * 10;
            const radius = 15 + Math.random() * 10;
            const mass = radius * 3;
            game.planets.push(new Planet(x, y, z, radius, mass));
        }

        game.planets.forEach(planet => {
            for (let i = 0; i < starsPerPlanet; i++) {
                const theta = (Math.PI * 2 * i) / starsPerPlanet;
                const phi = Math.acos(2 * Math.random() - 1);
                const dist = planet.radius + 2 + Math.random() * 3;
                const x = planet.pos.x + dist * Math.sin(phi) * Math.cos(theta);
                const y = planet.pos.y + dist * Math.sin(phi) * Math.sin(theta);
                const z = planet.pos.z + dist * Math.cos(phi);
                game.collectibles.push(new Star(x, y, z));
            }
        });

        for (let i = 0; i < numEnemies; i++) {
            const planet = game.planets[Math.floor(Math.random() * game.planets.length)];
            game.enemies.push(new Enemy(planet));
        }

        game.totalStars = game.collectibles.length;
        game.stars = 0;

        if (game.planets.length > 0) {
            const firstPlanet = game.planets[0];
            player.pos = vec3.create(
                firstPlanet.pos.x,
                firstPlanet.pos.y + firstPlanet.radius + 2,
                firstPlanet.pos.z
            );
            player.vel = vec3.create(0, 0, 0);
            player.walkCycle = 0;
            player.state = 'idle';
        }

        updateHUD();
    }

    function update(deltaTime) {
        const dt = Math.min(deltaTime / 1000, 0.05);

        // Find closest planet and apply gravity - BALANCED
        let closestPlanet = null;
        let minDist = Infinity;
        let totalGravity = vec3.create(0, 0, 0);

        game.planets.forEach(planet => {
            const gravity = planet.getGravityAt(player.pos);
            totalGravity = vec3.add(totalGravity, gravity.force);
            
            if (gravity.dist < minDist) {
                minDist = gravity.dist;
                closestPlanet = planet;
            }
        });

        // Apply gravity - REDUCED for better jumping
        player.vel = vec3.add(player.vel, vec3.scale(totalGravity, dt * 3.0)); // REDUCED from 4.5 to 3.0

        // Ground collision
        player.onGround = false;
        if (closestPlanet) {
            const dirToPlanet = vec3.sub(closestPlanet.pos, player.pos);
            const distToPlanet = vec3.length(dirToPlanet);
            const distToSurface = distToPlanet - closestPlanet.radius;
            
            if (distToSurface <= player.radius) {
                const normal = vec3.normalize(dirToPlanet);
                player.pos = vec3.add(
                    closestPlanet.pos,
                    vec3.scale(normal, -(closestPlanet.radius + player.radius))
                );
                
                const velIntoSurface = vec3.dot(player.vel, normal);
                if (velIntoSurface < 0) {
                    player.vel = vec3.sub(player.vel, vec3.scale(normal, velIntoSurface));
                }
                
                player.onGround = true;
                player.currentPlanet = closestPlanet;
            }
        }

        // Movement - INCREASED SPEED
        const wKey = game.keys['w'] || game.keys['W'] || game.keys['KeyW'] || game.keys['ArrowUp'];
        const sKey = game.keys['s'] || game.keys['S'] || game.keys['KeyS'] || game.keys['ArrowDown'];
        const aKey = game.keys['a'] || game.keys['A'] || game.keys['KeyA'] || game.keys['ArrowLeft'];
        const dKey = game.keys['d'] || game.keys['D'] || game.keys['KeyD'] || game.keys['ArrowRight'];
        const spaceKey = game.keys[' '] || game.keys['Space'];
        const shiftKey = game.keys['Shift'] || game.keys['ShiftLeft'] || game.keys['ShiftRight'];
        const qKey = game.keys['q'] || game.keys['Q'] || game.keys['KeyQ'];
        const eKey = game.keys['e'] || game.keys['E'] || game.keys['KeyE'];

        if (player.onGround && player.currentPlanet && 
            player.state !== 'attacking' && player.state !== 'longjump' && player.state !== 'summersault') {
            const up = vec3.normalize(vec3.sub(player.pos, player.currentPlanet.pos));
            
            // Camera-relative movement directions
            const camYaw = game.camera.yaw;
            const camForward = vec3.create(Math.sin(camYaw), 0, Math.cos(camYaw));
            const camRight = vec3.create(Math.cos(camYaw), 0, -Math.sin(camYaw));
            
            // Project camera directions onto planet surface
            const camForwardDotUp = vec3.dot(camForward, up);
            const forward = vec3.normalize(vec3.sub(camForward, vec3.scale(up, camForwardDotUp)));
            
            const camRightDotUp = vec3.dot(camRight, up);
            const right = vec3.normalize(vec3.sub(camRight, vec3.scale(up, camRightDotUp)));

            const moveForce = 45; // INCREASED from 35 to 45
            
            let moveDir = vec3.create(0, 0, 0);
            
            if (wKey) {
                moveDir = vec3.add(moveDir, forward);
            }
            if (sKey) {
                moveDir = vec3.sub(moveDir, forward);
            }
            if (aKey) {
                moveDir = vec3.sub(moveDir, right);
            }
            if (dKey) {
                moveDir = vec3.add(moveDir, right);
            }
            
            if (vec3.length(moveDir) > 0) {
                moveDir = vec3.normalize(moveDir);
                player.vel = vec3.add(player.vel, vec3.scale(moveDir, moveForce * dt));
                player.facingDir = moveDir;
            }
        }

        // Long Jump - Shift + Space while moving - FIXED
        if (shiftKey && spaceKey && !game.spaceWasPressed && player.onGround && 
            player.currentPlanet && vec3.length(player.vel) > 2) {
            const jumpDir = vec3.normalize(vec3.sub(player.pos, player.currentPlanet.pos));
            const forwardBoost = player.facingDir || vec3.create(0, 0, 1);
            
            // Jump up and forward
            player.vel = vec3.add(player.vel, vec3.scale(jumpDir, 8)); // INCREASED from 5 to 8
            player.vel = vec3.add(player.vel, vec3.scale(forwardBoost, 12)); // INCREASED from 10 to 12
            player.onGround = false;
            player.state = 'longjump';
            player.stateTimer = 1.0;
            console.log('LONG JUMP!');
        }
        // Regular Jump - INCREASED
        else if (spaceKey && !game.spaceWasPressed && player.onGround && player.currentPlanet &&
                 player.state !== 'attacking') {
            const jumpDir = vec3.normalize(vec3.sub(player.pos, player.currentPlanet.pos));
            player.vel = vec3.add(player.vel, vec3.scale(jumpDir, 10)); // INCREASED from 7 to 10
            player.onGround = false;
            player.state = 'jumping';
            console.log('JUMP!');
        }
        game.spaceWasPressed = spaceKey;
        game.shiftWasPressed = shiftKey;

        // Attack - Q key - FIXED
        if (qKey && !game.qWasPressed && player.onGround && 
            player.state !== 'attacking' && player.state !== 'longjump' && player.state !== 'summersault') {
            player.state = 'attacking';
            player.stateTimer = 0.5;
            player.attackHitbox = true;
            console.log('ATTACK!');
        }
        game.qWasPressed = qKey;

        // Summersault - E key while moving - INCREASED
        if (eKey && !game.eWasPressed && player.onGround && vec3.length(player.vel) > 1 &&
            player.state !== 'attacking' && player.state !== 'longjump') {
            const jumpDir = vec3.normalize(vec3.sub(player.pos, player.currentPlanet.pos));
            player.vel = vec3.add(player.vel, vec3.scale(jumpDir, 11)); // INCREASED from 8 to 11
            player.onGround = false;
            player.state = 'summersault';
            player.stateTimer = 0.8;
            player.rotation = 0;
            console.log('SUMMERSAULT!');
        }
        game.eWasPressed = eKey;

        // Update state timer
        if (player.stateTimer > 0) {
            player.stateTimer -= dt;
            if (player.stateTimer <= 0) {
                player.attackHitbox = false;
                if (player.state === 'attacking') {
                    player.state = 'idle';
                }
                if (player.state === 'longjump' && player.onGround) {
                    player.state = 'idle';
                }
                if (player.state === 'summersault' && player.onGround) {
                    player.state = 'idle';
                }
            }
        }

        // Update animation state
        const speed = vec3.length(player.vel);
        if (player.state === 'longjump' || player.state === 'summersault' || player.state === 'attacking') {
            // Keep special state
        } else if (!player.onGround) {
            player.state = 'jumping';
        } else if (speed > 1) {
            player.state = 'running';
            player.walkCycle += dt * 10;
        } else {
            player.state = 'idle';
        }

        // Rotation for summersault
        if (player.state === 'summersault') {
            player.rotation += dt * 15;
        }

        // Damping - LESS AGGRESSIVE
        if (player.onGround) {
            player.vel = vec3.scale(player.vel, 0.88); // REDUCED from 0.85 to 0.88
        } else {
            player.vel = vec3.scale(player.vel, 0.99); // REDUCED from 0.98 to 0.99
        }

        // Update position
        player.pos = vec3.add(player.pos, vec3.scale(player.vel, dt));

        // Check attack hit on enemies
        if (player.attackHitbox) {
            game.enemies.forEach((enemy, index) => {
                const dist = vec3.length(vec3.sub(player.pos, enemy.pos));
                if (dist < player.radius + enemy.radius + 0.5) {
                    // Defeat enemy
                    game.enemies.splice(index, 1);
                    game.stars += 10;
                    updateHUD();
                    showMessage('Enemy defeated! +10 stars', '#00ff00');
                    player.attackHitbox = false; // Only hit once per attack
                }
            });
        }

        // Star collection
        game.collectibles.forEach(star => {
            if (!star.collected) {
                const dist = vec3.length(vec3.sub(player.pos, star.pos));
                if (dist < player.radius + star.radius) {
                    star.collected = true;
                    game.stars++;
                    updateHUD();
                    showMessage('Star collected!');
                }
            }
        });

        // Enemy collision
        game.enemies.forEach(enemy => {
            const dist = vec3.length(vec3.sub(player.pos, enemy.pos));
            if (dist < player.radius + enemy.radius) {
                game.stars = Math.max(0, game.stars - 5);
                updateHUD();
                showMessage('Hit by enemy! Lost 5 stars!', 'red');
            }
        });

        // Camera - FIXED to follow player orientation
        const camDist = game.camera.distance / game.camera.zoom;
        const camHeight = 5 / game.camera.zoom;
        
        // Get player's up direction relative to planet
        let playerUp = vec3.create(0, 1, 0);
        if (player.currentPlanet) {
            playerUp = vec3.normalize(vec3.sub(player.pos, player.currentPlanet.pos));
        }
        
        // Calculate camera position based on player's up direction
        const camYaw = game.camera.yaw;
        const camRight = vec3.create(Math.cos(camYaw), 0, -Math.sin(camYaw));
        const camForward = vec3.create(Math.sin(camYaw), 0, Math.cos(camYaw));
        
        // Project camera direction onto plane perpendicular to player's up
        const camForwardDotUp = vec3.dot(camForward, playerUp);
        const camForwardProjected = vec3.normalize(vec3.sub(camForward, vec3.scale(playerUp, camForwardDotUp)));
        
        // Camera position: behind and above player
        const camOffset = vec3.add(
            vec3.scale(camForwardProjected, -camDist),
            vec3.scale(playerUp, camHeight)
        );
        const targetCamPos = vec3.add(player.pos, camOffset);
        
        // Smooth camera movement
        game.camera.x += (targetCamPos.x - game.camera.x) * 0.15;
        game.camera.y += (targetCamPos.y - game.camera.y) * 0.15;
        game.camera.z += (targetCamPos.z - game.camera.z) * 0.15;
    }

    function draw() {
        gl.clearColor(0.05, 0.05, 0.1, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);

        const aspect = canvas.width / canvas.height;
        const projMatrix = createPerspectiveMatrix(Math.PI / 3, aspect, 0.1, 500);
        
        // Calculate proper up vector for camera
        let cameraUp = vec3.create(0, 1, 0);
        if (player.currentPlanet) {
            cameraUp = vec3.normalize(vec3.sub(player.pos, player.currentPlanet.pos));
        }
        
        const eye = vec3.create(game.camera.x, game.camera.y, game.camera.z);
        const viewMatrix = createLookAtMatrix(eye, player.pos, cameraUp); // Use player's up vector

        gl.uniform3f(uniforms.uLightPos, player.pos.x, player.pos.y + 50, player.pos.z);

        game.planets.forEach(planet => planet.draw(gl, buffers, uniforms, viewMatrix, projMatrix));
        game.collectibles.forEach(star => star.draw(gl, buffers, uniforms, viewMatrix, projMatrix));
        game.enemies.forEach(enemy => enemy.draw(gl, buffers, uniforms, viewMatrix, projMatrix));
        
        drawJeff(player, gl, buffers, uniforms, viewMatrix, projMatrix);
    }

    function gameLoop(timestamp) {
        const deltaTime = timestamp - game.lastTime;
        game.lastTime = timestamp;
        update(deltaTime);
        draw();
        requestAnimationFrame(gameLoop);
    }

    function updateHUD() {
        document.getElementById('stars').textContent = game.stars;
        document.getElementById('totalStars').textContent = game.totalStars;
        document.getElementById('level').textContent = game.currentLevel;
    }

    function showMessage(text, color = '#ffcc00') {
        const msg = document.getElementById('message');
        msg.textContent = text;
        msg.style.color = color;
        setTimeout(() => { msg.textContent = ''; }, 2000);
    }

    // FIX: Use both keydown and keypress events for better compatibility
    window.addEventListener('keydown', (e) => {
        // Prevent default for game keys
        if (['w','a','s','d','W','A','S','D',' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Shift','q','Q','e','E'].includes(e.key)) {
            e.preventDefault();
        }
        
        game.keys[e.key] = true;
        game.keys[e.code] = true;
        
        console.log('Key DOWN:', e.key, e.code, 'Keys active:', Object.keys(game.keys).filter(k => game.keys[k]).join(', '));
        
        if (e.key === 'r' || e.key === 'R') generateLevel(game.currentLevel);
        if (e.key === '1') generateLevel(1);
        if (e.key === '2') generateLevel(2);
        if (e.key === '3') generateLevel(3);
    });

    window.addEventListener('keyup', (e) => {
        game.keys[e.key] = false;
        game.keys[e.code] = false;
        console.log('Key UP:', e.key);
    });

    canvas.setAttribute('tabindex', '0');
    canvas.focus();

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        game.camera.zoom += e.deltaY * -0.001;
        game.camera.zoom = Math.max(0.5, Math.min(3.0, game.camera.zoom));
    });

    document.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement === canvas) {
            game.camera.yaw -= e.movementX * 0.003;
        }
    });

    canvas.addEventListener('click', () => {
        canvas.requestPointerLock();
        canvas.focus();
    });

    // Show a message to click to start
    showMessage('Click and use WASD + Space to play!', '#00ff00');

    generateLevel(1);
    requestAnimationFrame(gameLoop);
})();
