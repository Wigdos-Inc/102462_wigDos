import { engine, vector } from './globals.js';

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
