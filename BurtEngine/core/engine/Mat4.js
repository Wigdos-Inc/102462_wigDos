export class Mat4 {
  constructor() {
    this.m = new Float32Array(16);
    this.identity();
  }
  
  identity() {
    this.m.fill(0);
    this.m[0] = this.m[5] = this.m[10] = this.m[15] = 1;
    return this;
  }
  
  multiply(b) {
    const result = new Mat4();
    const a = this.m;
    const bm = b.m;
    const r = result.m;
    
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        r[i * 4 + j] = 
          a[i * 4 + 0] * bm[0 * 4 + j] +
          a[i * 4 + 1] * bm[1 * 4 + j] +
          a[i * 4 + 2] * bm[2 * 4 + j] +
          a[i * 4 + 3] * bm[3 * 4 + j];
      }
    }
    return result;
  }
  
  translate(x, y, z) {
    const m = new Mat4();
    m.m[12] = x;
    m.m[13] = y;
    m.m[14] = z;
    return this.multiply(m);
  }
  
  scale(x, y, z) {
    const m = new Mat4();
    m.m[0] = x;
    m.m[5] = y;
    m.m[10] = z;
    return this.multiply(m);
  }
  
  rotateX(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const m = new Mat4();
    m.m[5] = c;
    m.m[6] = s;
    m.m[9] = -s;
    m.m[10] = c;
    return this.multiply(m);
  }
  
  rotateY(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const m = new Mat4();
    m.m[0] = c;
    m.m[2] = -s;
    m.m[8] = s;
    m.m[10] = c;
    return this.multiply(m);
  }
  
  rotateZ(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const m = new Mat4();
    m.m[0] = c;
    m.m[1] = s;
    m.m[4] = -s;
    m.m[5] = c;
    return this.multiply(m);
  }
  
  perspective(fov, aspect, near, far) {
    const f = 1.0 / Math.tan(fov / 2);
    const nf = 1 / (near - far);
    
    const m = new Mat4();
    m.m[0] = f / aspect;
    m.m[5] = f;
    m.m[10] = (far + near) * nf;
    m.m[11] = -1;
    m.m[14] = 2 * far * near * nf;
    m.m[15] = 0;
    return m;
  }
  
  lookAt(eye, target, up) {
    const z = eye.sub(target).normalize();
    const x = up.cross(z).normalize();
    const y = z.cross(x);
    
    const m = new Mat4();
    m.m[0] = x.x; m.m[4] = x.y; m.m[8] = x.z; m.m[12] = -x.dot(eye);
    m.m[1] = y.x; m.m[5] = y.y; m.m[9] = y.z; m.m[13] = -y.dot(eye);
    m.m[2] = z.x; m.m[6] = z.y; m.m[10] = z.z; m.m[14] = -z.dot(eye);
    m.m[3] = 0; m.m[7] = 0; m.m[11] = 0; m.m[15] = 1;
    return m;
  }
}
