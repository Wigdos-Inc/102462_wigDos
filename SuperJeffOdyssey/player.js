import { vec3 } from './vec3.js';
import { multiplyMatrices, createTranslationMatrix, createScaleMatrix } from './matrix.js';

export function createPlayer() {
    return {
        pos: vec3.create(0, 0, 0),
        vel: vec3.create(0, 0, 0),
        radius: 1.5, // INCREASED from 0.8
        onGround: false,
        currentPlanet: null,
        walkCycle: 0,
        state: 'idle',
        facingDir: vec3.create(0, 0, 1),
        rotation: 0,
        stateTimer: 0,
        attackHitbox: false,
        hairThrown: false, // ADD for hair throw
        hairPos: null, // ADD
        hairVel: null, // ADD
        hairReturn: false // ADD
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
    }
    
    // Use standard up direction for Odyssey (not planet-based)
    let up = vec3.create(0, 1, 0);
    
    let forward = player.facingDir || vec3.create(0, 0, 1);
    const forwardDotUp = vec3.dot(forward, up);
    forward = vec3.normalize(vec3.sub(forward, vec3.scale(up, forwardDotUp)));
    const right = vec3.normalize(vec3.cross(up, forward));
    forward = vec3.normalize(vec3.cross(right, up));

    // Apply body rotation for summersault
    let bodyUp = up;
    let bodyForward = forward;
    if (bodyRotation !== 0) {
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
    
    // Head - BIGGER
    const headPos = vec3.add(player.pos, vec3.scale(bodyUp, (0.6 + bob) * 2.0));
    drawSphere(gl, buffers, uniforms, viewMatrix, projMatrix, headPos, 
        0.25 * 2.0, 0.3 * stretch * 2.0, 0.25 * 2.0, [0.95, 0.85, 0.2]);

    // Hair antenna - only draw if not thrown
    if (!player.hairThrown) {
        const hairPos = vec3.add(headPos, vec3.scale(bodyUp, 0.3 * 2.0));
        drawCube(gl, buffers, uniforms, viewMatrix, projMatrix, hairPos,
            0.03 * 2.0, 0.2 * 2.0, 0.03 * 2.0, [0.1, 0.1, 0.1]);
    }

    // Body - BIGGER
    const bodyPos = vec3.add(player.pos, vec3.scale(bodyUp, (0.15 + bob) * 2.0));
    drawCube(gl, buffers, uniforms, viewMatrix, projMatrix, bodyPos,
        0.3 * 2.0, 0.4 * stretch * 2.0, 0.2 * 2.0, [0.15, 0.35, 0.85]);

    // Arms - BIGGER
    const lArmPos = vec3.add(bodyPos, vec3.add(
        vec3.scale(right, (-0.35 - armSpread) * 2.0), 
        vec3.add(
            vec3.scale(bodyForward, armSwing * 0.15 * 2.0),
            vec3.scale(bodyUp, (player.state === 'attacking' ? 0.2 : 0) * 2.0)
        )
    ));
    drawCube(gl, buffers, uniforms, viewMatrix, projMatrix, lArmPos,
        0.1 * 2.0, 0.35 * 2.0, 0.1 * 2.0, [0.15, 0.35, 0.85]);
    
    const rArmPos = vec3.add(bodyPos, vec3.add(
        vec3.scale(right, (0.35 + armSpread) * 2.0), 
        vec3.add(
            vec3.scale(bodyForward, (player.state === 'attacking' ? 0.5 : -armSwing * 0.15) * 2.0),
            vec3.scale(bodyUp, (player.state === 'attacking' ? 0.2 : 0) * 2.0)
        )
    ));
    drawCube(gl, buffers, uniforms, viewMatrix, projMatrix, rArmPos,
        0.1 * 2.0, 0.35 * 2.0, 0.1 * 2.0, [0.15, 0.35, 0.85]);

    // Attack effect - BIGGER
    if (player.state === 'attacking' && player.stateTimer > 0.3) {
        const punchPos = vec3.add(rArmPos, vec3.scale(bodyForward, 0.3 * 2.0));
        drawSphere(gl, buffers, uniforms, viewMatrix, projMatrix, punchPos,
            0.15 * 2.0, 0.15 * 2.0, 0.15 * 2.0, [1, 1, 0]);
    }

    // Legs - BIGGER
    const lLegPos = vec3.add(player.pos, vec3.add(
        vec3.scale(right, -0.12 * 2.0), 
        vec3.add(vec3.scale(bodyUp, -0.2 * 2.0), vec3.scale(bodyForward, legSwing * 0.2 * 2.0))
    ));
    drawCube(gl, buffers, uniforms, viewMatrix, projMatrix, lLegPos,
        0.12 * 2.0, 0.35 * 2.0, 0.12 * 2.0, [0.1, 0.2, 0.6]);
    
    const rLegPos = vec3.add(player.pos, vec3.add(
        vec3.scale(right, 0.12 * 2.0), 
        vec3.add(vec3.scale(bodyUp, -0.2 * 2.0), vec3.scale(bodyForward, -legSwing * 0.2 * 2.0))
    ));
    drawCube(gl, buffers, uniforms, viewMatrix, projMatrix, rLegPos,
        0.12 * 2.0, 0.35 * 2.0, 0.12 * 2.0, [0.1, 0.2, 0.6]);

    // Eyes - BIGGER
    const lEyePos = vec3.add(headPos, vec3.add(
        vec3.scale(right, -0.09 * 2.0), 
        vec3.add(vec3.scale(bodyUp, 0.06 * 2.0), vec3.scale(bodyForward, 0.22 * 2.0))
    ));
    drawSphere(gl, buffers, uniforms, viewMatrix, projMatrix, lEyePos,
        0.07 * 2.0, 0.09 * 2.0, 0.02 * 2.0, [1, 1, 1]);
    
    const lPupil = vec3.add(lEyePos, vec3.scale(bodyForward, 0.025 * 2.0));
    drawSphere(gl, buffers, uniforms, viewMatrix, projMatrix, lPupil,
        0.04 * 2.0, 0.05 * 2.0, 0.02 * 2.0, [0, 0, 0]);

    const rEyePos = vec3.add(headPos, vec3.add(
        vec3.scale(right, 0.09 * 2.0), 
        vec3.add(vec3.scale(bodyUp, 0.06 * 2.0), vec3.scale(bodyForward, 0.22 * 2.0))
    ));
    drawSphere(gl, buffers, uniforms, viewMatrix, projMatrix, rEyePos,
        0.07 * 2.0, 0.09 * 2.0, 0.02 * 2.0, [1, 1, 1]);
    
    const rPupil = vec3.add(rEyePos, vec3.scale(bodyForward, 0.025 * 2.0));
    drawSphere(gl, buffers, uniforms, viewMatrix, projMatrix, rPupil,
        0.04 * 2.0, 0.05 * 2.0, 0.02 * 2.0, [0, 0, 0]);

    // Nose - BIGGER
    const nosePos = vec3.add(headPos, vec3.add(
        vec3.scale(bodyUp, -0.02 * 2.0), 
        vec3.scale(bodyForward, 0.24 * 2.0)
    ));
    drawSphere(gl, buffers, uniforms, viewMatrix, projMatrix, nosePos,
        0.04 * 2.0, 0.06 * 2.0, 0.03 * 2.0, [0.9, 0.8, 0.18]);

    // Mouth - BIGGER
    const mouthY = player.state === 'attacking' ? -0.10 : -0.12;
    const mouthPos = vec3.add(headPos, vec3.add(
        vec3.scale(bodyUp, mouthY * 2.0), 
        vec3.scale(bodyForward, 0.22 * 2.0)
    ));
    drawSphere(gl, buffers, uniforms, viewMatrix, projMatrix, mouthPos,
        0.08 * 2.0, 0.02 * 2.0, 0.02 * 2.0, [0.2, 0.1, 0.1]);

    // Draw thrown hair (cappy mechanic)
    if (player.hairThrown && player.hairPos) {
        const hairRotation = Date.now() * 0.01;
        const hairScale = 0.15 * 2.0;
        
        // Draw spinning hair antenna
        drawCube(gl, buffers, uniforms, viewMatrix, projMatrix, player.hairPos,
            hairScale, hairScale * 4, hairScale, [0.1, 0.1, 0.1]);
        
        // Draw trail effect
        for (let i = 1; i <= 3; i++) {
            const trailPos = vec3.add(player.hairPos, vec3.scale(player.hairVel, -i * 0.1));
            const alpha = 1 - (i * 0.3);
            drawCube(gl, buffers, uniforms, viewMatrix, projMatrix, trailPos,
                hairScale * 0.8, hairScale * 3, hairScale * 0.8, [0.1 * alpha, 0.1 * alpha, 0.1 * alpha]);
        }
    }
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
