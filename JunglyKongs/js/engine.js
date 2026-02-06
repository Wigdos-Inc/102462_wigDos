import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.154.0/build/three.module.js';

let scene, camera, renderer, containerEl;
const updateCallbacks = [];

export async function init(containerId = 'game-root'){
  containerEl = document.getElementById(containerId);
  if(!containerEl) throw new Error('Container not found: ' + containerId);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(55, containerEl.clientWidth/containerEl.clientHeight, 1, 4000);
  camera.position.set(0, 180, 900);

  renderer = new THREE.WebGLRenderer({antialias:true, alpha:false});
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(containerEl.clientWidth, containerEl.clientHeight);
  renderer.shadowMap.enabled = true;
  containerEl.appendChild(renderer.domElement);

  // Tropical lighting
  const ambient = new THREE.AmbientLight(0xfff5e6, 0.5); scene.add(ambient);
  const key = new THREE.DirectionalLight(0xffdd88, 1.3); 
  key.position.set(2000,3200,2000); 
  key.castShadow = true;
  key.shadow.mapSize.width = 2048;
  key.shadow.mapSize.height = 2048;
  key.shadow.camera.left = -4000;
  key.shadow.camera.right = 4000;
  key.shadow.camera.top = 4000;
  key.shadow.camera.bottom = -4000;
  key.shadow.camera.near = 50;
  key.shadow.camera.far = 8000;
  scene.add(key);
  
  // Add fog for atmosphere
  scene.fog = new THREE.Fog(0x87ceeb, 2000, 8000);
  scene.background = new THREE.Color(0x87ceeb);

  // small resize handler
  window.addEventListener('resize', ()=>{
    camera.aspect = containerEl.clientWidth / containerEl.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(containerEl.clientWidth, containerEl.clientHeight);
  });

  return { scene, camera, renderer };
}

export function addUpdate(fn){ if(typeof fn === 'function') updateCallbacks.push(fn); }
export function getScene(){ return scene; }
export function getCamera(){ return camera; }
export function getRenderer(){ return renderer; }

let running = false;
export function startLoop(){ if(running) return; running = true; (function tick(){ if(!running) return; requestAnimationFrame(tick); const now = performance.now(); updateCallbacks.forEach(cb=>{ try{ cb(now/1000); }catch(e){ console.warn(e); } }); renderer.render(scene, camera); })(); }
export function stopLoop(){ running = false; }

export function clearScene(){ if(!scene) return; while(scene.children.length) scene.remove(scene.children[0]); }
