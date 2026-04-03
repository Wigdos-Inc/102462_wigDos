import { add, makeYRotationMatrix, projectPoint, transformVec3Mat3 } from './math3d.js';

export class SimpleRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl2', { antialias: true, alpha: false });

        if (!this.gl) {
            throw new Error('WebGL2 is required for this renderer.');
        }

        this.program = createProgram(this.gl, VERT_SOURCE, FRAG_SOURCE);
        this.vertexBuffer = this.gl.createBuffer();

        this.positionLoc = this.gl.getAttribLocation(this.program, 'a_position');
        this.colorLoc = this.gl.getAttribLocation(this.program, 'a_color');

        this.spriteLayer = this.createSpriteLayer();
        this.spritePool = [];

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    createSpriteLayer() {
        const parent = this.canvas.parentElement;
        if (!parent) {
            return null;
        }

        const parentStyle = window.getComputedStyle(parent);
        if (parentStyle.position === 'static') {
            parent.style.position = 'relative';
        }

        const layer = document.createElement('div');
        layer.style.position = 'absolute';
        layer.style.left = '0';
        layer.style.top = '0';
        layer.style.right = '0';
        layer.style.bottom = '0';
        layer.style.pointerEvents = 'none';
        layer.style.overflow = 'hidden';
        layer.style.zIndex = '3';

        parent.appendChild(layer);
        return layer;
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    drawScene(camera, worldBlocks, playerParts) {
        const gl = this.gl;
        gl.clearColor(0.57, 0.78, 0.99, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        const drawList = [];
        const spriteList = [];
        for (let i = 0; i < worldBlocks.length; i += 1) {
            drawList.push({ cube: worldBlocks[i], depth: this.getCubeDepth(worldBlocks[i], camera) });
        }
        for (let i = 0; i < playerParts.length; i += 1) {
            if (playerParts[i].type === 'sprite') {
                spriteList.push(playerParts[i]);
            } else {
                drawList.push({ cube: playerParts[i], depth: this.getCubeDepth(playerParts[i], camera) });
            }
        }

        drawList.sort((a, b) => b.depth - a.depth);

        const vertices = [];
        for (let i = 0; i < drawList.length; i += 1) {
            this.pushShapeTriangles(vertices, drawList[i].cube, camera);
        }

        const data = new Float32Array(vertices);
        gl.useProgram(this.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);

        const stride = 5 * 4;
        gl.enableVertexAttribArray(this.positionLoc);
        gl.vertexAttribPointer(this.positionLoc, 2, gl.FLOAT, false, stride, 0);

        gl.enableVertexAttribArray(this.colorLoc);
        gl.vertexAttribPointer(this.colorLoc, 3, gl.FLOAT, false, stride, 2 * 4);

        gl.drawArrays(gl.TRIANGLES, 0, data.length / 5);

        this.drawSprites(spriteList, camera);
    }

    drawSprites(spriteList, camera) {
        if (!this.spriteLayer) {
            return;
        }

        for (let i = 0; i < spriteList.length; i += 1) {
            const sprite = spriteList[i];
            const projected = projectPoint(sprite.center, camera, this.canvas.width, this.canvas.height);

            const img = this.getSpriteElement(i);
            if (!projected || projected.depth <= 0.1) {
                img.style.display = 'none';
                continue;
            }

            if (sprite.normal) {
                const toCameraX = camera.position.x - sprite.center.x;
                const toCameraY = camera.position.y - sprite.center.y;
                const toCameraZ = camera.position.z - sprite.center.z;
                const facingDot = (sprite.normal.x * toCameraX) + (sprite.normal.y * toCameraY) + (sprite.normal.z * toCameraZ);
                if (facingDot <= 0) {
                    img.style.display = 'none';
                    continue;
                }
            }

            const widthPx = Math.max(12, (sprite.width * camera.fovScale) / projected.depth);
            const heightPx = Math.max(12, (sprite.height * camera.fovScale) / projected.depth);

            img.src = sprite.url;
            img.alt = 'face';
            img.style.display = 'block';
            img.style.left = `${projected.x - widthPx * 0.5}px`;
            img.style.top = `${projected.y - heightPx * 0.5}px`;
            img.style.width = `${widthPx}px`;
            img.style.height = `${heightPx}px`;
            img.style.zIndex = `${Math.max(0, 100000 - Math.floor(projected.depth * 100))}`;
        }

        for (let i = spriteList.length; i < this.spritePool.length; i += 1) {
            this.spritePool[i].style.display = 'none';
        }
    }

    getSpriteElement(index) {
        if (this.spritePool[index]) {
            return this.spritePool[index];
        }

        const img = document.createElement('img');
        img.style.position = 'absolute';
        img.style.pointerEvents = 'none';
        img.style.mixBlendMode = 'screen';
        img.style.opacity = '0.95';

        this.spriteLayer.appendChild(img);
        this.spritePool[index] = img;
        return img;
    }

    getCubeDepth(cube, camera) {
        const p = projectPoint(cube.center, camera, this.canvas.width, this.canvas.height);
        return p ? p.depth : -99999;
    }

    pushShapeTriangles(out, shape, camera) {
        if (shape.type === 'cylinder') {
            this.pushCylinderTriangles(out, shape, camera);
            return;
        }
        this.pushBoxTriangles(out, shape, camera);
    }

    pushBoxTriangles(out, cube, camera) {
        const corners = this.getCubeCorners(cube.center, cube.size, cube.rotationY || 0);
        const projected = [];

        for (let i = 0; i < corners.length; i += 1) {
            const p = projectPoint(corners[i], camera, this.canvas.width, this.canvas.height);
            if (!p) {
                return;
            }
            projected.push(p);
        }

        const faces = [
            [0, 1, 2, 3],
            [4, 5, 6, 7],
            [0, 1, 5, 4],
            [2, 3, 7, 6],
            [1, 2, 6, 5],
            [0, 3, 7, 4]
        ];

        const faceDepths = [];
        for (let i = 0; i < faces.length; i += 1) {
            const f = faces[i];
            const depth = (projected[f[0]].depth + projected[f[1]].depth + projected[f[2]].depth + projected[f[3]].depth) / 4;
            faceDepths.push({ indices: f, depth });
        }

        faceDepths.sort((a, b) => b.depth - a.depth);

        for (let i = 0; i < faceDepths.length; i += 1) {
            const face = faceDepths[i];
            const rgb = shadeAndFog(cube.color, face.depth);
            this.pushFace(out, projected, face.indices, rgb);
        }
    }

    pushCylinderTriangles(out, cyl, camera) {
        const segments = Math.max(8, cyl.segments || 12);
        const halfH = cyl.height * 0.5;
        const top = [];
        const bottom = [];

        for (let i = 0; i < segments; i += 1) {
            const t = (i / segments) * Math.PI * 2;
            const x = Math.cos(t) * cyl.radius;
            const z = Math.sin(t) * cyl.radius;

            top.push(add(cyl.center, { x, y: halfH, z }));
            bottom.push(add(cyl.center, { x, y: -halfH, z }));
        }

        const pTop = [];
        const pBottom = [];
        for (let i = 0; i < segments; i += 1) {
            const a = projectPoint(top[i], camera, this.canvas.width, this.canvas.height);
            const b = projectPoint(bottom[i], camera, this.canvas.width, this.canvas.height);
            if (!a || !b) return;
            pTop.push(a);
            pBottom.push(b);
        }

        // Side quads
        for (let i = 0; i < segments; i += 1) {
            const n = (i + 1) % segments;
            const depth = (pTop[i].depth + pBottom[i].depth + pBottom[n].depth + pTop[n].depth) * 0.25;
            const rgb = shadeAndFog(cyl.color, depth);

            const a = screenToNdc(pTop[i], this.canvas.width, this.canvas.height);
            const b = screenToNdc(pBottom[i], this.canvas.width, this.canvas.height);
            const c = screenToNdc(pBottom[n], this.canvas.width, this.canvas.height);
            const d = screenToNdc(pTop[n], this.canvas.width, this.canvas.height);

            pushVertex(out, a.x, a.y, rgb.r, rgb.g, rgb.b);
            pushVertex(out, b.x, b.y, rgb.r, rgb.g, rgb.b);
            pushVertex(out, c.x, c.y, rgb.r, rgb.g, rgb.b);

            pushVertex(out, a.x, a.y, rgb.r, rgb.g, rgb.b);
            pushVertex(out, c.x, c.y, rgb.r, rgb.g, rgb.b);
            pushVertex(out, d.x, d.y, rgb.r, rgb.g, rgb.b);
        }

        // Top cap fan
        const centerTop = projectPoint(add(cyl.center, { x: 0, y: halfH, z: 0 }), camera, this.canvas.width, this.canvas.height);
        if (!centerTop) return;
        const ct = screenToNdc(centerTop, this.canvas.width, this.canvas.height);
        const topRgb = shadeAndFog(cyl.color, centerTop.depth * 0.96);
        for (let i = 0; i < segments; i += 1) {
            const n = (i + 1) % segments;
            const a = screenToNdc(pTop[i], this.canvas.width, this.canvas.height);
            const b = screenToNdc(pTop[n], this.canvas.width, this.canvas.height);

            pushVertex(out, ct.x, ct.y, topRgb.r, topRgb.g, topRgb.b);
            pushVertex(out, a.x, a.y, topRgb.r, topRgb.g, topRgb.b);
            pushVertex(out, b.x, b.y, topRgb.r, topRgb.g, topRgb.b);
        }
    }

    pushFace(out, points, f, rgb) {
        const a = screenToNdc(points[f[0]], this.canvas.width, this.canvas.height);
        const b = screenToNdc(points[f[1]], this.canvas.width, this.canvas.height);
        const c = screenToNdc(points[f[2]], this.canvas.width, this.canvas.height);
        const d = screenToNdc(points[f[3]], this.canvas.width, this.canvas.height);

        // Two triangles: a,b,c and a,c,d
        pushVertex(out, a.x, a.y, rgb.r, rgb.g, rgb.b);
        pushVertex(out, b.x, b.y, rgb.r, rgb.g, rgb.b);
        pushVertex(out, c.x, c.y, rgb.r, rgb.g, rgb.b);

        pushVertex(out, a.x, a.y, rgb.r, rgb.g, rgb.b);
        pushVertex(out, c.x, c.y, rgb.r, rgb.g, rgb.b);
        pushVertex(out, d.x, d.y, rgb.r, rgb.g, rgb.b);
    }

    getCubeCorners(center, size, rotationY) {
        const hx = size.x * 0.5;
        const hy = size.y * 0.5;
        const hz = size.z * 0.5;

        const rot = makeYRotationMatrix(rotationY);
        const localCorners = [
            { x: -hx, y: -hy, z: -hz },
            { x: hx, y: -hy, z: -hz },
            { x: hx, y: hy, z: -hz },
            { x: -hx, y: hy, z: -hz },
            { x: -hx, y: -hy, z: hz },
            { x: hx, y: -hy, z: hz },
            { x: hx, y: hy, z: hz },
            { x: -hx, y: hy, z: hz }
        ];

        const corners = [];
        for (let i = 0; i < localCorners.length; i += 1) {
            const r = transformVec3Mat3(localCorners[i], rot);
            corners.push(add(center, r));
        }

        return corners;
    }
}

function pushVertex(out, x, y, r, g, b) {
    out.push(x, y, r, g, b);
}

function screenToNdc(point, width, height) {
    return {
        x: (point.x / width) * 2 - 1,
        y: 1 - (point.y / height) * 2
    };
}

function shadeAndFog(hex, depth) {
    const base = hexToRgb(hex);
    const shade = Math.max(0.5, Math.min(1, 140 / Math.max(18, depth)));
    const fogAmount = Math.max(0, Math.min(0.55, (depth - 35) / 120));
    const fog = { r: 210, g: 236, b: 255 };

    const lit = {
        r: Math.floor(base.r * shade),
        g: Math.floor(base.g * shade),
        b: Math.floor(base.b * shade)
    };

    const mixed = {
        r: Math.floor(lit.r * (1 - fogAmount) + fog.r * fogAmount),
        g: Math.floor(lit.g * (1 - fogAmount) + fog.g * fogAmount),
        b: Math.floor(lit.b * (1 - fogAmount) + fog.b * fogAmount)
    };

    return {
        r: mixed.r / 255,
        g: mixed.g / 255,
        b: mixed.b / 255
    };
}

function hexToRgb(hex) {
    const value = hex.replace('#', '');
    return {
        r: parseInt(value.slice(0, 2), 16),
        g: parseInt(value.slice(2, 4), 16),
        b: parseInt(value.slice(4, 6), 16)
    };
}

function createProgram(gl, vertSrc, fragSrc) {
    const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);

    const program = gl.createProgram();
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const info = gl.getProgramInfoLog(program) || 'unknown link error';
        throw new Error(`WebGL link error: ${info}`);
    }

    return program;
}

function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader) || 'unknown compile error';
        throw new Error(`WebGL shader error: ${info}`);
    }

    return shader;
}

const VERT_SOURCE = `#version 300 es
in vec2 a_position;
in vec3 a_color;
out vec3 v_color;

void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_color = a_color;
}
`;

const FRAG_SOURCE = `#version 300 es
precision highp float;
in vec3 v_color;
out vec4 outColor;

void main() {
    outColor = vec4(v_color, 1.0);
}
`;
