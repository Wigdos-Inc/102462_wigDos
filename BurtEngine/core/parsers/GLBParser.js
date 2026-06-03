(function() {
  'use strict';

  class GLBParser {
    constructor(renderer, camera) {
      this.renderer = renderer;
      this.camera = camera;
      this.images = {};
      this.textures = {};
      this.geometries = {};
      this.materials = {};
      this.nodes = {};
      this.animations = {};
      this.scenes = [];
    }

    async loadGLB(url) {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const glb = this.parseGLB(arrayBuffer);
      const gltf = JSON.parse(new TextDecoder().decode(glb.jsonChunk));
      this.gltf = gltf;
      this.baseUrl = new URL(url, window.location.href);
      this.buffers = [glb.binaryChunk || new Uint8Array(0)];
      await this.parseDocument(gltf);
      return this.buildModel();
    }

    parseGLB(arrayBuffer) {
      const dataView = new DataView(arrayBuffer);
      const magic = dataView.getUint32(0, true);
      if (magic !== 0x46546C67) { throw new Error('Not a valid GLB file'); }
      const version = dataView.getUint32(4, true);
      const length = dataView.getUint32(8, true);
      const jsonChunkLength = dataView.getUint32(12, true);
      const jsonChunkType = dataView.getUint32(16, true);
      if (jsonChunkType !== 0x4E4F534A) { throw new Error('First chunk must be JSON'); }
      const jsonChunk = new Uint8Array(arrayBuffer, 20, jsonChunkLength);
      const binaryChunkStart = 20 + jsonChunkLength;
      let binaryChunk = null;
      if (binaryChunkStart < length) {
        const binaryChunkLength = dataView.getUint32(binaryChunkStart, true);
        const binaryChunkType = dataView.getUint32(binaryChunkStart + 4, true);
        if (binaryChunkType === 0x004E4942) {
          binaryChunk = new Uint8Array(arrayBuffer, binaryChunkStart + 8, binaryChunkLength);
        }
      }
      return { jsonChunk, binaryChunk };
    }

    async parseDocument(gltf) {
      if (gltf.images) {
        gltf.images.forEach((image, index) => {
          this.images[`image_${index}`] = this.parseImage(image, index);
        });
      }
      if (gltf.textures) {
        gltf.textures.forEach((texture, index) => {
          this.textures[`texture_${index}`] = this.parseTexture(texture, index);
        });
      }
      if (gltf.meshes) {
        gltf.meshes.forEach((mesh, index) => {
          this.geometries[`mesh_${index}`] = this.parseMesh(mesh, index);
        });
      }
      if (gltf.materials) {
        gltf.materials.forEach((material, index) => {
          this.materials[`material_${index}`] = this.parseMaterial(material);
        });
      }
      if (gltf.nodes) {
        gltf.nodes.forEach((node, index) => {
          this.nodes[`node_${index}`] = this.parseNode(node, index);
        });
      }
      if (gltf.animations) {
        gltf.animations.forEach((animation, index) => {
          this.animations[`animation_${index}`] = this.parseAnimation(animation, index);
        });
      }
      if (gltf.scenes) {
        this.scenes = gltf.scenes;
      }
    }

    parseImage(image, index) {
      const resolvedUri = image.uri ? this.resolveUri(image.uri) : null;
      const parsedImage = {
        name: image.name || `image_${index}`,
        mimeType: image.mimeType || null,
        uri: resolvedUri,
        bufferView: image.bufferView,
        dataUri: null
      };

      if (!parsedImage.uri && image.bufferView !== undefined) {
        const data = this.getBufferViewBytes(image.bufferView);
        const mimeType = parsedImage.mimeType || 'image/png';
        parsedImage.dataUri = `data:${mimeType};base64,${this.encodeBase64(data)}`;
        parsedImage.uri = parsedImage.dataUri;
      }

      return parsedImage;
    }

    resolveUri(uri) {
      try {
        return new URL(uri, this.baseUrl).toString();
      } catch (error) {
        return uri;
      }
    }

    parseTexture(texture, index) {
      const sourceIndex = texture.source;
      return {
        name: texture.name || `texture_${index}`,
        source: sourceIndex,
        sourceImage: sourceIndex !== undefined ? this.images[`image_${sourceIndex}`] || null : null,
        sampler: texture.sampler !== undefined ? texture.sampler : null
      };
    }

    parseMesh(mesh, meshIndex) {
      const primitives = [];
      mesh.primitives.forEach((primitive, primIndex) => {
        const geometry = {
          vertices: [],
          normals: [],
          faces: [],
          uvs: [],
          name: mesh.name || `mesh_${meshIndex}_prim_${primIndex}`
        };
        const attributes = primitive.attributes;
        if (attributes.POSITION !== undefined) {
          const positions = this.getAccessorData(attributes.POSITION);
          for (let i = 0; i < positions.length; i += 3) {
            geometry.vertices.push({
              x: positions[i],
              y: positions[i + 1],
              z: positions[i + 2]
            });
          }
        }
        if (attributes.NORMAL !== undefined) {
          const normals = this.getAccessorData(attributes.NORMAL);
          for (let i = 0; i < normals.length; i += 3) {
            geometry.normals.push({
              x: normals[i],
              y: normals[i + 1],
              z: normals[i + 2]
            });
          }
        }
        if (attributes.TEXCOORD_0 !== undefined) {
          const texCoords = this.getAccessorData(attributes.TEXCOORD_0);
          for (let i = 0; i < texCoords.length; i += 2) {
            geometry.uvs.push({
              u: texCoords[i],
              v: texCoords[i + 1]
            });
          }
        }
        if (primitive.indices !== undefined) {
          const indices = this.getAccessorData(primitive.indices);
          for (let i = 0; i < indices.length; i += 3) {
            geometry.faces.push({
              v0: indices[i],
              v1: indices[i + 1],
              v2: indices[i + 2],
              n0: indices[i],
              n1: indices[i + 1],
              n2: indices[i + 2]
            });
          }
        } else {
          // Create faces from vertices without explicit indices
          const numVertices = geometry.vertices.length;
          for (let i = 0; i + 2 < numVertices; i += 3) {
            geometry.faces.push({
              v0: i,
              v1: i + 1,
              v2: i + 2,
              n0: i,
              n1: i + 1,
              n2: i + 2
            });
          }
        }
        if (primitive.material !== undefined) {
          geometry.materialIndex = primitive.material;
        }
        primitives.push(geometry);
      });
      return primitives;
    }

    parseMaterial(material) {
      const parsedMaterial = {
        name: material.name || 'material',
        color: [1.0, 1.0, 1.0, 1.0],
        baseColorTexture: null
      };
      if (material.pbrMetallicRoughness) {
        const pbr = material.pbrMetallicRoughness;
        if (pbr.baseColorFactor) {
          parsedMaterial.color = pbr.baseColorFactor;
        }
        if (pbr.baseColorTexture && pbr.baseColorTexture.index !== undefined) {
          const textureIndex = pbr.baseColorTexture.index;
          parsedMaterial.baseColorTexture = this.textures[`texture_${textureIndex}`] || {
            name: `texture_${textureIndex}`,
            source: textureIndex,
            sourceImage: null,
            sampler: null
          };
        }
      }
      return parsedMaterial;
    }

    parseNode(node, index) {
      const parsedNode = {
        name: node.name || `node_${index}`,
        mesh: node.mesh,
        children: node.children || [],
        translation: node.translation || [0, 0, 0],
        rotation: node.rotation || [0, 0, 0, 1],
        scale: node.scale || [1, 1, 1],
        matrix: node.matrix
      };
      return parsedNode;
    }

    parseAnimation(animation, index) {
      return {
        name: animation.name || `animation_${index}`,
        channels: animation.channels || [],
        samplers: animation.samplers || []
      };
    }

    getBufferViewBytes(bufferViewIndex) {
      const bufferView = this.gltf.bufferViews[bufferViewIndex];
      const buffer = this.buffers[bufferView.buffer];
      const offset = bufferView.byteOffset || 0;
      const length = bufferView.byteLength || 0;
      return new Uint8Array(buffer.buffer, buffer.byteOffset + offset, length);
    }

    encodeBase64(bytes) {
      let binary = '';
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, chunk);
      }
      return btoa(binary);
    }

    getAccessorData(accessorIndex) {
      const accessor = this.gltf.accessors[accessorIndex];
      const bufferView = this.gltf.bufferViews[accessor.bufferView];
      const buffer = this.buffers[bufferView.buffer];
      const offset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
      const componentType = accessor.componentType;
      const type = accessor.type;
      const count = accessor.count;
      const byteStride = bufferView.byteStride || 0;
      const componentsPerElement = {
        'SCALAR': 1,
        'VEC2': 2,
        'VEC3': 3,
        'VEC4': 4,
        'MAT2': 4,
        'MAT3': 9,
        'MAT4': 16
      }[type];
      let TypedArray;
      switch (componentType) {
        case 5120: TypedArray = Int8Array; break;
        case 5121: TypedArray = Uint8Array; break;
        case 5122: TypedArray = Int16Array; break;
        case 5123: TypedArray = Uint16Array; break;
        case 5125: TypedArray = Uint32Array; break;
        case 5126: TypedArray = Float32Array; break;
        default: throw new Error(`Unknown component type: ${componentType}`);
      }

      const componentByteSize = TypedArray.BYTES_PER_ELEMENT;
      const stride = byteStride || (componentByteSize * componentsPerElement);
      const dataView = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      const values = [];

      const readComponent = (byteOffset) => {
        switch (componentType) {
          case 5120: return dataView.getInt8(byteOffset);
          case 5121: return dataView.getUint8(byteOffset);
          case 5122: return dataView.getInt16(byteOffset, true);
          case 5123: return dataView.getUint16(byteOffset, true);
          case 5125: return dataView.getUint32(byteOffset, true);
          case 5126: return dataView.getFloat32(byteOffset, true);
          default: throw new Error(`Unknown component type: ${componentType}`);
        }
      };

      const normalizeComponent = (value) => {
        if (!accessor.normalized) {
          return value;
        }

        switch (componentType) {
          case 5120:
            return Math.max(value / 127.0, -1.0);
          case 5121:
            return value / 255.0;
          case 5122:
            return Math.max(value / 32767.0, -1.0);
          case 5123:
            return value / 65535.0;
          default:
            return value;
        }
      };

      for (let elementIndex = 0; elementIndex < count; elementIndex++) {
        const elementOffset = offset + elementIndex * stride;
        for (let componentIndex = 0; componentIndex < componentsPerElement; componentIndex++) {
          const componentOffset = elementOffset + componentIndex * componentByteSize;
          values.push(normalizeComponent(readComponent(componentOffset)));
        }
      }

      return values;
    }

    buildModel() {
      const model = {
        meshes: {},
        geometries: {},
        images: this.images,
        textures: this.textures,
        materials: this.materials,
        nodes: this.nodes,
        animations: this.animations,
        scenes: this.scenes,
        defaultSceneIndex: this.gltf.scene !== undefined ? this.gltf.scene : 0
      };
      Object.entries(this.geometries).forEach(([meshId, primitives]) => {
        model.meshes[meshId] = primitives;
        primitives.forEach((primitive, index) => {
          const id = `${meshId}_prim_${index}`;
          model.geometries[id] = primitive;
        });
      });
      return model;
    }

    GetMeshFromGeometry(id, color) {
      const geometry = this.geometries[id] || this.meshes[id];
      if (!geometry) {
        return null;
      }
      const primitive = Array.isArray(geometry) ? geometry[0] : geometry;
      if (!primitive) {
        return null;
      }
      return {
        vertices: primitive.vertices,
        normals: primitive.normals,
        faces: primitive.faces,
        uvs: primitive.uvs,
        color: color || [1.0, 1.0, 1.0, 1.0]
      };
    }
  }

  window.GLB = {
    Parser: GLBParser
  };
})();
