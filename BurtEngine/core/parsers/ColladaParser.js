export class ColladaParser {
    constructor(renderer, camera) {
      this.geometries = {};
      this.animations = {};
      this.materials = {};
      this.effects = {};
      this.controllers = {};
      this.visualScenes = {};
      this.images = {};
      this.textures = {};
      this.nodes = {};
      this.joints = [];
      this.armatures = [];
      this.canvas = null;
    }

    async loadCollada(url) {
      const response = await fetch(url);
      const text = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');
      
      if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
        throw new Error('Failed to parse Collada XML');
      }

      this.parseDocument(xmlDoc);
      return this.buildModel();
    }

    parseDocument(xmlDoc) {
      this.parseDOMLibrary(xmlDoc, 'geometries', 'geometry');
      this.parseDOMLibrary(xmlDoc, 'animations', 'animation');
      this.parseDOMLibrary(xmlDoc, 'materials', 'material');
      this.parseDOMLibrary(xmlDoc, 'effects', 'effect');
      this.parseDOMLibrary(xmlDoc, 'controllers', 'controller');
      this.parseDOMLibrary(xmlDoc, 'images', 'image');
      this.parseVisualScenes(xmlDoc);
      this.parseAnimationClips(xmlDoc);
    }

    parseDOMLibrary(xmlDoc, libraryName, elementName) {
      const libs = xmlDoc.getElementsByTagName(`library_${libraryName}`);
      if (libs.length === 0) return;
      const library = libs[0];
      const elements = library.getElementsByTagName(elementName);
      
      Array.from(elements).forEach((el) => {
        const id = el.getAttribute('id');
        const name = el.getAttribute('name') || id;
        switch (libraryName) {
          case 'geometries':
            this.geometries[id] = this.parseGeometry(el, name);
            break;
          case 'animations':
            this.animations[id] = this.parseAnimation(el, name);
            break;
          case 'materials':
            this.materials[id] = this.parseMaterial(el);
            break;
          case 'effects':
            this.effects[id] = this.parseEffect(el);
            break;
          case 'controllers':
            this.controllers[id] = this.parseController(el);
            break;
          case 'images':
            this.images[id] = this.parseImage(el);
            break;
        }
      });
    }

    parseGeometry(geomEl, name) {
      const meshes = geomEl.getElementsByTagName('mesh');
      if (meshes.length === 0) return null;
      const mesh = meshes[0];
      const vertices = [];
      const normals = [];
      const faces = [];
      const sources = mesh.getElementsByTagName('source');
      let posFloats = [];
      let normFloats = [];
      
      Array.from(sources).forEach(source => {
        const sourceId = source.getAttribute('id') || '';
        const floatArrays = source.getElementsByTagName('float_array');
        if (floatArrays.length > 0) {
          const floatArray = floatArrays[0];
          if (sourceId.includes('positions')) {
            posFloats = floatArray.textContent.trim().split(/\s+/).map(Number);
          }
          if (sourceId.includes('normals')) {
            normFloats = floatArray.textContent.trim().split(/\s+/).map(Number);
          }
        }
      });

      for (let i = 0; i < posFloats.length; i += 3) {
        vertices.push(new window.Engine.Vec3(posFloats[i], posFloats[i+1], posFloats[i+2]));
      }

      for (let i = 0; i < normFloats.length; i += 3) {
        normals.push(new window.Engine.Vec3(normFloats[i], normFloats[i+1], normFloats[i+2]));
      }

      const triangles = mesh.getElementsByTagName('triangles');
      const polylists = mesh.getElementsByTagName('polylist');
      const allGeoms = Array.from(triangles).concat(Array.from(polylists));
      
      allGeoms.forEach(triEl => {
        const pElements = triEl.getElementsByTagName('p');
        if (pElements.length === 0) return;
        const pElement = pElements[0];
        const inputs = triEl.getElementsByTagName('input');
        let vertexOffset = 0;
        let normalOffset = -1;
        let maxOffset = 0;
        
        Array.from(inputs).forEach(input => {
          const semantic = input.getAttribute('semantic');
          const offset = parseInt(input.getAttribute('offset') || '0');
          maxOffset = Math.max(maxOffset, offset);
          if (semantic === 'VERTEX') vertexOffset = offset;
          if (semantic === 'NORMAL') normalOffset = offset;
        });

        const indices = pElement.textContent.trim().split(/\s+/).map(Number);
        const stride = maxOffset + 1;
        
        if (stride === 1) {
          for (let i = 0; i < indices.length; i += 3) {
            faces.push({
              v0: indices[i],
              v1: indices[i+1],
              v2: indices[i+2],
              n0: indices[i],
              n1: indices[i+1],
              n2: indices[i+2]
            });
          }
        } else {
          for (let i = 0; i < indices.length; i += stride * 3) {
            const face = {
              v0: indices[i + vertexOffset],
              v1: indices[i + stride + vertexOffset],
              v2: indices[i + stride * 2 + vertexOffset]
            };
            if (normalOffset >= 0) {
              face.n0 = indices[i + normalOffset];
              face.n1 = indices[i + stride + normalOffset];
              face.n2 = indices[i + stride * 2 + normalOffset];
            }
            faces.push(face);
          }
        }
      });

      return { name, vertices, normals, faces, id: geomEl.getAttribute('id') };
    }

    parseAnimation(animEl, name) {
      const channels = [];
      const samplers = {};
      Array.from(animEl.getElementsByTagName('sampler')).forEach(sampler => {
        const sId = sampler.getAttribute('id');
        const inputs = sampler.getElementsByTagName('input');
        const inputData = {};
        Array.from(inputs).forEach(input => {
          const semantic = input.getAttribute('semantic');
          const sourceId = input.getAttribute('source').substring(1);
          const allFloatArrays = animEl.getElementsByTagName('float_array');
          const allNameArrays = animEl.getElementsByTagName('Name_array');
          let sourceEl = null;
          Array.from(allFloatArrays).forEach(el => {
            if (el.parentElement.getAttribute('id') === sourceId) sourceEl = el;
          });
          if (!sourceEl) {
            Array.from(allNameArrays).forEach(el => {
              if (el.parentElement.getAttribute('id') === sourceId) sourceEl = el;
            });
          }
          if (sourceEl) {
            const values = sourceEl.textContent.trim().split(/\s+/);
            inputData[semantic] = sourceEl.tagName === 'Name_array' ? values : values.map(Number);
          }
        });
        samplers[sId] = inputData;
      });
      Array.from(animEl.getElementsByTagName('channel')).forEach(channel => {
        const source = channel.getAttribute('source').substring(1);
        const target = channel.getAttribute('target');
        const [nodeId, property] = target.split('/');
        channels.push({ target: nodeId, property, sampler: samplers[source] });
      });
      return { name, channels, id: animEl.getAttribute('id') };
    }

    parseMaterial(matEl) {
      const effectRefs = matEl.getElementsByTagName('instance_effect');
      const effectRef = effectRefs.length > 0 ? effectRefs[0] : null;
      const effectId = effectRef ? effectRef.getAttribute('url').substring(1) : null;
      return { name: matEl.getAttribute('name') || matEl.getAttribute('id'), effectId, id: matEl.getAttribute('id') };
    }

    parseEffect(effectEl) {
      const profiles = effectEl.getElementsByTagName('profile_COMMON');
      if (profiles.length === 0) return null;
      const profile = profiles[0];
      const color = [1, 1, 1, 1];
      const texture = null;
      const diffuses = profile.getElementsByTagName('diffuse');
      if (diffuses.length > 0) {
        const diffuse = diffuses[0];
        const colorEls = diffuse.getElementsByTagName('color');
        if (colorEls.length > 0) {
          const colorEl = colorEls[0];
          const values = colorEl.textContent.trim().split(/\s+/).map(Number);
          for (let i = 0; i < 4; i++) color[i] = values[i] || color[i];
        }
      }
      return { name: effectEl.getAttribute('name') || effectEl.getAttribute('id'), color, texture, id: effectEl.getAttribute('id') };
    }

    parseController(controllerEl) {
      const skins = controllerEl.getElementsByTagName('skin');
      if (skins.length === 0) return null;
      const skin = skins[0];
      const geometry = skin.getAttribute('source').substring(1);
      const joints = [];
      const weights = [];
      const sources = skin.getElementsByTagName('source');
      Array.from(sources).forEach(source => {
        const sourceId = source.getAttribute('id') || '';
        if (sourceId.includes('-joints')) {
          const nameArrays = source.getElementsByTagName('Name_array');
          if (nameArrays.length > 0) {
            joints.push(...nameArrays[0].textContent.trim().split(/\s+/));
          }
        }
        if (sourceId.includes('-weights')) {
          const floatArrays = source.getElementsByTagName('float_array');
          if (floatArrays.length > 0) {
            weights.push(...floatArrays[0].textContent.trim().split(/\s+/).map(Number));
          }
        }
      });
      const vCounts = [];
      const vData = [];
      const vertexWeightses = skin.getElementsByTagName('vertex_weights');
      if (vertexWeightses.length > 0) {
        const vertexWeights = vertexWeightses[0];
        const vCountElements = vertexWeights.getElementsByTagName('vcount');
        if (vCountElements.length > 0) {
          vCounts.push(...vCountElements[0].textContent.trim().split(/\s+/).map(Number));
        }
        const vElements = vertexWeights.getElementsByTagName('v');
        if (vElements.length > 0) {
          vData.push(...vElements[0].textContent.trim().split(/\s+/).map(Number));
        }
      }
      return { name: controllerEl.getAttribute('name') || controllerEl.getAttribute('id'), geometry, joints, weights, vCounts, vData, id: controllerEl.getAttribute('id') };
    }

    parseImage(imgEl) {
      const initFroms = imgEl.getElementsByTagName('init_from');
      const url = initFroms.length > 0 ? initFroms[0].textContent : null;
      return { name: imgEl.getAttribute('name') || imgEl.getAttribute('id'), url, id: imgEl.getAttribute('id') };
    }

    parseTransform(el) {
      const matrixEls = el.getElementsByTagName('matrix');
      if (matrixEls.length > 0) {
        const values = matrixEls[0].textContent.trim().split(/\s+/).map(Number);
        return new Float32Array(values);
      }
      return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    }

    parseVisualScenes(xmlDoc) {
      const scenes = xmlDoc.getElementsByTagName('visual_scene');
      Array.from(scenes).forEach(scene => {
        const sceneId = scene.getAttribute('id');
        const nodes = this.parseNodes(scene);
        this.visualScenes[sceneId] = { name: scene.getAttribute('name') || sceneId, nodes, id: sceneId };
      });
    }

    parseNodes(parentEl) {
      const nodes = [];
      const nodeEls = parentEl.children;
      for (let el of nodeEls) {
        if (el.tagName !== 'node') continue;
        const nodeId = el.getAttribute('id');
        const nodeName = el.getAttribute('name') || nodeId;
        const sid = el.getAttribute('sid');
        const matrix = this.parseTransform(el);
        const meshInstance = el.querySelector('instance_geometry');
        const controllerInstance = el.querySelector('instance_controller');
        const node = {
          id: nodeId,
          name: nodeName,
          sid,
          matrix,
          meshId: meshInstance ? meshInstance.getAttribute('url').substring(1) : null,
          controllerId: controllerInstance ? controllerInstance.getAttribute('url').substring(1) : null,
          children: this.parseNodes(el)
        };
        nodes.push(node);
        this.nodes[nodeId] = node;
      }
      return nodes;
    }

    parseAnimationClips(xmlDoc) {
      const clips = xmlDoc.querySelectorAll('animation_clip');
      clips.forEach(clip => {
        const clipId = clip.getAttribute('id');
        const animIds = [];
        clip.querySelectorAll('instance_animation').forEach(inst => {
          const animId = inst.getAttribute('url').substring(1);
          animIds.push(animId);
        });
        this.animations[clipId] = { name: clip.getAttribute('name') || clipId, animations: animIds, id: clipId, isClip: true };
      });
    }

    buildModel() {
      return { geometries: this.geometries, animations: this.animations, materials: this.materials, effects: this.effects, controllers: this.controllers, images: this.images, visualScenes: this.visualScenes, nodes: this.nodes };
    }

    GetMeshFromGeometry(geomId, color = [1, 1, 1, 1]) {
      const geom = this.geometries[geomId];
      if (!geom || !geom.vertices.length) return null;
      return geom;
    }

    getAnimationTrack(animId, property = 'matrix') {
      const anim = this.animations[animId];
      if (!anim || !anim.channels) return null;
      const track = { name: anim.name, channels: anim.channels, duration: 0 };
      anim.channels.forEach(channel => {
        if (channel.sampler && channel.sampler.INPUT) {
          const inputs = channel.sampler.INPUT;
          const maxTime = Math.max(...inputs);
          track.duration = Math.max(track.duration, maxTime);
        }
      });
      return track;
    }

    interpolateValue(sampler, time) {
      if (!sampler || !sampler.INPUT) return null;
      const inputs = sampler.INPUT;
      const outputs = sampler.OUTPUT;
      const inTangents = sampler.IN_TANGENT || [];
      const outTangents = sampler.OUT_TANGENT || [];
      let index = 0;
      for (let i = 0; i < inputs.length - 1; i++) {
        if (inputs[i] <= time && time < inputs[i + 1]) {
          index = i;
          break;
        }
      }
      const t0 = inputs[index];
      const t1 = inputs[index + 1];
      const alpha = (time - t0) / (t1 - t0);
      if (outputs[0].length === 1) {
        const v0 = outputs[index];
        const v1 = outputs[index + 1];
        return v0 + (v1 - v0) * alpha;
      } else {
        const v0 = outputs[index];
        const v1 = outputs[index + 1];
        const result = [];
        for (let i = 0; i < v0.length; i++) {
          result[i] = v0[i] + (v1[i] - v0[i]) * alpha;
        }
        return result;
      }
    }
  }
