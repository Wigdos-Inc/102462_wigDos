export const vertexShaderSource = `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    attribute vec2 aTexCoord;
    uniform mat4 uMVP;
    uniform mat4 uModel;
    uniform vec3 uLightPos;
    uniform mat4 uShadowMatrix;
    uniform vec3 uViewPos;
    varying vec3 vNormal;
    varying vec3 vLightDir;
    varying vec4 vLightSpacePos;
    varying vec3 vWorldPos;
    varying vec2 vTexCoord;
    void main() {
        gl_Position = uMVP * vec4(aPosition, 1.0);
        vNormal = (uModel * vec4(aNormal, 0.0)).xyz;
        vec3 worldPos = (uModel * vec4(aPosition, 1.0)).xyz;
        vWorldPos = worldPos;
        vLightDir = normalize(uLightPos - worldPos);
        vLightSpacePos = uShadowMatrix * vec4(worldPos, 1.0);
        vTexCoord = aTexCoord;
    }
`;

export const fragmentShaderSource = `
    precision mediump float;
    uniform vec3 uColor;
    uniform sampler2D uShadowMap;
    uniform bool uUseShadows;
    uniform vec3 uViewPos;
    uniform bool uUseTexture;
    uniform sampler2D uTexture;
    varying vec3 vNormal;
    varying vec3 vLightDir;
    varying vec4 vLightSpacePos;
    varying vec3 vWorldPos;
    varying vec2 vTexCoord;
    
    float calculateShadow() {
        if (!uUseShadows) return 1.0;
        vec3 proj = vLightSpacePos.xyz / vLightSpacePos.w;
        proj = proj * 0.5 + 0.5;
        // if outside shadow map, don't shadow
        if (proj.x < 0.0 || proj.x > 1.0 || proj.y < 0.0 || proj.y > 1.0) return 1.0;
        float depth = texture2D(uShadowMap, proj.xy).r;
        float current = proj.z;
        float bias = 0.005;
        return current - bias > depth ? 0.4 : 1.0;
    }
    
    void main() {
        vec3 baseColor = uColor;
        if (uUseTexture) {
            baseColor = texture2D(uTexture, vTexCoord).rgb;
        }
        vec3 normal = normalize(vNormal);
        float diff = max(dot(normal, vLightDir), 0.0);
        vec3 ambient = baseColor * 0.3;
        vec3 diffuse = baseColor * diff * 0.7;
        
        // simple specular using Blinn-Phong
        vec3 viewDir = normalize(uViewPos - vWorldPos);
        vec3 halfDir = normalize(vLightDir + viewDir);
        float spec = pow(max(dot(normal, halfDir), 0.0), 32.0);
        vec3 specular = vec3(1.0) * spec * 0.5;
        
        vec3 color = ambient + diffuse + specular;
        color *= calculateShadow();
        
        gl_FragColor = vec4(color, 1.0);
    }
`;

// Simple post-process vertex shader for full-screen quad
export const postVertexSource = `
    attribute vec2 aPosition;
    varying vec2 vUV;
    void main() {
        vUV = aPosition * 0.5 + 0.5;
        gl_Position = vec4(aPosition, 0.0, 1.0);
    }
`;

// Stylized "RTX Mode" fragment: applies a reflection-like blend and glow
export const postFragmentSource = `
    precision mediump float;
    varying vec2 vUV;
    uniform sampler2D uScene;
    uniform float uTime;
    uniform float uIntensity;
    uniform vec2 uResolution;

    void main() {
        vec2 uv = vUV;
        vec3 col = texture2D(uScene, uv).rgb;

        // remove the previous mirror pillars; keep only a very faint tint
        // so that tall structures don't produce ugly repeating bars
        // we will instead apply a gentle cool tint based on screen height
        float tint = mix(0.0, -0.05, uv.y);
        col.b += tint * uIntensity;

        // small chromatic shimmer for subtle glimmer
        float shimmer = 0.01 * uIntensity * sin(uTime * 2.0 + uv.x * 10.0);
        col.r += shimmer * 0.6;
        col.g += shimmer * 0.3;

        // simple bloom-ish boost for bright areas
        float brightness = max(max(col.r, col.g), col.b);
        col += col * brightness * 0.08 * uIntensity;

        // vignette
        float vig = smoothstep(0.8, 0.2, length(uv - 0.5));
        col *= mix(1.0, 0.9, vig * 0.8);

        // tone-map + gamma
        col = col / (col + vec3(1.0));
        col = pow(col, vec3(1.0 / 2.2));

        gl_FragColor = vec4(col, 1.0);
    }
`;

export function createPostProcessProgram(gl) {
    const v = createShader(gl, gl.VERTEX_SHADER, postVertexSource);
    const f = createShader(gl, gl.FRAGMENT_SHADER, postFragmentSource);
    const p = gl.createProgram();
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(p));
    }
    return p;
}

// simple depth-only program used to render the scene from the light's point of view
export function createShadowProgram(gl) {
    const vsSource = `
        attribute vec3 aPosition;
        uniform mat4 uLightMVP;
        void main() {
            gl_Position = uLightMVP * vec4(aPosition, 1.0);
        }
    `;
    const fsSource = `
        void main() { }
    `;
    const v = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const f = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const p = gl.createProgram();
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(p));
    }
    return p;
}

export function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

export function createShaderProgram(gl) {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
    }
    
    return program;
}
