export class GeometryBuilder {
createBox(width = 1, height = 1, depth = 1) {
    const w = width / 2, h = height / 2, d = depth / 2;
    const vertices = [-w,-h,d,w,-h,d,w,h,d,-w,h,d,-w,-h,-d,-w,h,-d,w,h,-d,w,-h,-d,-w,h,-d,-w,h,d,w,h,d,w,h,-d,-w,-h,-d,w,-h,-d,w,-h,d,-w,-h,d,w,-h,-d,w,h,-d,w,h,d,w,-h,d,-w,-h,-d,-w,-h,d,-w,h,d,-w,h,-d];
    const normals = [0,0,1,0,0,1,0,0,1,0,0,1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,1,0,0,1,0,0,1,0,0,1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,1,0,0,1,0,0,1,0,0,1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0];
    const indices = [0,1,2,0,2,3,4,5,6,4,6,7,8,9,10,8,10,11,12,13,14,12,14,15,16,17,18,16,18,19,20,21,22,20,22,23];
    const texCoords = [0,0,1,0,1,1,0,1,0,0,1,0,1,1,0,1,0,0,1,0,1,1,0,1,0,0,1,0,1,1,0,1,0,0,1,0,1,1,0,1,0,0,1,0,1,1,0,1];
    return { vertices, normals, indices, texCoords };
  }
  
createSphere(radius = 1, segments = 16) {
    const vertices = [], normals = [], indices = [];
    for (let lat = 0; lat <= segments; lat++) {
      const theta = (lat * Math.PI) / segments;
      const sinTheta = Math.sin(theta), cosTheta = Math.cos(theta);
      for (let lon = 0; lon <= segments; lon++) {
        const phi = (lon * 2 * Math.PI) / segments;
        const x = Math.cos(phi) * sinTheta, y = cosTheta, z = Math.sin(phi) * sinTheta;
        vertices.push(radius * x, radius * y, radius * z);
        normals.push(x, y, z);
      }
    }
    for (let lat = 0; lat < segments; lat++) {
      for (let lon = 0; lon < segments; lon++) {
        const first = lat * (segments + 1) + lon, second = first + segments + 1;
        indices.push(first, second, first + 1, second, second + 1, first + 1);
      }
    }
    const texCoords = Array(vertices.length / 3 * 2).fill(0.5);
    return { vertices, normals, indices, texCoords };
  }
  
createPlane(width = 10, depth = 10, segments = 10) {
    const vertices = [], normals = [], indices = [], texCoords = [];
    const w = width / 2, d = depth / 2;
    for (let z = 0; z <= segments; z++) {
      for (let x = 0; x <= segments; x++) {
        vertices.push((x / segments) * width - w, 0, (z / segments) * depth - d);
        normals.push(0, 1, 0);
        texCoords.push(x / segments, z / segments);
      }
    }
    for (let z = 0; z < segments; z++) {
      for (let x = 0; x < segments; x++) {
        const a = z * (segments + 1) + x, b = a + 1, c = a + segments + 1, d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
    return { vertices, normals, indices, texCoords };
  }
  
createCylinder(radius = 0.5, height = 2, segments = 16) {
    const vertices = [], normals = [], indices = [], texCoords = [];
    const h = height / 2;
    
    vertices.push(0, h, 0); normals.push(0, 1, 0); texCoords.push(0.5, 0.5);
    vertices.push(0, -h, 0); normals.push(0, -1, 0); texCoords.push(0.5, 0.5);
    
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
      vertices.push(x, h, z); normals.push(0, 1, 0); texCoords.push(0.5, 0.5);
      vertices.push(x, h, z); normals.push(x / radius, 0, z / radius); texCoords.push(i / segments, 0);
      vertices.push(x, -h, z); normals.push(x / radius, 0, z / radius); texCoords.push(i / segments, 1);
      vertices.push(x, -h, z); normals.push(0, -1, 0); texCoords.push(0.5, 0.5);
    }
    
    for (let i = 0; i < segments; i++) {
      const base = 2 + i * 4;
      indices.push(0, base, base + 4);
      indices.push(base + 1, base + 2, base + 5);
      indices.push(base + 2, base + 6, base + 5);
      indices.push(1, base + 7, base + 3);
    }
    return { vertices, normals, indices, texCoords };
  }
  
createCone(radius = 0.5, height = 1, segments = 16) {
    const vertices = [], normals = [], indices = [], texCoords = [];
    
    vertices.push(0, height, 0); normals.push(0, 1, 0); texCoords.push(0.5, 0.5);
    vertices.push(0, 0, 0); normals.push(0, -1, 0); texCoords.push(0.5, 0.5);
    
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
      vertices.push(x, 0, z);
      normals.push(Math.cos(angle), 0.5, Math.sin(angle));
      texCoords.push(i / segments, 0);
      vertices.push(x, 0, z);
      normals.push(0, -1, 0);
      texCoords.push(0.5, 0.5);
    }
    
    for (let i = 0; i < segments; i++) {
      const base = 2 + i * 2;
      indices.push(0, base, base + 2);
      indices.push(1, base + 3, base + 1);
    }
    return { vertices, normals, indices, texCoords };
  }
  
createMeshFromGeometry(geom, color = [1, 1, 1, 1]) {
    if (!geom || !geom.vertices || geom.vertices.length === 0) {
      console.error('Invalid geometry: no vertices');
      return this.createBox(1, 1, 1); // Fallback
    }

    const vertices = [], normals = [], indices = [], texCoords = [];
    const usedIndices = new Set();
    
    geom.faces.forEach((face, faceIdx) => {
      if (!face) return;
      
      const v0 = geom.vertices[face.v0];
      const v1 = geom.vertices[face.v1];
      const v2 = geom.vertices[face.v2];
      
      // Validate vertices exist
      if (!v0 || !v1 || !v2) {
        console.warn(`Face ${faceIdx} has invalid vertex references`);
        return;
      }
      
      // Get normals
      let n0, n1, n2;
      
      // Try to get normals from face references first
      if (face.n0 !== undefined && face.n1 !== undefined && face.n2 !== undefined) {
        n0 = geom.normals && geom.normals[face.n0];
        n1 = geom.normals && geom.normals[face.n1];
        n2 = geom.normals && geom.normals[face.n2];
      }
      
      // Fallback to vertex normals
      if (!n0 && geom.normals && geom.normals[face.v0]) {
        n0 = geom.normals[face.v0];
        n1 = geom.normals[face.v1];
        n2 = geom.normals[face.v2];
      }
      
      // Calculate normals if needed
      if (!n0 || !n1 || !n2) {
        const edge1 = new Vec3(v1.x - v0.x, v1.y - v0.y, v1.z - v0.z);
        const edge2 = new Vec3(v2.x - v0.x, v2.y - v0.y, v2.z - v0.z);
        const normal = edge1.cross(edge2).normalize();
        n0 = n1 = n2 = normal;
      }
      
      const baseIndex = vertices.length / 3;
      
      // Add vertex data
      vertices.push(v0.x, v0.y, v0.z, v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
      normals.push(n0.x, n0.y, n0.z, n1.x, n1.y, n1.z, n2.x, n2.y, n2.z);
      
      // Add texture coordinates
      if (geom.uvs && geom.uvs.length > 0) {
        const uv0 = geom.uvs[face.v0] || { u: 0, v: 0 };
        const uv1 = geom.uvs[face.v1] || { u: 0, v: 0 };
        const uv2 = geom.uvs[face.v2] || { u: 0, v: 0 };
        texCoords.push(uv0.u, uv0.v, uv1.u, uv1.v, uv2.u, uv2.v);
      } else {
        texCoords.push(0, 0, 1, 0, 0.5, 1);
      }
      
      // Add face indices
      indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
    });
    
    if (vertices.length === 0) {
      console.error('Geometry created no vertices after processing');
      return this.createBox(1, 1, 1); // Fallback
    }

    console.log('Geometry builder result:', {
      vertices: vertices.length / 3,
      faces: indices.length / 3,
      normals: normals.length / 3
    });

    return { vertices, normals, indices, texCoords };
  }

createGrid() {
    const vertices = [];
    const indices = [];
    const normals = [];
    const texCoords = [];
    const size = 50;

    let index = 0;

    function addVertex(x, y, z) {
        vertices.push(x, y, z);

        // Up-facing normal
        normals.push(0, 1, 0);

        // UV mapping across the grid
        texCoords.push(
            (x + size) / (size * 2),
            (z + size) / (size * 2)
        );

        return index++;
    }

    for (let i = -size; i <= size; i++) {
        // Horizontal line
        const h0 = addVertex(-size, 0, i);
        const h1 = addVertex(size, 0, i);
        indices.push(h0, h1);

        // Vertical line
        const v0 = addVertex(i, 0, -size);
        const v1 = addVertex(i, 0, size);
        indices.push(v0, v1);
    }

    return {vertices, normals, indices, texCoords};
}
}

export const MathUtils = {
  degToRad: (degrees) => degrees * (Math.PI / 180),
  radToDeg: (radians) => radians * (180 / Math.PI)
};
