class Camera {
  constructor() {
    this.position = new Vec3(0, 5, 10);
    this.target = new Vec3(0, 0, 0);
    this.up = new Vec3(0, 1, 0);
    this.fov = Math.PI / 3;
    this.aspect = 1;
    this.near = 0.1;
    this.far = 1000;
  }
  
  lookAt(target) {
    this.target = target;
  }
  
  getViewMatrix() {
    return Mat4.lookAt(this.position, this.target, this.up);
  }
  
  getProjectionMatrix() {
    return Mat4.perspective(this.fov, this.aspect, this.near, this.far);
  }
}

window.Camera = Camera;
