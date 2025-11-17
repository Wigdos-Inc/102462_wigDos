import { vec3 } from './vec3.js';
import { multiplyMatrices, createTranslationMatrix, createScaleMatrix } from './matrix.js';

export function createPlayer() {
    return {
        pos: vec3.create(0, 0, 0),
        vel: vec3.create(0, 0, 0),
        radius: 0.8,
        onGround: false,
        currentPlanet: null,
        walkCycle: 0,
        state: 'idle',
        facingDir: vec3.create(0, 0, 1),
        rotation: 0, // ADD for summersault
        stateTimer: 0, // ADD for timed states
        attackHitbox: false // ADD for attack
    };
}

export function drawJeff(player, gl, buffers, uniforms, viewMatrix, projMatrix) {
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
        // Long jump pose - Superman style
        bob = 0.2;
        stretch = 1.3;
        armSwing = -0.8; // Arms extended forward
        legSwing = 0.3; // Legs back
        armSpread = 0.2; // Arms spread slightly
    } else if (player.state === 'attacking') {
        // Punch animation
        bob = 0.05;
        const attackProgress = 1 - (player.stateTimer / 0.5);
        armSwing = Math.sin(attackProgress * Math.PI) * 1.2; // Rapid punch
        armSpread = 0.3;
    } else if (player.state === 'summersault') {
        // Spinning flip
        bodyRotation = player.rotation;
        bob = 0.2;
        armSwing = 0;
        legSwing = Math.sin(player.rotation * 2) * 0.5;
        armSpread = 0.4; // Arms out for spin
    }
    
    // Calculate proper orientation
    let up = vec3.create(0, 1, 0);
    if (player.currentPlanet) {
        up = vec3.normalize(vec3.sub(player.pos, player.currentPlanet.pos));
    }
    
    // Calculate right and forward based on facing direction
    let forward = player.facingDir || vec3.create(0, 0, 1);
    
    // Make sure forward is perpendicular to up
    const forwardDotUp = vec3.dot(forward, up);
    forward = vec3.normalize(vec3.sub(forward, vec3.scale(up, forwardDotUp)));
    
    // Calculate right vector
    const right = vec3.normalize(vec3.cross(up, forward));
    
    // Recalculate forward to ensure orthogonality
    forward = vec3.normalize(vec3.cross(right, up));
    
    // Apply body rotation for summersault
    let bodyUp = up;
    let bodyForward = forward;
    if (bodyRotation !== 0) {
        // Rotate body around right axis
        const cos = Math.cos(bodyRotation);
        const sin = Math.sin(bodyRotation);
        bodyUp = vec3.normalize(vec3.add(
            vec3.scale(up, cos),
            vec3.scale(forward, sin)
        ));
        bodyForward = vec3.normalize(vec3.add(
            vec3.scale(forward, cos),
            vec3.scale(up, -sin)
        ));
    }
    
    // Head
    const headPos = vec3.add(player.pos, vec3.scale(bodyUp, 0.6 + bob));
    drawSphere(gl, buffers, uniforms, viewMatrix, projMatrix, headPos, 
        0.25, 0.3 * stretch, 0.25, [0.95, 0.85, 0.2]);

    // Hair
    const hairPos = vec3.add(headPos, vec3.scale(bodyUp, 0.3));
    drawCube(gl, buffers, uniforms, viewMatrix, projMatrix, hairPos,
        0.03, 0.2, 0.03, [0.1, 0.1, 0.1]);

    // Body
    const bodyPos = vec3.add(player.pos, vec3.scale(bodyUp, 0.15 + bob));
    drawCube(gl, buffers, uniforms, viewMatrix, projMatrix, bodyPos,
        0.3, 0.4 * stretch, 0.2, [0.15, 0.35, 0.85]);

    // Arms with state-specific positions
    const lArmPos = vec3.add(bodyPos, vec3.add(
        vec3.scale(right, -0.35 - armSpread), 
        vec3.add(
            vec3.scale(bodyForward, armSwing * 0.15),
            vec3.scale(bodyUp, player.state === 'attacking' ? 0.2 : 0)
        )
    ));
    drawCube(gl, buffers, uniforms, viewMatrix, projMatrix, lArmPos,
        0.1, 0.35, 0.1, [0.15, 0.35, 0.85]);
    
    const rArmPos = vec3.add(bodyPos, vec3.add(
        vec3.scale(right, 0.35 + armSpread), 
        vec3.add(
            vec3.scale(bodyForward, player.state === 'attacking' ? 0.5 : -armSwing * 0.15),
            vec3.scale(bodyUp, player.state === 'attacking' ? 0.2 : 0)
        )
    ));
    drawCube(gl, buffers, uniforms, viewMatrix, projMatrix, rArmPos,
        0.1, 0.35, 0.1, [0.15, 0.35, 0.85]);

    // Attack effect
    if (player.state === 'attacking' && player.stateTimer > 0.3) {
        const punchPos = vec3.add(rArmPos, vec3.scale(bodyForward, 0.3));
        drawSphere(gl, buffers, uniforms, viewMatrix, projMatrix, punchPos,
            0.15, 0.15, 0.15, [1, 1, 0]); // Yellow impact
    }

    // Legs
    const lLegPos = vec3.add(player.pos, vec3.add(
        vec3.scale(right, -0.12), 
        vec3.add(vec3.scale(bodyUp, -0.2), vec3.scale(bodyForward, legSwing * 0.2))
    ));
    drawCube(gl, buffers, uniforms, viewMatrix, projMatrix, lLegPos,
        0.12, 0.35, 0.12, [0.1, 0.2, 0.6]);
    
    const rLegPos = vec3.add(player.pos, vec3.add(
        vec3.scale(right, 0.12), 
        vec3.add(vec3.scale(bodyUp, -0.2), vec3.scale(bodyForward, -legSwing * 0.2))
    ));
    drawCube(gl, buffers, uniforms, viewMatrix, projMatrix, rLegPos,
        0.12, 0.35, 0.12, [0.1, 0.2, 0.6]);

    // Eyes
    const lEyePos = vec3.add(headPos, vec3.add(
        vec3.scale(right, -0.09), 
        vec3.add(vec3.scale(bodyUp, 0.06), vec3.scale(bodyForward, 0.22))
    ));
    drawSphere(gl, buffers, uniforms, viewMatrix, projMatrix, lEyePos,
        0.07, 0.09, 0.02, [1, 1, 1]);
    
    const lPupil = vec3.add(lEyePos, vec3.scale(bodyForward, 0.025));
    drawSphere(gl, buffers, uniforms, viewMatrix, projMatrix, lPupil,
        0.04, 0.05, 0.02, [0, 0, 0]);

    const rEyePos = vec3.add(headPos, vec3.add(
        vec3.scale(right, 0.09), 
        vec3.add(vec3.scale(bodyUp, 0.06), vec3.scale(bodyForward, 0.22))
    ));
    drawSphere(gl, buffers, uniforms, viewMatrix, projMatrix, rEyePos,
        0.07, 0.09, 0.02, [1, 1, 1]);
    
    const rPupil = vec3.add(rEyePos, vec3.scale(bodyForward, 0.025));
    drawSphere(gl, buffers, uniforms, viewMatrix, projMatrix, rPupil,
        0.04, 0.05, 0.02, [0, 0, 0]);

    // Nose
    const nosePos = vec3.add(headPos, vec3.add(
        vec3.scale(bodyUp, -0.02), 
        vec3.scale(bodyForward, 0.24)
    ));
    drawSphere(gl, buffers, uniforms, viewMatrix, projMatrix, nosePos,
        0.04, 0.06, 0.03, [0.9, 0.8, 0.18]);

    // Mouth - changes with state
    const mouthY = player.state === 'attacking' ? -0.10 : -0.12;
    const mouthPos = vec3.add(headPos, vec3.add(
        vec3.scale(bodyUp, mouthY), 
        vec3.scale(bodyForward, 0.22)
    ));
    drawSphere(gl, buffers, uniforms, viewMatrix, projMatrix, mouthPos,
        0.08, 0.02, 0.02, [0.2, 0.1, 0.1]);
}

function drawSphere(gl, buffers, uniforms, viewMatrix, projMatrix, pos, sx, sy, sz, color) {
    const model = multiplyMatrices(
        createTranslationMatrix(pos.x, pos.y, pos.z),
        createScaleMatrix(sx, sy, sz)
    );
    const mvp = multiplyMatrices(projMatrix, multiplyMatrices(viewMatrix, model));
    
    gl.uniformMatrix4fv(uniforms.uMVP, false, mvp);
    gl.uniformMatrix4fv(uniforms.uModel, false, model);
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

function drawCube(gl, buffers, uniforms, viewMatrix, projMatrix, pos, sx, sy, sz, color) {
    const model = multiplyMatrices(
        createTranslationMatrix(pos.x, pos.y, pos.z),
        createScaleMatrix(sx, sy, sz)
    );
    const mvp = multiplyMatrices(projMatrix, multiplyMatrices(viewMatrix, model));
    
    gl.uniformMatrix4fv(uniforms.uMVP, false, mvp);
    gl.uniformMatrix4fv(uniforms.uModel, false, model);
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
