import { engine, vector } from './globals.js';
import { supportHeightAtXZ } from './libs/engine/engine.js';

export const player = createPlayer();

export function createPlayer() {
    return {
        pos: vector.create(0, 0, 0),
        vel: vector.create(0, 0, 0),
        radius: 1.5, // INCREASED from 0.8
        onGround: false,
        currentPlanet: null,
        walkCycle: 0,
        state: 'idle',
        facingDir: vector.create(0, 0, 1),
        rotation: 0,
        stateTimer: 0,
        attackHitbox: false,
        hairThrown: false, // ADD for hair throw
        hairPos: null, // ADD
        hairVel: null, // ADD
        hairReturn: false, // ADD
        // Power Soup buffs
        speedMultiplier: 1.0,
        jumpMultiplier: 1.0,
        soupTimer: 0,
        // Mario Sunshine movement
        horizontalSpeed: 0,
        targetSpeed: 0,
        moveDir: vector.create(0, 0, 0),
        jumpCount: 0,
        lastJumpTime: 0,
        spinJumping: false,
        diving: false,
        groundPounding: false,
        canDiveJump: false,
        wallSliding: false,
        backflipping: false
    };
}

export function getPlayerInput(keys) {
    return {
        wKey: keys['w'] || keys['W'] || keys['KeyW'] || keys['ArrowUp'],
        sKey: keys['s'] || keys['S'] || keys['KeyS'] || keys['ArrowDown'],
        aKey: keys['a'] || keys['A'] || keys['KeyA'] || keys['ArrowLeft'],
        dKey: keys['d'] || keys['D'] || keys['KeyD'] || keys['ArrowRight'],
        spaceKey: keys[' '] || keys['Space'],
        shiftKey: keys['Shift'] || keys['ShiftLeft'] || keys['ShiftRight'],
        qKey: keys['q'] || keys['Q'],
        eKey: keys['e'] || keys['E'],
        fKey: keys['f'] || keys['F'],
        kKey: keys['k'] || keys['K'],
        rKey: keys['r'] || keys['R'],
        bKey: keys['b'] || keys['B'],
        pKey: keys['p'] || keys['P'] || keys['KeyP']
    };
}

export function updatePlayerMovementAndCollision(game, dt, showMessage = () => {}) {
    const input = getPlayerInput(game.keys || {});

    // Ground and platform collision.
    player.onGround = false;

    if (game.sampleTerrainHeight) {
        const terrainHeight = game.sampleTerrainHeight(player.pos.x, player.pos.z, player.pos.y);
        if (terrainHeight !== null && player.pos.y - player.radius <= terrainHeight) {
            player.pos.y = terrainHeight + player.radius;
            player.vel.y = Math.max(0, player.vel.y);
            player.onGround = true;
        }
    }

    const platTop = supportHeightAtXZ(player.pos.x, player.pos.z, player.pos.y, game.platforms, null);
    if (platTop !== null && player.pos.y - player.radius <= platTop + 0.01) {
        player.pos.y = platTop + player.radius;
        player.vel.y = Math.max(0, player.vel.y);
        player.onGround = true;
    }

    if (!player.onGround) {
        player.vel.y -= 25 * dt;
    }

    const camYaw = game.camera.yaw;
    const forward = vector.create(Math.sin(camYaw), 0, Math.cos(camYaw));
    const right = vector.create(Math.cos(camYaw), 0, -Math.sin(camYaw));
    const maxSpeed = 18 * (player.speedMultiplier || 1.0);
    const acceleration = 60 * (player.speedMultiplier || 1.0);
    const airControl = 35;

    let inputX = 0;
    let inputZ = 0;
    if (input.wKey) { inputX += forward.x; inputZ += forward.z; }
    if (input.sKey) { inputX -= forward.x; inputZ -= forward.z; }
    if (input.aKey) { inputX += right.x; inputZ += right.z; }
    if (input.dKey) { inputX -= right.x; inputZ -= right.z; }

    const inputLength = Math.sqrt(inputX * inputX + inputZ * inputZ);
    if (inputLength > 0.1) {
        inputX /= inputLength;
        inputZ /= inputLength;
        player.moveDir = vector.create(inputX, 0, inputZ);
        player.facingDir = player.moveDir;
    }

    if (player.onGround && player.state !== 'attacking' && !player.diving && !player.canDiveJump) {
        if (inputLength > 0.1) {
            player.vel.x += inputX * acceleration * dt;
            player.vel.z += inputZ * acceleration * dt;

            const currentSpeed = Math.sqrt(player.vel.x * player.vel.x + player.vel.z * player.vel.z);
            if (currentSpeed > maxSpeed) {
                player.vel.x = (player.vel.x / currentSpeed) * maxSpeed;
                player.vel.z = (player.vel.z / currentSpeed) * maxSpeed;
            }
        }
    } else if (!player.onGround && !player.groundPounding && !player.diving) {
        if (inputLength > 0.1) {
            player.vel.x += inputX * airControl * dt;
            player.vel.z += inputZ * airControl * dt;
        }
    }

    if (player.onGround && player.state !== 'jumping') {
        const now = Date.now();
        if (now - player.lastJumpTime > 800) {
            player.jumpCount = 0;
        }
    }

    // Track one-shot jump usage instead of returning early from update.
    let consumedJumpPress = false;

    if (input.shiftKey && input.spaceKey && !game.spaceWasPressed && player.onGround && !player.canDiveJump) {
        const currentSpeed = Math.sqrt(player.vel.x * player.vel.x + player.vel.z * player.vel.z);
        if (currentSpeed > 5) {
            player.vel.y = 12 * (player.jumpMultiplier || 1.0);
            const dir = vector.normalize(vector.create(player.vel.x, 0, player.vel.z));
            player.vel.x = dir.x * 22;
            player.vel.z = dir.z * 22;
            player.state = 'longjump';
            player.stateTimer = 0.6;
            player.jumpCount = 0;
            showMessage('Long Jump!', '#FFD700');
            consumedJumpPress = true;
        }
    }

    if (!consumedJumpPress && input.spaceKey && !game.spaceWasPressed && player.onGround && !player.canDiveJump) {
        const now = Date.now();
        const timeSinceLastJump = now - player.lastJumpTime;
        const currentSpeed = Math.sqrt(player.vel.x * player.vel.x + player.vel.z * player.vel.z);
        const isMovingBack = input.sKey && currentSpeed > 3;

        if (isMovingBack) {
            player.vel.y = 18 * (player.jumpMultiplier || 1.0);
            player.vel.x = player.facingDir.x * -12;
            player.vel.z = player.facingDir.z * -12;
            player.state = 'backflip';
            player.rotation = 0;
            player.jumpCount = 0;
            showMessage('Backflip!', '#00FFFF');
        } else if (timeSinceLastJump < 600 && player.jumpCount < 3) {
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
            player.jumpCount = 1;
            player.vel.y = 13 * (player.jumpMultiplier || 1.0);
            player.state = 'jumping';
        }

        player.lastJumpTime = now;
        player.spinJumping = false;
    }

    if (!consumedJumpPress && input.spaceKey && !game.spaceWasPressed && !player.onGround && !player.spinJumping && player.vel.y > 0) {
        player.vel.y += 8 * (player.jumpMultiplier || 1.0);
        player.spinJumping = true;
        player.state = 'spinjump';
        player.rotation = 0;
        showMessage('Spin Jump!', '#00FFFF');
    }

    if (input.shiftKey && !game.shiftWasPressed && !player.onGround && !player.groundPounding) {
        const horizontalSpeed = Math.sqrt(player.vel.x * player.vel.x + player.vel.z * player.vel.z);
        if (horizontalSpeed < 8) {
            player.vel.y = -30;
            player.vel.x *= 0.3;
            player.vel.z *= 0.3;
            player.groundPounding = true;
            player.state = 'groundpound';
            showMessage('Ground Pound!', '#FF8C00');
        } else {
            player.diving = true;
            player.groundPounding = false;
            player.state = 'dive';
            const diveSpeed = 25;
            const dir = vector.normalize(vector.create(player.vel.x, 0, player.vel.z));
            player.vel.x = dir.x * diveSpeed;
            player.vel.z = dir.z * diveSpeed;
            player.vel.y = -8;
            showMessage('Dive!', '#00CED1');
        }
    }

    if (player.diving && input.spaceKey && !game.spaceWasPressed && player.canDiveJump) {
        player.vel.y = 16 * (player.jumpMultiplier || 1.0);
        player.diving = false;
        player.canDiveJump = false;
        player.state = 'jumping';
        showMessage('Dive Jump!', '#7FFF00');
    }

    game.spaceWasPressed = !!input.spaceKey;
    game.shiftWasPressed = !!input.shiftKey;

    if (player.stateTimer > 0) {
        player.stateTimer -= dt;
        if (player.stateTimer <= 0 && (player.state === 'attacking' || player.state === 'longjump' || player.state === 'summersault')) {
            player.state = 'idle';
        }
    }

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
    } else if (!player.diving) {
        player.canDiveJump = false;
    }

    if (player.state === 'summersault' || player.state === 'spinjump') {
        player.rotation += dt * 15;
    }
    if (player.state === 'backflip') {
        player.rotation += dt * 8;
    }

    const speed = Math.sqrt(player.vel.x ** 2 + player.vel.z ** 2);
    if (player.state === 'longjump' || player.state === 'summersault' || player.state === 'attacking' ||
        player.state === 'dive' || player.state === 'groundpound' || player.state === 'spinjump' || player.state === 'backflip') {
        // Preserve active special states.
    } else if (!player.onGround) {
        player.state = 'jumping';
    } else if (speed > 1) {
        player.state = 'running';
        player.walkCycle += dt * 10;
    } else {
        player.state = 'idle';
        player.diving = false;
    }

    if (player.onGround) {
        player.vel.x *= 0.88;
        player.vel.z *= 0.88;
        if (inputLength <= 0.1 && Math.abs(player.vel.x) < 0.08) player.vel.x = 0;
        if (inputLength <= 0.1 && Math.abs(player.vel.z) < 0.08) player.vel.z = 0;
    } else {
        player.vel.x *= 0.97;
        player.vel.z *= 0.97;
    }

    player.pos.x += player.vel.x * dt;
    player.pos.y += player.vel.y * dt;
    player.pos.z += player.vel.z * dt;

    return input;
}

export function drawJeff(player) {
    let bob = 0;
    let armSwing = 0;
    let legSwing = 0;
    let stretch = 1.0;
    let armSpread = 0;
    let bodyRotation = 0;
    
    if (player.state === 'idle') {
        bob = Math.sin(Date.now() * 0.002) * 0.05;
    } else if (player.state === 'running') {
        bob = Math.sin(player.walkCycle) * 0.2;
        armSwing = Math.sin(player.walkCycle) * 0.5;
        legSwing = Math.sin(player.walkCycle + Math.PI) * 0.4;
    } else if (player.state === 'jumping') {
        bob = 0.15;
        stretch = 1.2;
        armSwing = -0.4;
    } else if (player.state === 'longjump') {
        bob = 0.2;
        stretch = 1.3;
        armSwing = -0.8;
        legSwing = 0.3;
        armSpread = 0.2;
    } else if (player.state === 'attacking') {
        bob = 0.05;
        const attackProgress = 1 - (player.stateTimer / 0.5);
        armSwing = Math.sin(attackProgress * Math.PI) * 1.2;
        armSpread = 0.3;
    } else if (player.state === 'summersault') {
        bodyRotation = player.rotation;
        bob = 0.2;
        armSwing = 0;
        legSwing = Math.sin(player.rotation * 2) * 0.5;
        armSpread = 0.4;
    } else if (player.state === 'dive') {
        stretch = 1.4;
        armSwing = -0.9;
        armSpread = 0.5;
        legSwing = 0.6;
    } else if (player.state === 'groundpound') {
        stretch = 0.7;
        armSwing = 0;
        armSpread = 0.8;
        legSwing = 0;
    } else if (player.state === 'spinjump') {
        bodyRotation = player.rotation;
        bob = 0.25;
        armSpread = 0.6;
        stretch = 1.1;
    } else if (player.state === 'backflip') {
        bodyRotation = -player.rotation * 0.5;
        stretch = 1.2;
        armSwing = -0.5;
        legSwing = 0.4;
    }
    
    // Use standard up direction for Odyssey (not planet-based)
    let up = vector.create(0, 1, 0);
    
    let forward = player.facingDir || vector.create(0, 0, 1);
    const forwardDotUp = vector.dot(forward, up);
    forward = vector.normalize(vector.sub(forward, vector.scale(up, forwardDotUp)));
    const right = vector.normalize(vector.cross(up, forward));
    forward = vector.normalize(vector.cross(right, up));

    // Apply body rotation for summersault
    let bodyUp = up;
    let bodyForward = forward;
    if (bodyRotation !== 0) {
        const cos = Math.cos(bodyRotation);
        const sin = Math.sin(bodyRotation);
        bodyUp = vector.normalize(vector.add(
            vector.scale(up, cos),
            vector.scale(forward, sin)
        ));
        bodyForward = vector.normalize(vector.add(
            vector.scale(forward, cos),
            vector.scale(up, -sin)
        ));
    }
    
    // Head - BIGGER
    const headPos = vector.add(player.pos, vector.scale(bodyUp, (0.6 + bob) * 2.0));
    // head as ellipsoid – use createMesh directly because we need non-uniform scale
    engine.drawCylinder(headPos.x, headPos.y, headPos.z, 0.25 * 2.0, 0.6 * stretch * 2.0, {x: 0.95, y: 0.85, z: 0.2});

    // Hair antenna - only draw if not thrown
    if (!player.hairThrown) {
        const hairPos = vector.add(headPos, vector.scale(bodyUp, 0.3 * 2.0));
        engine.drawCube(hairPos.x, hairPos.y, hairPos.z,
            0.03 * 2.0, 0.2 * 2.0, 0.03 * 2.0, {x: 0.1, y: 0.1, z: 0.1});
    }

    // Body - BIGGER
    const bodyPos = vector.add(player.pos, vector.scale(bodyUp, (0.15 + bob) * 2.0));
    engine.drawCube(bodyPos.x, bodyPos.y, bodyPos.z,
        0.3 * 2.0, 0.4 * stretch * 2.0, 0.2 * 2.0, {x: 0.15, y: 0.35, z: 0.85});

    // Arms - BIGGER
    const lArmPos = vector.add(bodyPos, vector.add(
        vector.scale(right, (-0.35 - armSpread) * 2.0), 
        vector.add(
            vector.scale(bodyForward, armSwing * 0.15 * 2.0),
            vector.scale(bodyUp, (player.state === 'attacking' ? 0.2 : 0) * 2.0)
        )
    ));
    engine.drawCube(lArmPos.x, lArmPos.y, lArmPos.z,
        0.1 * 2.0, 0.35 * 2.0, 0.1 * 2.0, {x: 0.15, y: 0.35, z: 0.85});
    
    const rArmPos = vector.add(bodyPos, vector.add(
        vector.scale(right, (0.35 + armSpread) * 2.0), 
        vector.add(
            vector.scale(bodyForward, (player.state === 'attacking' ? 0.5 : -armSwing * 0.15) * 2.0),
            vector.scale(bodyUp, (player.state === 'attacking' ? 0.2 : 0) * 2.0)
        )
    ));
    engine.drawCube(rArmPos.x, rArmPos.y, rArmPos.z,
        0.1 * 2.0, 0.35 * 2.0, 0.1 * 2.0, {x: 0.15, y: 0.35, z: 0.85});

    // Attack effect - BIGGER
    if (player.state === 'attacking' && player.stateTimer > 0.3) {
        const punchPos = vector.add(rArmPos, vector.scale(bodyForward, 0.3 * 2.0));
        // attack effect sphere (uniform scaling)
        engine.drawSphere(punchPos.x, punchPos.y, punchPos.z, 0.15 * 2.0, {x: 1, y: 1, z: 0});
    }

    // Legs - BIGGER
    const lLegPos = vector.add(player.pos, vector.add(
        vector.scale(right, -0.12 * 2.0), 
        vector.add(vector.scale(bodyUp, -0.2 * 2.0), vector.scale(bodyForward, legSwing * 0.2 * 2.0))
    ));
    engine.drawCube(lLegPos.x, lLegPos.y, lLegPos.z,
        0.12 * 2.0, 0.35 * 2.0, 0.12 * 2.0, {x: 0.1, y: 0.2, z: 0.6});
    
    const rLegPos = vector.add(player.pos, vector.add(
        vector.scale(right, 0.12 * 2.0), 
        vector.add(vector.scale(bodyUp, -0.2 * 2.0), vector.scale(bodyForward, -legSwing * 0.2 * 2.0))
    ));
    engine.drawCube(rLegPos.x, rLegPos.y, rLegPos.z,
        0.12 * 2.0, 0.35 * 2.0, 0.12 * 2.0, {x: 0.1, y: 0.2, z: 0.6});

    // Eyes - BIGGER
    const lEyePos = vector.add(headPos, vector.add(
        vector.scale(right, -0.09 * 2.0), 
        vector.add(vector.scale(bodyUp, 0.06 * 2.0), vector.scale(bodyForward, 0.22 * 2.0))
    ));
    // left eye
    engine.drawSphere(lEyePos.x, lEyePos.y, lEyePos.z, 0.07 * 2.0, {x: 1, y: 1, z: 1});
    
    // move pupil out slightly further so it sits in front of the eye surface
    const lPupil = vector.add(lEyePos, vector.scale(bodyForward, 0.08));
    // left pupil as flattened ellipsoid (wider and larger)
    engine.drawCylinder(lPupil.x, lPupil.y, lPupil.z, 0.07, 0.2, {x: 0, y: 0, z: 0});

    const rEyePos = vector.add(headPos, vector.add(
        vector.scale(right, 0.09 * 2.0), 
        vector.add(vector.scale(bodyUp, 0.06 * 2.0), vector.scale(bodyForward, 0.22 * 2.0))
    ));
    // right eye
    engine.drawSphere(rEyePos.x, rEyePos.y, rEyePos.z, 0.07 * 2.0, {x: 1, y: 1, z: 1});
    
    const rPupil = vector.add(rEyePos, vector.scale(bodyForward, 0.08));
    // right pupil
    engine.drawCylinder(rPupil.x, rPupil.y, rPupil.z, 0.07, 0.2, {x: 0, y: 0, z: 0});

    // Nose - BIGGER
    const nosePos = vector.add(headPos, vector.add(
        vector.scale(bodyUp, -0.02 * 2.0), 
        vector.scale(bodyForward, 0.24 * 2.0)
    ));
    engine.drawSphere(nosePos.x, nosePos.y, nosePos.z, 0.04 * 2.0, {x: 0.9, y: 0.8, z: 0.18});

    // Mouth - BIGGER
    const mouthY = player.state === 'attacking' ? -0.10 : -0.12;
    const mouthPos = vector.add(headPos, vector.add(
        vector.scale(bodyUp, mouthY * 2.0), 
        vector.scale(bodyForward, 0.22 * 2.0)
    ));
    // render mouth as a flattened box for wider expression
    engine.drawCube(mouthPos.x, mouthPos.y, mouthPos.z,
        0.3, 0.02, 0.05, {x: 0.2, y: 0.1, z: 0.1});

    // Draw thrown hair (cappy mechanic)
    if (player.hairThrown && player.hairPos) {
        const hairRotation = Date.now() * 0.01;
        const hairScale = 0.15 * 2.0;
        
        // Draw spinning hair antenna
        engine.drawCube(player.hairPos.x, player.hairPos.y, player.hairPos.z,
            hairScale, hairScale * 4, hairScale, {x: 0.1, y: 0.1, z: 0.1});
        
        // Draw trail effect
        for (let i = 1; i <= 3; i++) {
            const trailPos = vector.add(player.hairPos, vector.scale(player.hairVel, -i * 0.1));
            const alpha = 1 - (i * 0.3);
            engine.drawCube(trailPos.x, trailPos.y, trailPos.z,
                hairScale * 0.8, hairScale * 3, hairScale * 0.8, {x: 0.1 * alpha, y: 0.1 * alpha, z: 0.1 * alpha});
        }
    }
}
