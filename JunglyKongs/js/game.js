import { init, addUpdate, getScene, getCamera, startLoop } from './engine.js';
import { createApe, createNPC } from './characters.js';
import { createInput } from './input.js';
import { Terrain, createPalmTree, createHut, createWaterfall, createRock, createBush } from './environment.js';
import { CollectiblesManager, populateBananas } from './collectibles.js';

let engineState = { score: 0, bananas: 0 };

export async function startGame(){
  await init('game-root');
  const scene = getScene();
  const camera = getCamera();

  // Create varied terrain
  const terrain = new Terrain(scene, 3000, 3000, 80);
  engineState.terrain = terrain;
  
  // Populate jungle environment
  // Palm trees
  const palmPos = [[600,800],[-500,700],[1000,-600],[-800,-400],[300,1200],[-700,1000],[1200,200],[-1000,300],[1600,1000],[-1400,-800],[400,-1200],[-600,-1400]];
  palmPos.forEach(([x,z])=>{ scene.add(createPalmTree(x,z,100+Math.random()*40)); });
  
  // Huts
  scene.add(createHut(1200, 1200, 120));
  scene.add(createHut(-1400, 1000, 100));
  scene.add(createHut(800, -1100, 90));
  
  // Waterfall
  const waterfall = createWaterfall(-1600, -1200, 400);
  scene.add(waterfall);
  
  // Rocks and bushes
  for(let i=0;i<40;i++){
    const x=(Math.random()-0.5)*4800, z=(Math.random()-0.5)*4800;
    scene.add(createRock(x, z, 40+Math.random()*60));
  }
  for(let i=0;i<60;i++){
    const x=(Math.random()-0.5)*5000, z=(Math.random()-0.5)*5000;
    scene.add(createBush(x, z, 60+Math.random()*40));
  }

  // Create player
  const player = createApe(0xd96e24, 1.1);
  const startH = terrain.getHeightAt(0, 0);
  player.position.set(0, startH + 100, 0);
  scene.add(player);
  engineState.player = player;

  // Create NPCs
  const npcs = [];
  const npcPos = [[400,400],[-300,500],[600,-300],[-500,-600],[800,200]];
  npcPos.forEach(([x,z])=>{
    const npc = createNPC(0x7dbb6c, x, z);
    const h = terrain.getHeightAt(x, z);
    npc.position.y = h + 80;
    scene.add(npc);
    npcs.push(npc);
  });
  engineState.npcs = npcs;

  // Collectibles system
  const collectibles = new CollectiblesManager(scene);
  populateBananas(collectibles, terrain, 20);
  engineState.collectibles = collectibles;

  // Input
  const input = createInput();
  engineState.input = input;

  // Background music
  const bgMusic = new Audio('assets/music/level2.mp3');
  bgMusic.loop = true;
  bgMusic.volume = 0.4;
  bgMusic.play().catch(e => {
    console.log('Music autoplay blocked, will play on first interaction');
    document.addEventListener('click', () => bgMusic.play(), { once: true });
  });

  // UI update function
  function updateUI(){
    const stats = collectibles.getStats();
    const scoreEl = document.getElementById('score');
    const bananasEl = document.getElementById('bananas');
    if(scoreEl) scoreEl.textContent = engineState.score;
    if(bananasEl) bananasEl.textContent = `${stats.collected}/${stats.total}`;
  }

  // Camera follow with better smoothing
  function updateCamera(){
    const target = player.position;
    camera.position.x += (target.x - camera.position.x) * 0.1;
    camera.position.y += (target.y + 600 - camera.position.y) * 0.08;
    camera.position.z += (target.z + 900 - camera.position.z) * 0.1;
    camera.lookAt(target.x, target.y + 100, target.z);
  }

  // Main game loop
  let lastTime = 0;
  addUpdate((now)=>{
    const dt = Math.min((now - lastTime), 0.1);
    lastTime = now;
    if(dt <= 0) return;
    
    input.update();
    player.update(dt, input.state, terrain);
    
    // Update NPCs with terrain
    npcs.forEach((n,i)=>{
      const off = n.userData.patrolOffset || 0;
      n.position.x += Math.sin(now*0.5 + off)*0.8;
      n.position.z += Math.cos(now*0.3 + off)*0.5;
      const h = terrain.getHeightAt(n.position.x, n.position.z);
      n.position.y += (h + 80 - n.position.y) * 0.1;
      n.userData.animTime = (n.userData.animTime||0) + dt;
      n.update(dt, {}, terrain);
    });
    
    // Update projectiles
    scene.children.filter(obj => obj.userData.isProjectile).forEach(proj => {
      if(proj.update){
        const alive = proj.update(dt);
        if(!alive) scene.remove(proj);
      }
    });
    
    // Update waterfall
    if(waterfall.userData.update) waterfall.userData.update(dt);
    
    // Update collectibles
    collectibles.update(dt, player, (banana)=>{
      engineState.score += 10;
      engineState.bananas++;
      updateUI();
    });
    
    updateCamera();
  });

  updateUI();
  startLoop();
}
