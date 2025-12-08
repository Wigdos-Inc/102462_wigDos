/**
 * Matrix4 - 4x4 Matrix mathematics for 3D transformations
 */
class Matrix4 {
    constructor(elements = null) {
        this.elements = elements || new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    }
    
    // Matrix multiplication
    multiply(other) {
        const a = this.elements;
        const b = other.elements;
        const result = new Float32Array(16);
        
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                result[i * 4 + j] = 
                    a[i * 4 + 0] * b[0 * 4 + j] +
                    a[i * 4 + 1] * b[1 * 4 + j] +
                    a[i * 4 + 2] * b[2 * 4 + j] +
                    a[i * 4 + 3] * b[3 * 4 + j];
            }
        }
        
        return new Matrix4(result);
    }
    
    // Create translation matrix
    static translation(x, y, z) {
        return new Matrix4(new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            x, y, z, 1
        ]));
    }
    
    // Create scale matrix
    static scale(x, y, z) {
        return new Matrix4(new Float32Array([
            x, 0, 0, 0,
            0, y, 0, 0,
            0, 0, z, 0,
            0, 0, 0, 1
        ]));
    }
    
    // Create rotation matrix around X axis
    static rotationX(angle) {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        return new Matrix4(new Float32Array([
            1, 0, 0, 0,
            0, c, s, 0,
            0, -s, c, 0,
            0, 0, 0, 1
        ]));
    }
    
    // Create rotation matrix around Y axis
    static rotationY(angle) {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        return new Matrix4(new Float32Array([
            c, 0, -s, 0,
            0, 1, 0, 0,
            s, 0, c, 0,
            0, 0, 0, 1
        ]));
    }
    
    // Create rotation matrix around Z axis
    static rotationZ(angle) {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        return new Matrix4(new Float32Array([
            c, s, 0, 0,
            -s, c, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]));
    }
    
    // Create perspective projection matrix
    static perspective(fovY, aspect, near, far) {
        const f = 1.0 / Math.tan(fovY * Math.PI / 180 / 2);
        const rangeInv = 1.0 / (near - far);
        
        return new Matrix4(new Float32Array([
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (near + far) * rangeInv, -1,
            0, 0, near * far * rangeInv * 2, 0
        ]));
    }
    
    // Create orthographic projection matrix
    static orthographic(left, right, bottom, top, near, far) {
        const w = right - left;
        const h = top - bottom;
        const d = far - near;
        
        return new Matrix4(new Float32Array([
            2 / w, 0, 0, 0,
            0, 2 / h, 0, 0,
            0, 0, -2 / d, 0,
            -(right + left) / w, -(top + bottom) / h, -(far + near) / d, 1
        ]));
    }
    
    // Create look-at view matrix
    static lookAt(eye, target, up) {
        const zAxis = eye.subtract(target).normalize();
        const xAxis = up.cross(zAxis).normalize();
        const yAxis = zAxis.cross(xAxis);
        
        return new Matrix4(new Float32Array([
            xAxis.x, yAxis.x, zAxis.x, 0,
            xAxis.y, yAxis.y, zAxis.y, 0,
            xAxis.z, yAxis.z, zAxis.z, 0,
            -xAxis.dot(eye), -yAxis.dot(eye), -zAxis.dot(eye), 1
        ]));
    }
    
    // Create identity matrix
    static identity() {
        return new Matrix4();
    }
    
    // Transform a Vector3 point
    transformPoint(vec) {
        const x = this.elements[0] * vec.x + this.elements[4] * vec.y + this.elements[8] * vec.z + this.elements[12];
        const y = this.elements[1] * vec.x + this.elements[5] * vec.y + this.elements[9] * vec.z + this.elements[13];
        const z = this.elements[2] * vec.x + this.elements[6] * vec.y + this.elements[10] * vec.z + this.elements[14];
        return new Vector3(x, y, z);
    }
}