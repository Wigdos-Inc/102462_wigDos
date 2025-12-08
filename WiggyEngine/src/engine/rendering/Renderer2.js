/**
 * Simple WebGL Renderer for Scene Editor
 */
class Renderer2 {
    constructor() {
        this.canvas = null;
        this.gl = null;
        this.programs = new Map();
        this.meshes = new Map();
        
        this.viewMatrix = Matrix4.identity();
        this.projectionMatrix = Matrix4.identity();
        this.renderMode = '3d';
        
        this.selectedObjects = new Set();
        this.wireframeMode = false;
        this.gridVisible = true;
    }
    
    async initialize(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            throw new Error(`Canvas with id "${canvasId}" not found`);
        }
        
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!this.gl) {
            throw new Error('WebGL not supported');
        }
        
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.enable(this.gl.CULL_FACE);
        this.gl.viewport(0, 0, canvas.width, canvas.height);
        
        this.createShaders();
        this.createMeshes();
        
        console.log('Renderer initialized');
    }
    
    createShaders() {
        // Simple 3D shader
        const vertexShader = `
            attribute vec3 a_position;
            attribute vec3 a_normal;
            
            uniform mat4 u_modelMatrix;
            uniform mat4 u_viewMatrix;
            uniform mat4 u_projectionMatrix;
            
            varying vec3 v_normal;
            
            void main() {
                v_normal = a_normal;
                gl_Position = u_projectionMatrix * u_viewMatrix * u_modelMatrix * vec4(a_position, 1.0);
            }
        `;
        
        const fragmentShader = `
            precision mediump float;
            
            uniform vec3 u_color;
            varying vec3 v_normal;
            
            void main() {
                float lighting = dot(normalize(v_normal), normalize(vec3(0.5, 1.0, 0.3))) * 0.5 + 0.5;
                gl_FragColor = vec4(u_color * lighting, 1.0);
            }
        `;
        
        this.programs.set('standard', this.createProgram(vertexShader, fragmentShader));
        
        // Grid shader
        const gridVertexShader = `
            attribute vec3 a_position;
            uniform mat4 u_viewMatrix;
            uniform mat4 u_projectionMatrix;
            
            void main() {
                gl_Position = u_projectionMatrix * u_viewMatrix * vec4(a_position, 1.0);
            }
        `;
        
        const gridFragmentShader = `
            precision mediump float;
            uniform vec3 u_color;
            
            void main() {
                gl_FragColor = vec4(u_color, 0.3);
            }
        `;
        
        this.programs.set('grid', this.createProgram(gridVertexShader, gridFragmentShader));
    }
    
    createProgram(vertexSource, fragmentSource) {
        const gl = this.gl;
        
        const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentSource);
        
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const error = gl.getProgramInfoLog(program);
            throw new Error('Shader program error: ' + error);
        }
        
        // Get locations
        const attributes = {};
        const uniforms = {};
        
        const numAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
        for (let i = 0; i < numAttributes; i++) {
            const attribute = gl.getActiveAttrib(program, i);
            attributes[attribute.name] = gl.getAttribLocation(program, attribute.name);
        }
        
        const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < numUniforms; i++) {
            const uniform = gl.getActiveUniform(program, i);
            uniforms[uniform.name] = gl.getUniformLocation(program, uniform.name);
        }
        
        return { program, attributes, uniforms };
    }
    
    createShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const error = gl.getShaderInfoLog(shader);
            throw new Error(`Shader compile error: ${error}`);
        }
        
        return shader;
    }
    
    createMeshes() {
        this.createCube();
        this.createGrid();
    }
    
    createCube() {
        const vertices = new Float32Array([
            // Front
            -1, -1,  1,  0,  0,  1,
             1, -1,  1,  0,  0,  1,
             1,  1,  1,  0,  0,  1,
            -1,  1,  1,  0,  0,  1,
            
            // Back
            -1, -1, -1,  0,  0, -1,
            -1,  1, -1,  0,  0, -1,
             1,  1, -1,  0,  0, -1,
             1, -1, -1,  0,  0, -1,
            
            // Top
            -1,  1, -1,  0,  1,  0,
            -1,  1,  1,  0,  1,  0,
             1,  1,  1,  0,  1,  0,
             1,  1, -1,  0,  1,  0,
            
            // Bottom
            -1, -1, -1,  0, -1,  0,
             1, -1, -1,  0, -1,  0,
             1, -1,  1,  0, -1,  0,
            -1, -1,  1,  0, -1,  0,
            
            // Right
             1, -1, -1,  1,  0,  0,
             1,  1, -1,  1,  0,  0,
             1,  1,  1,  1,  0,  0,
             1, -1,  1,  1,  0,  0,
            
            // Left
            -1, -1, -1, -1,  0,  0,
            -1, -1,  1, -1,  0,  0,
            -1,  1,  1, -1,  0,  0,
            -1,  1, -1, -1,  0,  0
        ]);
        
        const indices = new Uint16Array([
             0,  1,  2,   0,  2,  3,   // Front
             4,  5,  6,   4,  6,  7,   // Back
             8,  9, 10,   8, 10, 11,   // Top
            12, 13, 14,  12, 14, 15,   // Bottom
            16, 17, 18,  16, 18, 19,   // Right
            20, 21, 22,  20, 22, 23    // Left
        ]);
        
        this.meshes.set('cube', this.createMesh(vertices, indices, 6));
    }
    
    createGrid() {
        const vertices = [];
        const indices = [];
        const size = 50;
        
        let index = 0;
        for (let i = -size; i <= size; i += 1) {
            // Horizontal lines
            vertices.push(-size, 0, i);
            vertices.push(size, 0, i);
            indices.push(index, index + 1);
            index += 2;
            
            // Vertical lines
            vertices.push(i, 0, -size);
            vertices.push(i, 0, size);
            indices.push(index, index + 1);
            index += 2;
        }
        
        this.meshes.set('grid', this.createMesh(new Float32Array(vertices), new Uint16Array(indices), 3, this.gl.LINES));
    }
    
    createMesh(vertices, indices, stride, primitive = null) {
        const gl = this.gl;
        
        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        
        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
        
        return {
            vertexBuffer,
            indexBuffer,
            indexCount: indices.length,
            stride: stride * 4,
            primitive: primitive || gl.TRIANGLES
        };
    }
    
    render(scene, camera) {
        const gl = this.gl;
        
        gl.clearColor(0.2, 0.2, 0.2, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        if (!camera) return;
        
        this.updateCamera(camera);
        
        if (this.renderMode === '3d') {
            this.render3D(scene);
        }
        
        if (this.gridVisible) {
            this.renderGrid();
        }
    }
    
    updateCamera(camera) {
        const aspect = this.canvas.width / this.canvas.height;
        
        this.projectionMatrix = Matrix4.perspective(
            camera.fov || 45,
            aspect,
            camera.near || 0.1,
            camera.far || 1000
        );
        
        this.viewMatrix = Matrix4.lookAt(
            camera.position || new Vector3(0, 5, 10),
            camera.target || new Vector3(0, 0, 0),
            camera.up || new Vector3(0, 1, 0)
        );
    }
    
    render3D(scene) {
        if (!scene || !scene.objects) return;
        
        const gl = this.gl;
        const program = this.programs.get('standard');
        
        gl.useProgram(program.program);
        gl.uniformMatrix4fv(program.uniforms.u_viewMatrix, false, this.viewMatrix.elements);
        gl.uniformMatrix4fv(program.uniforms.u_projectionMatrix, false, this.projectionMatrix.elements);
        
        for (const gameObject of scene.objects) {
            this.renderGameObject(gameObject, program);
        }
    }
    
    renderGameObject(gameObject, program) {
        const gl = this.gl;
        const mesh = this.meshes.get('cube');
        if (!mesh) return;
        
        const transform = gameObject.transform || {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 }
        };
        
        const modelMatrix = Matrix4.translation(transform.position.x, transform.position.y, transform.position.z)
            .multiply(Matrix4.rotationX(transform.rotation.x * Math.PI / 180))
            .multiply(Matrix4.rotationY(transform.rotation.y * Math.PI / 180))
            .multiply(Matrix4.rotationZ(transform.rotation.z * Math.PI / 180))
            .multiply(Matrix4.scale(transform.scale.x, transform.scale.y, transform.scale.z));
        
        gl.uniformMatrix4fv(program.uniforms.u_modelMatrix, false, modelMatrix.elements);
        
        const isSelected = this.selectedObjects.has(gameObject.id);
        const color = isSelected ? [1, 0.5, 0] : [0.7, 0.7, 0.8];
        gl.uniform3fv(program.uniforms.u_color, new Float32Array(color));
        
        this.bindAndDrawMesh(mesh, program);
    }
    
    bindAndDrawMesh(mesh, program) {
        const gl = this.gl;
        
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer);
        
        if (program.attributes.a_position !== -1) {
            gl.enableVertexAttribArray(program.attributes.a_position);
            gl.vertexAttribPointer(program.attributes.a_position, 3, gl.FLOAT, false, mesh.stride, 0);
        }
        
        if (program.attributes.a_normal !== -1) {
            gl.enableVertexAttribArray(program.attributes.a_normal);
            gl.vertexAttribPointer(program.attributes.a_normal, 3, gl.FLOAT, false, mesh.stride, 12);
        }
        
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
        gl.drawElements(mesh.primitive, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
    }
    
    renderGrid() {
        const gl = this.gl;
        const program = this.programs.get('grid');
        const mesh = this.meshes.get('grid');
        
        if (!program || !mesh) return;
        
        gl.useProgram(program.program);
        gl.uniformMatrix4fv(program.uniforms.u_viewMatrix, false, this.viewMatrix.elements);
        gl.uniformMatrix4fv(program.uniforms.u_projectionMatrix, false, this.projectionMatrix.elements);
        gl.uniform3fv(program.uniforms.u_color, new Float32Array([0.5, 0.5, 0.5]));
        
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer);
        gl.enableVertexAttribArray(program.attributes.a_position);
        gl.vertexAttribPointer(program.attributes.a_position, 3, gl.FLOAT, false, mesh.stride, 0);
        
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
        gl.drawElements(mesh.primitive, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
        
        gl.disable(gl.BLEND);
    }
    
    // Editor API
    setRenderMode(mode) {
        this.renderMode = mode;
    }
    
    selectObject(gameObject) {
        this.selectedObjects.clear();
        if (gameObject) {
            this.selectedObjects.add(gameObject);
        }
    }
    
    setGridVisible(visible) {
        this.gridVisible = visible;
    }
    
    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.gl.viewport(0, 0, width, height);
    }
}