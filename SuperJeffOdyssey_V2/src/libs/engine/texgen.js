const canvas = document.getElementById("textureCanvas");
const gl = canvas.getContext("webgl2", {preserveDrawingBuffer: true});

if (!gl) {
    alert("WebGL2 is required for this texture generator.");
    throw new Error("WebGL2 not available");
}

function compile(type, src) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader));
    }
    return shader;
}

const vertex = `#version 300 es
in vec2 position;
void main() {
    gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `#version 300 es
precision highp float;

out vec4 outColor;

uniform int uMode;
uniform vec2 uTexSize;
uniform float uSeed;
uniform float uScale;
uniform float uDetail;
uniform int uOctaves;
uniform float uPersistence;
uniform float uBrightness;
uniform float uContrast;

float hash(vec2 p, float seed) {
    return fract(sin(dot(p + vec2(seed, seed * 1.37), vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p, float seed) {
    vec2 i = floor(p);
    vec2 f = fract(p);

    float a = hash(i, seed);
    float b = hash(i + vec2(1.0, 0.0), seed);
    float c = hash(i + vec2(0.0, 1.0), seed);
    float d = hash(i + vec2(1.0, 1.0), seed);

    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) +
           (c - a) * u.y * (1.0 - u.x) +
           (d - b) * u.x * u.y;
}

float fbm(vec2 p, int octaves, float persistence, float seed) {
    float value = 0.0;
    float amplitude = 0.5;
    vec2 pp = p;
    mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
    for (int i = 0; i < 8; i++) {
        if (i >= octaves) break;
        value += amplitude * noise(pp, seed + float(i) * 19.7);
        pp = rot * pp * 2.02;
        amplitude *= persistence;
    }
    return value;
}

float ridged(vec2 p, int octaves, float persistence, float seed) {
    float value = 0.0;
    float amplitude = 0.5;
    vec2 pp = p;
    for (int i = 0; i < 8; i++) {
        if (i >= octaves) break;
        float n = noise(pp, seed + float(i) * 11.0);
        n = 1.0 - abs(2.0 * n - 1.0);
        value += n * amplitude;
        pp *= 2.0;
        amplitude *= persistence;
    }
    return value;
}

vec2 warp(vec2 p, float amount) {
    float wx = fbm(p * 1.17 + vec2(7.0, 11.0), uOctaves, uPersistence, uSeed + 3.0);
    float wy = fbm(p * 1.23 + vec2(19.0, 5.0), uOctaves, uPersistence, uSeed + 9.0);
    return p + (vec2(wx, wy) - 0.5) * amount;
}

vec2 voronoi(vec2 p, float seed) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float best = 10.0;
    float second = 10.0;

    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 g = vec2(float(x), float(y));
            vec2 o = vec2(
                hash(i + g, seed),
                hash(i + g + vec2(17.0, 29.0), seed)
            );
            vec2 r = g + o - f;
            float d = dot(r, r);
            if (d < best) {
                second = best;
                best = d;
            } else if (d < second) {
                second = d;
            }
        }
    }

    return vec2(sqrt(best), sqrt(second) - sqrt(best));
}

float texClouds(vec2 p) {
    vec2 q = warp(p * uScale * 0.9, 0.55);
    float base = fbm(q, uOctaves, uPersistence, uSeed);
    float fluff = fbm(q * 3.0, uOctaves, 0.55, uSeed + 21.0);
    return clamp(base * 0.75 + fluff * 0.25, 0.0, 1.0);
}

float texGrass(vec2 p) {
    vec2 q = warp(p * uScale * 1.7, 0.30);
    float n = fbm(q, uOctaves, uPersistence, uSeed);
    float lines = 1.0 - abs(fract((p.x + n * 0.07) * uDetail * 9.0) * 2.0 - 1.0);
    lines = pow(lines, 5.0);
    float patchMask = ridged(p * uScale * 0.85, uOctaves, 0.55, uSeed + 8.0);
    return clamp(n * 0.55 + lines * 0.30 + patchMask * 0.15, 0.0, 1.0);
}

float texDirt(vec2 p) {
    vec2 q = warp(p * uScale * 1.2, 0.35);
    float n = fbm(q, uOctaves, uPersistence, uSeed + 7.0);
    vec2 v = voronoi(p * max(2.0, uDetail) * 0.9, uSeed + 55.0);
    float grit = smoothstep(0.0, 0.28, v.y);
    return clamp(n * 0.78 + grit * 0.22, 0.0, 1.0);
}

float texPebbles(vec2 p) {
    vec2 pp = p * max(3.0, uDetail * 1.4);
    vec2 v = voronoi(pp, uSeed + 101.0);
    float stone = 1.0 - smoothstep(0.17, 0.42, v.x);
    float edge = smoothstep(0.01, 0.07, v.y);
    float pits = noise(pp * 3.0, uSeed + 71.0) * 0.15;
    return clamp(stone * edge - pits + 0.2, 0.0, 1.0);
}

float texStone(vec2 p) {
    vec2 q = warp(p * uScale, 0.50);
    float n = fbm(q, uOctaves, uPersistence, uSeed);
    float r = ridged(q * 2.5, uOctaves, 0.58, uSeed + 31.0);
    float crack = 1.0 - smoothstep(0.08, 0.14, abs(r - 0.5));
    return clamp(n * 0.75 + r * 0.2 - crack * 0.12, 0.0, 1.0);
}

float texBrick(vec2 p) {
    vec2 pp = p * max(3.0, uDetail * 0.95);
    if (mod(floor(pp.y), 2.0) > 0.5) pp.x += 0.5;

    vec2 f = fract(pp);
    float mortar = max(step(0.92, f.x), step(0.92, f.y));
    float chipped = noise(pp * 3.2, uSeed + 14.0);
    float body = fbm(pp * 0.65, uOctaves, 0.56, uSeed + 2.0);
    body = clamp(body - (1.0 - chipped) * 0.10, 0.0, 1.0);

    return mix(body, 0.08, mortar);
}

float texTiles(vec2 p) {
    vec2 pp = p * max(3.0, uDetail);
    vec2 f = fract(pp);
    float grout = max(step(0.95, f.x), step(0.95, f.y));
    float glaze = noise(pp * 0.75, uSeed + 6.0);
    float ripple = fbm(pp * 0.35, uOctaves, 0.60, uSeed + 26.0);
    float tile = clamp(glaze * 0.45 + ripple * 0.55, 0.0, 1.0);
    return mix(tile, 0.06, grout);
}

float texWood(vec2 p) {
    vec2 c = p - 0.5;
    float ring = length(c) * (uScale * 2.2);
    float grain = fbm(vec2(c.x * 3.0, c.y * 26.0) * max(1.0, uDetail * 0.3), uOctaves, 0.55, uSeed + 44.0);
    float rings = 0.5 + 0.5 * sin(ring * max(3.0, uDetail) + grain * 6.0);
    float pores = noise(p * uScale * 8.0, uSeed + 90.0) * 0.12;
    return clamp(rings * 0.88 + pores, 0.0, 1.0);
}

float texCloth(vec2 p) {
    float threadX = 1.0 - abs(fract(p.x * uDetail * 10.0) * 2.0 - 1.0);
    float threadY = 1.0 - abs(fract(p.y * uDetail * 10.0) * 2.0 - 1.0);
    threadX = pow(threadX, 6.0);
    threadY = pow(threadY, 6.0);
    float weave = max(threadX, threadY);
    float fuzz = fbm(p * uScale * 2.3, uOctaves, 0.50, uSeed + 60.0);
    return clamp(weave * 0.72 + fuzz * 0.28, 0.0, 1.0);
}

float texSponge(vec2 p) {
    vec2 v = voronoi(p * max(2.0, uDetail * 1.1), uSeed + 81.0);
    float hole = smoothstep(0.0, 0.23, v.x);
    float rough = fbm(p * uScale * 2.4, uOctaves, 0.52, uSeed + 93.0);
    return clamp(hole * 0.7 + rough * 0.3, 0.0, 1.0);
}

float texHair(vec2 p) {
    float flow = fbm(vec2(p.x * uScale * 4.8, p.y * 1.8), uOctaves, 0.56, uSeed + 12.0);
    float strand = 1.0 - abs(fract((p.x + flow * 0.1) * uDetail * 20.0) * 2.0 - 1.0);
    strand = pow(strand, 9.0);
    float breakup = noise(p * uScale * 12.0, uSeed + 33.0) * 0.25;
    return clamp(strand * (0.9 - breakup), 0.0, 1.0);
}

float texEye(vec2 p) {
    vec2 c = p - 0.5;
    float r = length(c);
    float irisMask = 1.0 - smoothstep(0.19, 0.40, r);
    float pupilMask = 1.0 - smoothstep(0.05, 0.11, r);
    float angle = atan(c.y, c.x);
    float rays = 0.5 + 0.5 * sin(angle * 38.0 + fbm(p * uScale * 3.0, uOctaves, 0.56, uSeed) * 12.0);
    float iris = irisMask * (0.45 + 0.55 * rays);
    float sclera = smoothstep(0.35, 0.62, r) * (0.8 + 0.2 * noise(p * uScale * 8.0, uSeed + 62.0));
    float eye = max(iris * (1.0 - pupilMask), sclera * 0.65);
    vec2 h = p - vec2(0.38, 0.35);
    float highlight = 1.0 - smoothstep(0.0, 0.09, length(h));
    return clamp(eye + highlight * 0.65, 0.0, 1.0);
}

float texSpaghetti(vec2 p) {
    vec2 q = warp(p * uScale, 0.30);
    float strands = 0.5 + 0.5 * sin((q.x + fbm(q * 1.4, uOctaves, 0.55, uSeed + 71.0) * 0.4) * uDetail * 11.0);
    strands = pow(strands, 2.3);
    float sauce = fbm(p * uScale * 2.4, uOctaves, 0.5, uSeed + 88.0);
    return clamp(strands * 0.75 + sauce * 0.25, 0.0, 1.0);
}

vec3 triRamp(vec3 a, vec3 b, vec3 c, float t) {
    float lo = smoothstep(0.0, 0.55, t);
    float hi = smoothstep(0.45, 1.0, t);
    return mix(mix(a, b, lo), c, hi);
}

vec3 palette(int mode, float v) {
    if (mode == 0) return triRamp(vec3(0.10, 0.15, 0.24), vec3(0.62, 0.73, 0.83), vec3(0.98, 0.99, 1.00), v);
    if (mode == 1) return triRamp(vec3(0.05, 0.16, 0.05), vec3(0.24, 0.52, 0.12), vec3(0.66, 0.84, 0.26), v);
    if (mode == 2) return triRamp(vec3(0.12, 0.08, 0.05), vec3(0.33, 0.22, 0.12), vec3(0.56, 0.39, 0.24), v);
    if (mode == 3) return triRamp(vec3(0.10, 0.10, 0.11), vec3(0.38, 0.40, 0.43), vec3(0.79, 0.81, 0.83), v);
    if (mode == 4) return triRamp(vec3(0.13, 0.14, 0.15), vec3(0.35, 0.36, 0.37), vec3(0.68, 0.69, 0.70), v);
    if (mode == 5) return triRamp(vec3(0.27, 0.08, 0.05), vec3(0.55, 0.22, 0.14), vec3(0.86, 0.49, 0.30), v);
    if (mode == 6) return triRamp(vec3(0.10, 0.13, 0.17), vec3(0.43, 0.49, 0.54), vec3(0.84, 0.88, 0.91), v);
    if (mode == 7) return triRamp(vec3(0.10, 0.06, 0.03), vec3(0.40, 0.25, 0.13), vec3(0.77, 0.54, 0.31), v);
    if (mode == 8) return triRamp(vec3(0.10, 0.10, 0.16), vec3(0.48, 0.50, 0.62), vec3(0.90, 0.91, 0.98), v);
    if (mode == 9) return triRamp(vec3(0.30, 0.22, 0.08), vec3(0.69, 0.55, 0.21), vec3(0.98, 0.90, 0.42), v);
    if (mode == 10) return triRamp(vec3(0.05, 0.03, 0.02), vec3(0.26, 0.15, 0.09), vec3(0.56, 0.36, 0.22), v);
    if (mode == 11) return triRamp(vec3(0.05, 0.07, 0.08), vec3(0.22, 0.49, 0.75), vec3(0.93, 0.96, 1.0), v);
    return triRamp(vec3(0.29, 0.17, 0.07), vec3(0.73, 0.58, 0.25), vec3(0.97, 0.89, 0.56), v);
}

void main() {
    vec2 p = gl_FragCoord.xy / uTexSize;

    float v = 0.0;
    if (uMode == 0) v = texClouds(p);
    else if (uMode == 1) v = texGrass(p);
    else if (uMode == 2) v = texDirt(p);
    else if (uMode == 3) v = texPebbles(p);
    else if (uMode == 4) v = texStone(p);
    else if (uMode == 5) v = texBrick(p);
    else if (uMode == 6) v = texTiles(p);
    else if (uMode == 7) v = texWood(p);
    else if (uMode == 8) v = texCloth(p);
    else if (uMode == 9) v = texSponge(p);
    else if (uMode == 10) v = texHair(p);
    else if (uMode == 11) v = texEye(p);
    else v = texSpaghetti(p);

    float micro = noise(p * uScale * max(1.0, uDetail) * 1.7, uSeed + 121.0);
    v = clamp(v * 0.90 + micro * 0.10, 0.0, 1.0);
    v = clamp((v - 0.5) * uContrast + 0.5 + uBrightness, 0.0, 1.0);

    vec3 col = palette(uMode, v);
    float vignette = smoothstep(1.25, 0.25, length(p - 0.5));
    col *= 0.92 + 0.08 * vignette;

    outColor = vec4(col, 1.0);
}
`;

const vs = compile(gl.VERTEX_SHADER, vertex);
const fs = compile(gl.FRAGMENT_SHADER, fragment);

const program = gl.createProgram();
gl.attachShader(program, vs);
gl.attachShader(program, fs);
gl.linkProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
}
gl.useProgram(program);

const quad = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quad);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
     1,  1
]), gl.STATIC_DRAW);

const pos = gl.getAttribLocation(program, "position");
gl.enableVertexAttribArray(pos);
gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

const locMode = gl.getUniformLocation(program, "uMode");
const locTexSize = gl.getUniformLocation(program, "uTexSize");
const locSeed = gl.getUniformLocation(program, "uSeed");
const locScale = gl.getUniformLocation(program, "uScale");
const locDetail = gl.getUniformLocation(program, "uDetail");
const locOctaves = gl.getUniformLocation(program, "uOctaves");
const locPersistence = gl.getUniformLocation(program, "uPersistence");
const locBrightness = gl.getUniformLocation(program, "uBrightness");
const locContrast = gl.getUniformLocation(program, "uContrast");

function clampInt(value, min, max) {
    value = parseInt(value, 10);
    if (isNaN(value)) value = min;
    if (value < min) value = min;
    if (value > max) value = max;
    return value;
}

function clampFloat(value, min, max) {
    value = parseFloat(value);
    if (isNaN(value)) value = min;
    if (value < min) value = min;
    if (value > max) value = max;
    return value;
}

export function renderOnce(width, height, mode, seed, scale, detail, octaves, persistence, brightness, contrast) {
    const texW = clampInt(width, 16, 4096);
    const texH = clampInt(height, 16, 4096);
    const texMode = clampInt(mode, 0, 12);

    let texSeed = parseFloat(seed);
    if (isNaN(seed)) texSeed = 1.0;

    const texScale = clampFloat(scale, 0.1, 128.0);
    const texDetail = clampFloat(detail, 0.1, 32.0);
    const texOctaves = clampInt(octaves, 1, 8);
    const texPersistence = clampFloat(persistence, 0.1, 0.95);
    const texBrightness = clampFloat(brightness, -1.0, 1.0);
    const texContrast = clampFloat(contrast, 0.0, 3.0);

    canvas.width = texW;
    canvas.height = texH;
    //canvas.style.width = texW + 'px';
    //canvas.style.height = texH + 'px';
    gl.viewport(0, 0, texW, texH);

    gl.uniform1i(locMode, texMode);
    gl.uniform2f(locTexSize, texW, texH);
    gl.uniform1f(locSeed, texSeed);
    gl.uniform1f(locScale, texScale);
    gl.uniform1f(locDetail, texDetail);
    gl.uniform1i(locOctaves, texOctaves);
    gl.uniform1f(locPersistence, texPersistence);
    gl.uniform1f(locBrightness, texBrightness);
    gl.uniform1f(locContrast, texContrast);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

export function getTextureData() {
    let savedPixels = [];
    const width = canvas.width;
    const height = canvas.height;

    // Create array for RGBA pixels
    const pixels = new Uint8Array(width * height * 4);

    gl.finish();
    // Read pixels from WebGL buffer
    gl.readPixels(
        0,                // x
        0,                // y
        width,
        height,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        pixels
    );

    // Convert to [[r,g,b,a], ...]
    savedPixels = [];
    for (let i = 0; i < pixels.length; i += 4) {
        savedPixels.push([
            pixels[i],
            pixels[i + 1],
            pixels[i + 2],
            pixels[i + 3]
        ]);
    }

    return savedPixels;
}
