class WebGLRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!this.gl) throw new Error('WebGL not supported');
    
    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.enable(this.gl.CULL_FACE);
    this.gl.cullFace(this.gl.BACK);
    
    this.shaderProgram = this.createShaderProgram();
    this.projectionMatrix = new Mat4();
    this.viewMatrix = new Mat4();
    this.skyboxImage = null;
    this.skyboxLoaded = false;
  }
  
  createShaderProgram() {
    const vertexShaderSource = `
      attribute vec3 aPosition;
      attribute vec3 aNormal;
      attribute vec3 aColor;
      attribute vec2 aTexCoord;
      uniform mat4 uModelMatrix;
      uniform mat4 uViewMatrix;
      uniform mat4 uProjectionMatrix;
      uniform mat4 uNormalMatrix;
      varying vec3 vNormal;
      varying vec3 vColor;
      varying vec3 vPosition;
      varying vec2 vTexCoord;
      void main() {
        vec4 worldPosition = uModelMatrix * vec4(aPosition, 1.0);
        vPosition = worldPosition.xyz;
        vNormal = (uNormalMatrix * vec4(aNormal, 0.0)).xyz;
        vColor = aColor;
        vTexCoord = aTexCoord;
        gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;
      }
    `;
    
    const fragmentShaderSource = `
      precision mediump float;
      varying vec3 vNormal;
      varying vec3 vColor;
      varying vec3 vPosition;
      varying vec2 vTexCoord;
      uniform vec3 uLightPosition;
      uniform vec3 uAmbientLight;
      uniform sampler2D uTexture;
      uniform bool uHasTexture;
      void main() {
        vec3 normal = normalize(vNormal);
        vec3 lightDir = normalize(uLightPosition - vPosition);
        float diff = max(dot(normal, lightDir), 0.0);
        vec3 diffuse = diff * vec3(1.0, 1.0, 1.0);
        vec3 ambient = uAmbientLight;
        vec3 lighting = ambient + diffuse;
        vec3 baseColor = vColor;
        if (uHasTexture) {
          vec4 texColor = texture2D(uTexture, vTexCoord);
          baseColor = texColor.rgb;
        }
        vec3 finalColor = baseColor * lighting;
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;
    
    const vertexShader = this.compileShader(vertexShaderSource, this.gl.VERTEX_SHADER);
    const fragmentShader = this.compileShader(fragmentShaderSource, this.gl.FRAGMENT_SHADER);
    const program = this.gl.createProgram();
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error('Shader link error:', this.gl.getProgramInfoLog(program));
      return null;
    }
    return program;
  }
  
  compileShader(source, type) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
    return shader;
  }
  
  setSize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
  }
  
  setSkybox(imagePath) {
    const img = new Image();
    img.onload = () => {
      this.skyboxImage = img;
      this.skyboxLoaded = true;
    };
    img.onerror = () => {
      console.error('Failed to load skybox image:', imagePath);
      this.skyboxLoaded = false;
    };
    img.src = imagePath;
  }
  
  calculateNormalMatrix(modelMatrix) {
    // Calculate inverse transpose of model matrix for proper normal transformation
    const inv = new Mat4();
    const m = modelMatrix.m;
    
    // Calculate 3x3 inverse (for rotation/scale part)
    const a00 = m[0], a01 = m[4], a02 = m[8];
    const a10 = m[1], a11 = m[5], a12 = m[9];
    const a20 = m[2], a21 = m[6], a22 = m[10];
    
    const b01 = a22 * a11 - a12 * a21;
    const b11 = -a22 * a10 + a12 * a20;
    const b21 = a21 * a10 - a11 * a20;
    
    let det = a00 * b01 + a01 * b11 + a02 * b21;
    
    if (det === 0) {
      // Singular matrix, just return identity-like
      return new Mat4();
    }
    
    det = 1.0 / det;
    
    const inv00 = b01 * det;
    const inv01 = (-a22 * a01 + a02 * a21) * det;
    const inv02 = (a12 * a01 - a02 * a11) * det;
    const inv10 = b11 * det;
    const inv11 = (a22 * a00 - a02 * a20) * det;
    const inv12 = (-a12 * a00 + a02 * a10) * det;
    const inv20 = b21 * det;
    const inv21 = (-a21 * a00 + a01 * a20) * det;
    const inv22 = (a11 * a00 - a01 * a10) * det;

    inv.m[0] = inv00;
    inv.m[1] = inv01;
    inv.m[2] = inv02;
    inv.m[3] = 0;
    
    inv.m[4] = inv10;
    inv.m[5] = inv11;
    inv.m[6] = inv12;
    inv.m[7] = 0;
    
    inv.m[8] = inv20;
    inv.m[9] = inv21;
    inv.m[10] = inv22;
    inv.m[11] = 0;
    
    inv.m[12] = 0;
    inv.m[13] = 0;
    inv.m[14] = 0;
    inv.m[15] = 1;
    
    // Transpose for final normal matrix
    const result = new Mat4();
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        result.m[j * 4 + i] = inv.m[i * 4 + j];
      }
    }
    return result;
  }
  
  clear(r = 0.53, g = 0.81, b = 0.92) {
    this.gl.clearColor(r, g, b, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  }
  
  render(meshes, camera) {
    this.clear();
    this.gl.useProgram(this.shaderProgram);
    
    const projLoc = this.gl.getUniformLocation(this.shaderProgram, 'uProjectionMatrix');
    const viewLoc = this.gl.getUniformLocation(this.shaderProgram, 'uViewMatrix');
    const lightPosLoc = this.gl.getUniformLocation(this.shaderProgram, 'uLightPosition');
    const ambientLoc = this.gl.getUniformLocation(this.shaderProgram, 'uAmbientLight');
    
    this.gl.uniformMatrix4fv(projLoc, false, this.projectionMatrix.m);
    this.gl.uniformMatrix4fv(viewLoc, false, this.viewMatrix.m);
    this.gl.uniform3f(lightPosLoc, 10, 20, 10);
    this.gl.uniform3f(ambientLoc, 0.6, 0.6, 0.6);
    
    meshes.forEach(mesh => {
      if (mesh.visible) this.renderMesh(mesh);
    });
  }
  
  renderMesh(mesh) {
    const modelLoc = this.gl.getUniformLocation(this.shaderProgram, 'uModelMatrix');
    const normalLoc = this.gl.getUniformLocation(this.shaderProgram, 'uNormalMatrix');
    this.gl.uniformMatrix4fv(modelLoc, false, mesh.modelMatrix.m);
    
    // Calculate proper normal matrix (inverse transpose of model matrix)
    const normalMatrix = this.calculateNormalMatrix(mesh.modelMatrix);
    this.gl.uniformMatrix4fv(normalLoc, false, normalMatrix.m);
    
    const posLoc = this.gl.getAttribLocation(this.shaderProgram, 'aPosition');
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, mesh.positionBuffer);
    this.gl.vertexAttribPointer(posLoc, 3, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(posLoc);
    
    const normalAttribLoc = this.gl.getAttribLocation(this.shaderProgram, 'aNormal');
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, mesh.normalBuffer);
    this.gl.vertexAttribPointer(normalAttribLoc, 3, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(normalAttribLoc);
    
    const colorLoc = this.gl.getAttribLocation(this.shaderProgram, 'aColor');
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, mesh.colorBuffer);
    this.gl.vertexAttribPointer(colorLoc, 3, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(colorLoc);
    
    const texCoordLoc = this.gl.getAttribLocation(this.shaderProgram, 'aTexCoord');
    if (mesh.texCoordBuffer) {
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, mesh.texCoordBuffer);
      this.gl.vertexAttribPointer(texCoordLoc, 2, this.gl.FLOAT, false, 0, 0);
      this.gl.enableVertexAttribArray(texCoordLoc);
    } else {
      this.gl.vertexAttrib2f(texCoordLoc, 0.0, 0.0);
      this.gl.disableVertexAttribArray(texCoordLoc);
    }
    
    const hasTextureLoc = this.gl.getUniformLocation(this.shaderProgram, 'uHasTexture');
    if (mesh.texture) {
      this.gl.uniform1i(hasTextureLoc, 1);
      this.gl.activeTexture(this.gl.TEXTURE0);
      this.gl.bindTexture(this.gl.TEXTURE_2D, mesh.texture);
      const textureLoc = this.gl.getUniformLocation(this.shaderProgram, 'uTexture');
      this.gl.uniform1i(textureLoc, 0);
    } else {
      this.gl.uniform1i(hasTextureLoc, 0);
    }
    
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
    this.gl.drawElements(this.gl.TRIANGLES, mesh.indexCount, mesh.indexType || this.gl.UNSIGNED_SHORT, 0);
  }
}

window.WebGLRenderer = WebGLRenderer;
