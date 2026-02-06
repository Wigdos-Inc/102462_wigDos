import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.154.0/build/three.module.js';

// Create procedural palm tree
export function createPalmTree(x, z, scale = 1) {
  const group = new THREE.Group();
  
  // Trunk with segments
  const trunkSegments = 5;
  for (let i = 0; i < trunkSegments; i++) {
    const segment = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25*scale, 0.28*scale, 1.2*scale, 6),
      new THREE.MeshStandardMaterial({ color: 0x8b6f47, roughness: 0.9 })
    );
    segment.position.y = i * 1.1 * scale;
    segment.rotation.y = (i * 0.3);
    segment.castShadow = true;
    group.add(segment);
  }
  
  // Palm leaves
  const leafCount = 8;
  for (let i = 0; i < leafCount; i++) {
    const angle = (i / leafCount) * Math.PI * 2;
    const leafGroup = new THREE.Group();
    
    // Leaf blade (multiple segments for curve)
    for (let j = 0; j < 4; j++) {
      const leafPart = new THREE.Mesh(
        new THREE.BoxGeometry(0.4*scale, 0.05*scale, 1.5*scale),
        new THREE.MeshStandardMaterial({ color: 0x228b22, side: THREE.DoubleSide })
      );
      leafPart.position.z = j * 1.3 * scale;
      leafPart.rotation.x = -j * 0.15;
      leafPart.castShadow = true;
      leafGroup.add(leafPart);
    }
    
    leafGroup.rotation.y = angle;
    leafGroup.rotation.z = -0.3;
    leafGroup.position.y = trunkSegments * 1.1 * scale;
    group.add(leafGroup);
  }
  
  group.position.set(x, 0, z);
  return group;
}

// Create jungle hut
export function createHut(x, z, scale = 1) {
  const group = new THREE.Group();
  
  // Base platform
  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(3*scale, 3.2*scale, 0.3*scale, 8),
    new THREE.MeshStandardMaterial({ color: 0x8b7355 })
  );
  platform.position.y = 0.15*scale;
  platform.castShadow = true;
  platform.receiveShadow = true;
  group.add(platform);
  
  // Walls
  const wallHeight = 3*scale;
  const walls = new THREE.Mesh(
    new THREE.CylinderGeometry(2.5*scale, 2.5*scale, wallHeight, 6),
    new THREE.MeshStandardMaterial({ color: 0xa0826d, roughness: 0.9 })
  );
  walls.position.y = wallHeight/2 + 0.3*scale;
  walls.castShadow = true;
  walls.receiveShadow = true;
  group.add(walls);
  
  // Roof (cone)
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(3.5*scale, 2.5*scale, 6),
    new THREE.MeshStandardMaterial({ color: 0x6b5d3f })
  );
  roof.position.y = wallHeight + 1.25*scale + 0.3*scale;
  roof.castShadow = true;
  group.add(roof);
  
  // Door opening
  const doorway = new THREE.Mesh(
    new THREE.BoxGeometry(1*scale, 1.8*scale, 0.5*scale),
    new THREE.MeshStandardMaterial({ color: 0x4a3728 })
  );
  doorway.position.set(0, 0.9*scale + 0.3*scale, 2.3*scale);
  group.add(doorway);
  
  // Window
  const window1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.6*scale, 0.6*scale, 0.2*scale),
    new THREE.MeshStandardMaterial({ color: 0xffeb3b, emissive: 0xffeb3b, emissiveIntensity: 0.3 })
  );
  window1.position.set(1.5*scale, 2*scale, 1.5*scale);
  window1.rotation.y = Math.PI / 6;
  group.add(window1);
  
  const window2 = window1.clone();
  window2.position.set(-1.5*scale, 2*scale, 1.5*scale);
  window2.rotation.y = -Math.PI / 6;
  group.add(window2);
  
  group.position.set(x, 0, z);
  return group;
}

// Terrain system with height variation
export class Terrain {
  constructor(scene, width = 300, depth = 300, segments = 50) {
    this.width = width;
    this.depth = depth;
    this.segments = segments;
    this.heights = [];
    
    // Generate height map
    for (let i = 0; i <= segments; i++) {
      this.heights[i] = [];
      for (let j = 0; j <= segments; j++) {
        const x = (i / segments - 0.5) * width;
        const z = (j / segments - 0.5) * depth;
        // Multi-octave noise simulation
        const h = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 3 +
                  Math.sin(x * 0.1 + z * 0.1) * 1.5 +
                  Math.sin(x * 0.2) * 0.5;
        this.heights[i][j] = Math.max(0, h);
      }
    }
    
    // Create mesh
    const geometry = new THREE.PlaneGeometry(width, depth, segments, segments);
    geometry.rotateX(-Math.PI / 2);
    
    const vertices = geometry.attributes.position.array;
    for (let i = 0, j = 0; i < vertices.length; i += 3, j++) {
      const x = Math.floor(j / (segments + 1));
      const z = j % (segments + 1);
      vertices[i + 1] = this.heights[x][z];
    }
    geometry.computeVertexNormals();
    
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x4a7c3f,
      roughness: 0.9,
      metalness: 0.1
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    scene.add(mesh);
    
    this.mesh = mesh;
  }
  
  getHeightAt(x, z) {
    // Convert world coords to grid coords
    const gx = ((x / this.width) + 0.5) * this.segments;
    const gz = ((z / this.depth) + 0.5) * this.segments;
    
    // Bounds check
    if (gx < 0 || gx >= this.segments || gz < 0 || gz >= this.segments) {
      return 0;
    }
    
    // Bilinear interpolation
    const x0 = Math.floor(gx);
    const x1 = Math.min(x0 + 1, this.segments);
    const z0 = Math.floor(gz);
    const z1 = Math.min(z0 + 1, this.segments);
    
    const fx = gx - x0;
    const fz = gz - z0;
    
    const h00 = this.heights[x0][z0] || 0;
    const h10 = this.heights[x1][z0] || 0;
    const h01 = this.heights[x0][z1] || 0;
    const h11 = this.heights[x1][z1] || 0;
    
    const h0 = h00 * (1 - fx) + h10 * fx;
    const h1 = h01 * (1 - fx) + h11 * fx;
    
    return h0 * (1 - fz) + h1 * fz;
  }
}

// Waterfall effect
export function createWaterfall(x, z, height = 8) {
  const group = new THREE.Group();
  
  // Rock cliff
  const cliff = new THREE.Mesh(
    new THREE.BoxGeometry(8, height, 3),
    new THREE.MeshStandardMaterial({ color: 0x6b6b6b, roughness: 0.95 })
  );
  cliff.position.y = height / 2;
  cliff.castShadow = true;
  cliff.receiveShadow = true;
  group.add(cliff);
  
  // Water stream
  const waterGeo = new THREE.PlaneGeometry(3, height, 1, 10);
  const waterMat = new THREE.MeshStandardMaterial({ 
    color: 0x4fc3f7,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.set(0, height/2, 1.6);
  group.add(water);
  
  // Animate water
  group.userData.update = function(dt) {
    const vertices = water.geometry.attributes.position.array;
    const time = Date.now() * 0.003;
    for (let i = 0; i < vertices.length; i += 3) {
      const y = vertices[i + 1];
      vertices[i] = Math.sin(y * 0.5 + time) * 0.3;
    }
    water.geometry.attributes.position.needsUpdate = true;
  };
  
  group.position.set(x, 0, z);
  return group;
}

// Decorative rocks
export function createRock(x, z, scale = 1) {
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.8*scale, 0),
    new THREE.MeshStandardMaterial({ color: 0x5a5a5a, roughness: 1 })
  );
  rock.position.set(x, 0.4*scale, z);
  rock.rotation.set(Math.random(), Math.random(), Math.random());
  rock.castShadow = true;
  rock.receiveShadow = true;
  return rock;
}

// Jungle foliage
export function createBush(x, z, scale = 1) {
  const group = new THREE.Group();
  const bushMat = new THREE.MeshStandardMaterial({ color: 0x2d5016 });
  
  for (let i = 0; i < 3; i++) {
    const bush = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.5*scale + Math.random()*0.3*scale, 1),
      bushMat
    );
    bush.position.set(
      (Math.random() - 0.5) * scale,
      0.3*scale,
      (Math.random() - 0.5) * scale
    );
    bush.castShadow = true;
    group.add(bush);
  }
  
  group.position.set(x, 0, z);
  return group;
}
