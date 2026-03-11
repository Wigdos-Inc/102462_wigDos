// Public "engine" facade exposing only the methods the game code should
// interact with.  Internally this wraps the lower-level helpers defined in
// window.js and other engine modules.  The goal is to hide WebGL details and
// keep game.js focused on high-level setup / loop logic.

import * as collision from './collision.js';

// collision helpers
export const {
    sphereIntersectsShape,
    supportHeightAtXZ,
    createBox,
    createCylinder,
    createTriangle
} = collision;

// terrain helpers -----------------------------------------------------------
// We now support either a single large mesh (uint32 indices when supported)
// or multiple 16-bit chunks when the extension is unavailable.
let terrainBuffers = null; // array of buffer sets

function chunkMeshToUint16(mesh, maxVerts = 65535) {
    const chunks = [];
    let vMap = new Map();
    let next = 0;
    let verts = [];
    let norms = [];
    let cols = [];
    let inds = [];

    const flush = () => {
        if (!inds.length) return;
        chunks.push({ vertices: verts, normals: norms, colors: cols, indices: inds });
        vMap = new Map();
        next = 0;
        verts = [];
        norms = [];
        cols = [];
        inds = [];
    };

    const triCount = mesh.indices.length / 3;
    for (let t = 0; t < triCount; t++) {
        const a = mesh.indices[t * 3 + 0];
        const b = mesh.indices[t * 3 + 1];
        const c = mesh.indices[t * 3 + 2];

        // ensure capacity or start a new chunk before mapping
        while (true) {
            const needA = !vMap.has(a);
            const needB = !vMap.has(b);
            const needC = !vMap.has(c);
            const needed = (needA ? 1 : 0) + (needB ? 1 : 0) + (needC ? 1 : 0);
            if (next + needed <= maxVerts) break;
            flush();
        }

        const mapVertex = (orig) => {
            let idx = vMap.get(orig);
            if (idx !== undefined) return idx;
            idx = next++;
            vMap.set(orig, idx);
            const vOff = orig * 3;
            verts.push(mesh.vertices[vOff], mesh.vertices[vOff + 1], mesh.vertices[vOff + 2]);
            norms.push(mesh.normals[vOff], mesh.normals[vOff + 1], mesh.normals[vOff + 2]);
            if (mesh.colors && mesh.colors.length) {
                cols.push(mesh.colors[vOff], mesh.colors[vOff + 1], mesh.colors[vOff + 2]);
            }
            return idx;
        };

        inds.push(mapVertex(a), mapVertex(b), mapVertex(c));
    }

    flush();
    return chunks;
}

export function uploadTerrainMesh(mesh) {
    return;
    const gl = gfx.gl;
    const totalVerts = mesh.vertices.length / 3;
    const canUseUint32 = !!gfx.indexExt;
    const needsUint32 = totalVerts > 65535;

    // reset storage
    terrainBuffers = [];

    if (needsUint32 && canUseUint32) {
        const buffers = {
            position: gl.createBuffer(),
            normal: gl.createBuffer(),
            color: gl.createBuffer(),
            index: gl.createBuffer(),
            count: mesh.indices.length,
            indexType: gl.UNSIGNED_INT
        };
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.vertices), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.normals), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.colors), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(mesh.indices), gl.STATIC_DRAW);
        terrainBuffers.push(buffers);
    } else {
        if (needsUint32 && !canUseUint32) {
            console.warn('OES_element_index_uint missing; splitting terrain into 16-bit chunks');
        }
        const chunks = chunkMeshToUint16(mesh, 65535);
        chunks.forEach(chunk => {
            const buffers = {
                position: gl.createBuffer(),
                normal: gl.createBuffer(),
                color: gl.createBuffer(),
                index: gl.createBuffer(),
                count: chunk.indices.length,
                indexType: gl.UNSIGNED_SHORT
            };
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(chunk.vertices), gl.STATIC_DRAW);
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(chunk.normals), gl.STATIC_DRAW);
            if (chunk.colors && chunk.colors.length) {
                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(chunk.colors), gl.STATIC_DRAW);
            }
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(chunk.indices), gl.STATIC_DRAW);
            terrainBuffers.push(buffers);
        });
    }
}

export function drawTerrain(viewMatrix, projMatrix, color = [0.4,0.6,0.4]) {
    const gl = gfx.gl;
    if (!terrainBuffers || !terrainBuffers.length) return;

    // set up model/view/projection so terrain stays in world space
    const modelMatrix = math.createTranslationMatrix(0,0,0);
    const mvp = math.multiplyMatrices(projMatrix, math.multiplyMatrices(viewMatrix, modelMatrix));
    gl.uniformMatrix4fv(gfx.uniforms.uMVP, false, mvp);
    gl.uniformMatrix4fv(gfx.uniforms.uModel, false, modelMatrix);
    gl.uniform3fv(gfx.uniforms.uColor, color);
    gl.uniform1i(gfx.uniforms.uUseTexture, 0);

    for (const buffers of terrainBuffers) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
        gl.enableVertexAttribArray(gfx.uniforms.aPosition);
        gl.vertexAttribPointer(gfx.uniforms.aPosition, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
        gl.enableVertexAttribArray(gfx.uniforms.aNormal);
        gl.vertexAttribPointer(gfx.uniforms.aNormal, 3, gl.FLOAT, false, 0, 0);
        // color buffer remains unused by shader; if you later want vertex colors,
        // set uUseTexture and bind a texture from the buffer.

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index);
        gl.drawElements(gl.TRIANGLES, buffers.count, buffers.indexType, 0);
    }
}
