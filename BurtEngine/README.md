# BurtEngine - WebGL 3D Game Engine

A lightweight, reusable WebGL-based 3D game engine designed for building 3D games in JavaScript. Originally built for the Burt World game, BurtEngine is now a standalone, game-agnostic engine that can power any browser-based 3D game.

## Quick Start

### Installation

Simply include the engine scripts in your HTML file:

```html
<!-- Core Engine (7 files) -->
<script src="path/to/BurtEngine/core/engine/Vec3.js"></script>
<script src="path/to/BurtEngine/core/engine/Mat4.js"></script>
<script src="path/to/BurtEngine/core/engine/Camera.js"></script>
<script src="path/to/BurtEngine/core/engine/Mesh.js"></script>
<script src="path/to/BurtEngine/core/engine/Renderer.js"></script>
<script src="path/to/BurtEngine/core/engine/GeometryBuilder.js"></script>
<script src="path/to/BurtEngine/core/engine/index.js"></script>

<!-- Asset Parsers -->
<script src="path/to/BurtEngine/core/parsers/ColladaParser.js"></script>
<script src="path/to/BurtEngine/core/parsers/GLBParser.js"></script>
```

All engine classes are exposed under the `window.Engine` namespace.

## Architecture

### Directory Structure

```
BurtEngine/
├── core/
│   ├── engine/              # Core rendering engine
│   │   ├── Vec3.js         # 3D vector math
│   │   ├── Mat4.js         # 4x4 matrix math
│   │   ├── Camera.js       # Camera system
│   │   ├── Mesh.js         # Mesh & model representation
│   │   ├── Renderer.js     # WebGL renderer
│   │   ├── GeometryBuilder.js  # Primitive geometry generation
│   │   └── index.js        # Engine namespace bundler
│   └── parsers/            # Asset loaders
│       ├── ColladaParser.js    # DAE (Collada) model loading
│       └── GLBParser.js        # GLB/GLTF model loading
└── README.md               # This file
```

## Core Components

### 1. **Vec3** - 3D Vector Math
Handles 3D vector operations for positions, rotations, and transformations.

```javascript
const vec = new Engine.Vec3(1, 2, 3);
const result = vec.add(new Engine.Vec3(4, 5, 6));  // [5, 7, 9]
const length = vec.length();  // Vector magnitude
const normalized = vec.normalize();  // Unit vector
```

### 2. **Mat4** - Matrix Math
4x4 matrix operations for transformations (translation, rotation, scaling).

```javascript
const matrix = new Engine.Mat4();
matrix = matrix.translate(1, 2, 3);  // Translate
matrix = matrix.rotateY(Math.PI / 4);  // Rotate around Y
matrix = matrix.scale(2, 2, 2);  // Scale

// Static methods for camera matrices
const viewMatrix = Engine.Mat4.lookAt(eye, target, up);
const projMatrix = Engine.Mat4.perspective(fov, aspect, near, far);
```

### 3. **Camera** - View & Projection
Manages camera position, target, and projection matrix.

```javascript
const camera = new Engine.Camera();
camera.position = new Engine.Vec3(0, 5, 10);
camera.target = new Engine.Vec3(0, 0, 0);
camera.fov = Math.PI / 3;  // 60 degrees
camera.aspect = window.innerWidth / window.innerHeight;
```

### 4. **Mesh** - 3D Model Representation
Represents a 3D model with geometry, transforms, and materials.

```javascript
const mesh = new Engine.Mesh(renderer, geometry, [1.0, 0.5, 0.2]);
mesh.position = new Engine.Vec3(0, 0, 0);
mesh.rotation = new Engine.Vec3(0, Math.PI / 4, 0);
mesh.scale = new Engine.Vec3(1, 1, 1);
mesh.updateMatrix();  // Recalculate transform matrix

mesh.visible = true;  // Toggle visibility
mesh.setTexture('../assets/texture.png');  // Load texture
```

### 5. **WebGLRenderer** - Rendering Engine
Manages WebGL context, shaders, and rendering pipeline.

```javascript
const renderer = new Engine.WebGLRenderer(canvas);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.clear(0.5, 0.7, 0.9);  // Clear color (sky blue)
renderer.render(meshes, camera);  // Render scene
```

### 6. **GeometryBuilder** - Primitive Geometry
Generates common 3D primitives programmatically.

```javascript
// Built-in primitives
const box = Engine.GeometryBuilder.createBox(1, 1, 1);
const sphere = Engine.GeometryBuilder.createSphere(1, 16);
const plane = Engine.GeometryBuilder.createPlane(10, 10);
const cylinder = Engine.GeometryBuilder.createCylinder(0.5, 2, 16);
const cone = Engine.GeometryBuilder.createCone(0.5, 1, 16);

// Import OBJ or other geometry
const mesh = Engine.GeometryBuilder.createMeshFromGeometry(parsedGeometry);
```

## Asset Loading

### Loading Collada Models (.dae)

```javascript
const parser = new Collada.Parser(renderer, camera);
const model = await parser.loadCollada('../assets/model.dae');

// Create mesh from loaded geometry
const mesh = new Engine.Mesh(renderer, geometry, color);
```

### Loading GLB/GLTF Models (.glb, .gltf)

```javascript
const parser = new GLB.Parser(renderer, camera);
const model = await parser.loadGLB('../assets/model.glb');

// Nodes and animations are parsed automatically
```

## Building a Game

### Basic Setup

```javascript
class MyGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.renderer = new Engine.WebGLRenderer(this.canvas);
    this.camera = new Engine.Camera();
    this.scene = [];  // Array of meshes to render
    
    this.setup();
    this.animate();
  }
  
  setup() {
    // Create geometry
    const boxGeom = Engine.GeometryBuilder.createBox(1, 1, 1);
    
    // Create mesh
    const mesh = new Engine.Mesh(
      this.renderer,
      boxGeom,
      [1.0, 0.5, 0.2]  // Color: orange
    );
    
    this.scene.push(mesh);
  }
  
  animate() {
    requestAnimationFrame(() => this.animate());
    
    // Update
    this.update(0.016);  // ~60 FPS
    
    // Render
    this.renderer.render(this.scene, this.camera);
  }
  
  update(deltaTime) {
    // Update game logic
  }
}

// Start the game
const game = new MyGame();
```

## Advanced Features

### Transform Matrices

Meshes use matrix transformations for positioning and rotating:

```javascript
mesh.position = new Engine.Vec3(5, 0, 0);     // X position
mesh.rotation = new Engine.Vec3(0, PI/4, 0);  // Y rotation (45°)
mesh.scale = new Engine.Vec3(2, 1, 2);        // Scale XYZ
mesh.updateMatrix();  // Apply changes (call after modifying transform)
```

### Lighting

The renderer includes Phong-style lighting:

```javascript
// Light position and ambient color are set in Renderer.renderMesh()
// Modify light position in the renderer source for custom lighting
```

### Textures

Load and apply textures to meshes:

```javascript
mesh.setTexture('../assets/texture.png');
// Textures are automatically mipmapped if power-of-2
```

### Math Utilities

```javascript
const radians = Engine.MathUtils.degToRad(45);   // Convert degrees to radians
const degrees = Engine.MathUtils.radToDeg(Math.PI / 4);  // Convert radians to degrees
```

## Performance Tips

1. **Reuse Geometries**: Create geometry once, use for multiple meshes
2. **Batch Rendering**: Group similar objects together in scene array
3. **Frustum Culling**: Manually set `mesh.visible = false` for off-screen objects
4. **LOD (Level of Detail)**: Use lower-poly models for distant objects
5. **Texture Atlasing**: Combine multiple textures into single atlas

## Math Reference

### Vector Operations
```javascript
v1.add(v2)           // Add vectors
v1.sub(v2)           // Subtract vectors
v1.mul(scalar)       // Scale vector
v1.dot(v2)           // Dot product
v1.cross(v2)         // Cross product
v1.length()          // Vector magnitude
v1.normalize()       // Unit vector
v1.distance(v2)      // Distance between vectors
```

### Matrix Operations
```javascript
m1.multiply(m2)      // Matrix multiplication
m.translate(x, y, z) // Translation
m.rotateX/Y/Z(angle) // Rotation around axes
m.scale(x, y, z)     // Scaling
m.identity()         // Reset to identity
```

### Camera
```javascript
Mat4.lookAt(eye, target, up)           // View matrix
Mat4.perspective(fov, aspect, near, far) // Projection matrix
```

## Browser Compatibility

- **Requires**: WebGL 1.0 support
- **Tested**: Chrome, Firefox, Safari, Edge (2020+)
- **Mobile**: iOS Safari, Android Chrome

## License

BurtEngine is part of the Burt World project. Use freely in your projects!

## Contributing

The engine is designed to be modular and extensible. Common extensions:

- **Physics Engine**: Add Cannon.js or similar
- **Sound**: Integrate audio library
- **UI**: Build UI system on top
- **Networking**: Add multiplayer support
- **Mobile**: Add touch controls

---

**Built with ❤️ for WebGL game developers**
