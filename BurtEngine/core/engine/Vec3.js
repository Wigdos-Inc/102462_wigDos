class Vec3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  
  add(v) {
    return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z);
  }
  
  sub(v) {
    return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z);
  }
  
  mul(s) {
    return new Vec3(this.x * s, this.y * s, this.z * s);
  }
  
  dot(v) {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }
  
  cross(v) {
    return new Vec3(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x
    );
  }
  
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }
  
  normalize() {
    const len = this.length();
    return len > 0 ? this.mul(1 / len) : new Vec3(0, 0, 0);
  }
  
  clone() {
    return new Vec3(this.x, this.y, this.z);
  }
  
  distance(v) {
    return this.sub(v).length();
  }
}

window.Vec3 = Vec3;
