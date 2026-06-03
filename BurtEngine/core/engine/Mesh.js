class Mesh {
  constructor(renderer, geometry, color = [1, 1, 1]) {
    this.renderer = renderer;
    this.gl = renderer.gl;
    this.position = new Vec3(0, 0, 0);
    this.rotation = new Vec3(0, 0, 0);
    this.scale = new Vec3(1, 1, 1);
    this.modelMatrix = new Mat4();
    this.visible = true;
    this.texture = null;
    
    this.positionBuffer = this.gl.createBuffer();
    this.normalBuffer = this.gl.createBuffer();
    this.colorBuffer = this.gl.createBuffer();
    this.indexBuffer = this.gl.createBuffer();
    this.texCoordBuffer = null;
    this.indexType = this.gl.UNSIGNED_SHORT;
    
    this.setGeometry(geometry, color);
  }
  
  setGeometry(geometry, color) {
    const vertices = geometry.vertices || [];
    const normals = geometry.normals || [];
    const indices = geometry.indices || [];
    const texCoords = geometry.texCoords || [];

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
    
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.normalBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(normals), this.gl.STATIC_DRAW);
    
    const colors = [];
    for (let i = 0; i < vertices.length / 3; i++) {
      colors.push(color[0], color[1], color[2]);
    }
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.STATIC_DRAW);
    
    if (texCoords.length > 0) {
      if (!this.texCoordBuffer) {
        this.texCoordBuffer = this.gl.createBuffer();
      }
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(texCoords), this.gl.STATIC_DRAW);
    }
    
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

    let maxIndex = 0;
    for (let i = 0; i < indices.length; i++) {
      if (indices[i] > maxIndex) {
        maxIndex = indices[i];
      }
    }

    if (maxIndex > 65535) {
      const supportsUint32 = !!this.gl.getExtension('OES_element_index_uint');
      if (!supportsUint32) {
        console.warn('32-bit indices are not supported in this browser; Burt may render incorrectly.');
        this.indexType = this.gl.UNSIGNED_SHORT;
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices.map((value) => value & 0xFFFF)), this.gl.STATIC_DRAW);
      } else {
        this.indexType = this.gl.UNSIGNED_INT;
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), this.gl.STATIC_DRAW);
      }
    } else {
      this.indexType = this.gl.UNSIGNED_SHORT;
      this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.STATIC_DRAW);
    }
    
    this.indexCount = indices.length;
  }
  
  setTexture(imagePath) {
    const texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    
    const placeholder = new Uint8Array([255, 255, 0, 255]);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 1, 1, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, placeholder);
    
    this.texture = texture;
    
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
      this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
      
      const isPowerOf2 = (value) => (value & (value - 1)) === 0;
      const isPOT = isPowerOf2(image.width) && isPowerOf2(image.height);
      
      if (isPOT) {
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.generateMipmap(this.gl.TEXTURE_2D);
      } else {
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
      }
    };
    
    image.onerror = () => console.error('Failed to load texture:', imagePath);
    image.src = imagePath;
  }
  
  updateMatrix() {
    const sx = this.scale.x, sy = this.scale.y, sz = this.scale.z;
    const rx = this.rotation.x, ry = this.rotation.y, rz = this.rotation.z;
    
    const cx = Math.cos(rx), sx_r = Math.sin(rx);
    const cy = Math.cos(ry), sy_r = Math.sin(ry);
    const cz = Math.cos(rz), sz_r = Math.sin(rz);
    
    const m00 = cy * cz;
    const m01 = cy * sz_r;
    const m02 = -sy_r;
    const m10 = sx_r * sy_r * cz - cx * sz_r;
    const m11 = sx_r * sy_r * sz_r + cx * cz;
    const m12 = sx_r * cy;
    const m20 = cx * sy_r * cz + sx_r * sz_r;
    const m21 = cx * sy_r * sz_r - sx_r * cz;
    const m22 = cx * cy;
    
    this.modelMatrix = new Mat4();
    this.modelMatrix.m[0] = m00 * sx;
    this.modelMatrix.m[1] = m01 * sx;
    this.modelMatrix.m[2] = m02 * sx;
    this.modelMatrix.m[3] = 0;
    
    this.modelMatrix.m[4] = m10 * sy;
    this.modelMatrix.m[5] = m11 * sy;
    this.modelMatrix.m[6] = m12 * sy;
    this.modelMatrix.m[7] = 0;
    
    this.modelMatrix.m[8] = m20 * sz;
    this.modelMatrix.m[9] = m21 * sz;
    this.modelMatrix.m[10] = m22 * sz;
    this.modelMatrix.m[11] = 0;
    
    this.modelMatrix.m[12] = this.position.x;
    this.modelMatrix.m[13] = this.position.y;
    this.modelMatrix.m[14] = this.position.z;
    this.modelMatrix.m[15] = 1;
  }
}

window.Mesh = Mesh;
