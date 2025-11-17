export const vertexShaderSource = `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    uniform mat4 uMVP;
    uniform mat4 uModel;
    uniform vec3 uLightPos;
    varying vec3 vNormal;
    varying vec3 vLightDir;
    void main() {
        gl_Position = uMVP * vec4(aPosition, 1.0);
        vNormal = (uModel * vec4(aNormal, 0.0)).xyz;
        vec3 worldPos = (uModel * vec4(aPosition, 1.0)).xyz;
        vLightDir = normalize(uLightPos - worldPos);
    }
`;

export const fragmentShaderSource = `
    precision mediump float;
    uniform vec3 uColor;
    varying vec3 vNormal;
    varying vec3 vLightDir;
    void main() {
        vec3 normal = normalize(vNormal);
        float diff = max(dot(normal, vLightDir), 0.0);
        vec3 ambient = uColor * 0.3;
        vec3 diffuse = uColor * diff * 0.7;
        gl_FragColor = vec4(ambient + diffuse, 1.0);
    }
`;

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
