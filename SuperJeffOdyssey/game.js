import { vec3 } from './vec3.js';
import { createPerspectiveMatrix, createLookAtMatrix, multiplyMatrices, createTranslationMatrix, createScaleMatrix } from './matrix.js';
import { createSphere, createCube } from './geometry.js';
import { createShaderProgram } from './shader.js';
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

    const program = createShaderProgram(gl);
    gl.useProgram(program);

    const uniforms = {
        aPosition: gl.getAttribLocation(program, 'aPosition'),
        aNormal: gl.getAttribLocation(program, 'aNormal'),
        uMVP: gl.getUniformLocation(program, 'uMVP'),
        uModel: gl.getUniformLocation(program, 'uModel'),
        uColor: gl.getUniformLocation(program, 'uColor'),
        uLightPos: gl.getUniformLocation(program, 'uLightPos')
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
        sphereIndexCount: sphereGeometry.indices.length
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

    // Kingdoms (Mario Odyssey style)
    const kingdoms = {
        cap: {
            name: 'Cap Kingdom',
            color: [0.8, 0.8, 0.9],
            groundY: 0,
            moons: 20,
            size: { x: 100, z: 100 },
            structures: [
                { type: 'tower', pos: [20, 0, 20], height: 15 },
                { type: 'tower', pos: [-20, 0, -20], height: 12 },
                { type: 'platform', pos: [0, 10, 30], size: 8 }
            ]
        },
        cascade: {
            name: 'Cascade Kingdom',
            color: [0.6, 0.7, 0.5],
            groundY: 0,
            moons: 25,
            size: { x: 120, z: 120 },
            structures: [
                { type: 'waterfall', pos: [40, 20, 0] },
                { type: 'tower', pos: [-30, 0, 30], height: 20 },
                { type: 'platform', pos: [10, 15, -25], size: 10 }
            ]
        },
        sand: {
            name: 'Sand Kingdom',
            color: [0.9, 0.85, 0.6],
            groundY: 0,
            moons: 30,
            size: { x: 150, z: 150 },
            structures: [
                { type: 'pyramid', pos: [0, 0, 0], height: 25 },
                { type: 'tower', pos: [50, 0, 50], height: 18 },
                { type: 'platform', pos: [-40, 12, 40], size: 12 }
            ]
        }
    };

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
        useGalaxyGravity: false // Mario Odyssey uses standard gravity
    };

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

    function loadKingdom(kingdomKey) {
        const kingdom = kingdoms[kingdomKey];
        game.currentKingdom = kingdomKey;
        game.collectibles = [];
        game.platforms = [];
        game.moons = 0;

        // Show kingdom name
        const nameEl = document.getElementById('kingdom-name');
        nameEl.textContent = kingdom.name;
        nameEl.style.animation = 'none';
        setTimeout(() => nameEl.style.animation = 'fadeOut 3s forwards', 10);

        // Create ground
        game.platforms.push(new Platform(0, -2, 0, kingdom.size.x, 3, kingdom.size.z, kingdom.color));

        // Generate structures
        kingdom.structures.forEach(struct => {
            if (struct.type === 'tower') {
                game.platforms.push(new Platform(struct.pos[0], struct.height/2, struct.pos[2], 5, struct.height, 5, [0.5, 0.3, 0.2]));
                // Moons on top of towers
                game.collectibles.push(new PowerMoon(struct.pos[0], struct.height + 2, struct.pos[2]));
            } else if (struct.type === 'platform') {
                game.platforms.push(new Platform(struct.pos[0], struct.pos[1], struct.pos[2], struct.size, 1, struct.size, [0.4, 0.6, 0.8]));
                game.collectibles.push(new PowerMoon(struct.pos[0], struct.pos[1] + 2, struct.pos[2]));
            } else if (struct.type === 'pyramid') {
                for (let i = 0; i < 5; i++) {
                    const size = (5 - i) * 5;
                    game.platforms.push(new Platform(struct.pos[0], i * 4, struct.pos[2], size, 3, size, [0.8, 0.7, 0.4]));
                }
                game.collectibles.push(new PowerMoon(struct.pos[0], struct.height + 2, struct.pos[2]));
            }
        });

        // Scatter moons around kingdom
        for (let i = game.collectibles.length; i < kingdom.moons; i++) {
            const x = (Math.random() - 0.5) * kingdom.size.x * 0.8;
            const z = (Math.random() - 0.5) * kingdom.size.z * 0.8;
            const y = Math.random() * 10 + 2;
            game.collectibles.push(new PowerMoon(x, y, z));
        }

        game.totalMoons = kingdom.moons;

        // Spawn player
        player.pos = vec3.create(0, 5, 20);
        player.vel = vec3.create(0, 0, 0);
        player.onGround = false;
        player.state = 'idle';

        updateHUD();
    }

    function update(deltaTime) {
        const dt = Math.min(deltaTime / 1000, 0.05);

        // Standard gravity (not galaxy gravity)
        if (!player.onGround) {
            player.vel.y -= 25 * dt; // Standard downward gravity
        }

        // Ground and platform collision
        player.onGround = false;
        
        // Check ground
        if (player.pos.y - player.radius <= 0) {
            player.pos.y = player.radius;
            player.vel.y = Math.max(0, player.vel.y);
            player.onGround = true;
        }

        // Check platforms
        game.platforms.forEach(platform => {
            if (platform.checkCollision(player.pos, player.radius)) {
                const platformTop = platform.pos.y + platform.height / 2;
                if (player.pos.y - player.radius < platformTop + 0.5 && player.vel.y <= 0) {
                    player.pos.y = platformTop + player.radius;
                    player.vel.y = 0;
                    player.onGround = true;
                }
            }
        });

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

        if (player.onGround && player.state !== 'attacking') {
            const camYaw = game.camera.yaw;
            const forward = vec3.create(Math.sin(camYaw), 0, Math.cos(camYaw));
            const right = vec3.create(Math.cos(camYaw), 0, -Math.sin(camYaw));

            const moveSpeed = 25; // INCREASED from 15 to 25
            
            if (wKey) {
                player.vel.x += forward.x * moveSpeed * dt;
                player.vel.z += forward.z * moveSpeed * dt;
            }
            if (sKey) {
                player.vel.x -= forward.x * moveSpeed * dt;
                player.vel.z -= forward.z * moveSpeed * dt;
            }
            if (aKey) {
                player.vel.x -= right.x * moveSpeed * dt;
                player.vel.z -= right.z * moveSpeed * dt;
            }
            if (dKey) {
                player.vel.x += right.x * moveSpeed * dt;
                player.vel.z += right.z * moveSpeed * dt;
            }

            // Set facing direction
            if (player.vel.x !== 0 || player.vel.z !== 0) {
                player.facingDir = vec3.normalize(vec3.create(player.vel.x, 0, player.vel.z));
            }
        }

        // Long Jump - FASTER
        if (shiftKey && spaceKey && !game.spaceWasPressed && player.onGround) {
            player.vel.y = 12;
            if (player.facingDir) {
                player.vel.x += player.facingDir.x * 20; // INCREASED from 15 to 20
                player.vel.z += player.facingDir.z * 20;
            }
            player.state = 'longjump';
            player.stateTimer = 1.0;
        }
        // Regular Jump
        else if (spaceKey && !game.spaceWasPressed && player.onGround) {
            player.vel.y = 15;
            player.state = 'jumping';
        }
        game.spaceWasPressed = spaceKey;

        // Attack
        if (qKey && !game.qWasPressed && player.onGround) {
            player.state = 'attacking';
            player.stateTimer = 0.5;
        }
        game.qWasPressed = qKey;

        // Roll
        if (eKey && !game.eWasPressed && player.onGround) {
            player.vel.y = 10;
            player.state = 'summersault';
            player.stateTimer = 0.8;
            player.rotation = 0;
        }
        game.eWasPressed = eKey;

        // Hair Throw (Cappy mechanic) - F key
        if (fKey && !game.fWasPressed && !player.hairThrown) {
            // Throw hair in facing direction
            player.hairThrown = true;
            player.hairReturn = false;
            player.hairPos = vec3.add(player.pos, vec3.scale(vec3.create(0, 1, 0), 2));
            
            const throwDir = player.facingDir || vec3.create(0, 0, 1);
            player.hairVel = vec3.scale(vec3.normalize(vec3.add(throwDir, vec3.create(0, 0.2, 0))), 25);
            
            showMessage('Hair Throw!', '#FFD700');
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

        // Kingdom switch
        if (kKey && !game.kWasPressed) {
            const kingdomKeys = Object.keys(kingdoms);
            const currentIndex = kingdomKeys.indexOf(game.currentKingdom);
            const nextIndex = (currentIndex + 1) % kingdomKeys.length;
            loadKingdom(kingdomKeys[nextIndex]);
        }
        game.kWasPressed = kKey;

        // Update timers
        if (player.stateTimer > 0) {
            player.stateTimer -= dt;
            if (player.stateTimer <= 0 && (player.state === 'attacking' || player.state === 'longjump' || player.state === 'summersault')) {
                player.state = 'idle';
            }
        }

        if (player.state === 'summersault') {
            player.rotation += dt * 15;
        }

        // Animation states
        const speed = Math.sqrt(player.vel.x ** 2 + player.vel.z ** 2);
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

        // Damping
        player.vel.x *= 0.90;
        player.vel.z *= 0.90;

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
                    updateHUD();
                    showMessage('Power Moon collected!');
                }
            }
        });

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

    function draw() {
        gl.clearColor(0.53, 0.81, 0.92, 1.0); // Sky blue
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);

        const aspect = canvas.width / canvas.height;
        const projMatrix = createPerspectiveMatrix(Math.PI / 3, aspect, 0.1, 500);
        
        const eye = vec3.create(game.camera.x, game.camera.y, game.camera.z);
        const viewMatrix = createLookAtMatrix(eye, player.pos, vec3.create(0, 1, 0));

        gl.uniform3f(uniforms.uLightPos, player.pos.x, player.pos.y + 100, player.pos.z + 50);

        game.platforms.forEach(platform => platform.draw(viewMatrix, projMatrix));
        game.collectibles.forEach(moon => moon.draw(viewMatrix, projMatrix));
        
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
        document.getElementById('moons').textContent = game.moons;
        document.getElementById('totalMoons').textContent = game.totalMoons;
        document.getElementById('kingdom').textContent = kingdoms[game.currentKingdom].name;
    }

    function showMessage(text, color = '#FFD700') {
        const msg = document.getElementById('message');
        msg.textContent = text;
        msg.style.color = color;
        setTimeout(() => { msg.textContent = ''; }, 2000);
    }

    window.addEventListener('keydown', (e) => {
        if (['w','a','s','d','W','A','S','D',' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Shift','q','Q','e','E','f','F','k','K'].includes(e.key)) {
            e.preventDefault();
        }
        game.keys[e.key] = true;
        game.keys[e.code] = true;
    });

    window.addEventListener('keyup', (e) => {
        game.keys[e.key] = false;
        game.keys[e.code] = false;
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

    showMessage('Welcome to Cap Kingdom!', '#FFD700');
    loadKingdom('cap');
    requestAnimationFrame(gameLoop);
})();
