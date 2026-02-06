import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.154.0/build/three.module.js';

export function createApe(color=0x8b5a2b, scale=1){
  const anchor = new THREE.Object3D();
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({color, roughness:0.85, metalness:0.02, flatShading:true});
  const dark = new THREE.MeshStandardMaterial({color:0x352216, roughness:0.95, flatShading:true});

  const torso = new THREE.Mesh(new THREE.BoxGeometry(120,100,80), mat); torso.position.set(0,20,0); torso.castShadow=true; group.add(torso);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(46,0), mat); head.position.set(0,78,6); head.castShadow=true; group.add(head);
  const muzzle = new THREE.Mesh(new THREE.BoxGeometry(64,30,34), dark); muzzle.position.set(0,66,40); muzzle.castShadow=true; group.add(muzzle);
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(6,6,6), new THREE.MeshStandardMaterial({color:0xffffff})); eyeL.position.set(-14,86,58); group.add(eyeL);
  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(6,6,6), new THREE.MeshStandardMaterial({color:0xffffff})); eyeR.position.set(14,86,58); group.add(eyeR);
  const pL = new THREE.Mesh(new THREE.SphereGeometry(2.5,6,6), new THREE.MeshStandardMaterial({color:0x000000})); pL.position.set(-14,86,64); group.add(pL);
  const pR = new THREE.Mesh(new THREE.SphereGeometry(2.5,6,6), new THREE.MeshStandardMaterial({color:0x000000})); pR.position.set(14,86,64); group.add(pR);

  const armL = new THREE.Group(); const upperL = new THREE.Mesh(new THREE.BoxGeometry(20,80,20), mat); upperL.position.set(-50,-10,0); upperL.castShadow=true; upperL.rotation.z = -0.2; armL.add(upperL); armL.position.set(-76,40,0); group.add(armL);
  const armR = new THREE.Group(); const upperR = new THREE.Mesh(new THREE.BoxGeometry(20,80,20), mat); upperR.position.set(50,-10,0); upperR.castShadow=true; upperR.rotation.z = 0.2; armR.add(upperR); armR.position.set(76,40,0); group.add(armR);

  const legL = new THREE.Mesh(new THREE.BoxGeometry(28,70,28), dark); legL.position.set(-28,-40,10); legL.castShadow=true; group.add(legL);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(28,70,28), dark); legR.position.set(28,-40,10); legR.castShadow=true; group.add(legR);
  const belly = new THREE.Mesh(new THREE.BoxGeometry(60,40,44), new THREE.MeshStandardMaterial({color:0xf2d7a6, roughness:0.9})); belly.position.set(0,12,38); belly.castShadow=true; group.add(belly);

  group.userData = {head, armL, armR, legL, legR, torso};
  group.scale.setScalar(scale);
  anchor.add(group);

  // animation state with physics and combat
  anchor.userData = { 
    vel: new THREE.Vector3(), 
    onGround:true, 
    animTime: 0, 
    gravity: -880, 
    jumpStrength: 420, 
    jumpPower: 0,
    attacking: false,
    attackType: null,
    attackTime: 0,
    rolling: false,
    rollTime: 0
  };

  // expose update method with jump physics and combat
  anchor.update = function(dt, state, terrain){
    const ud = anchor.userData;
    ud.animTime += dt;
    
    // Handle attack cooldowns
    if(ud.attacking){
      ud.attackTime -= dt;
      if(ud.attackTime <= 0){
        ud.attacking = false;
        ud.attackType = null;
      }
    }
    
    if(ud.rolling){
      ud.rollTime -= dt;
      if(ud.rollTime <= 0) ud.rolling = false;
    }
    
    // Roll attack (Shift)
    if(state && state.roll && !ud.attacking && !ud.rolling && ud.onGround){
      ud.rolling = true;
      ud.rollTime = 0.6;
      ud.vel.x += Math.sin(anchor.rotation.y) * 600;
      ud.vel.z += Math.cos(anchor.rotation.y) * 600;
      group.rotation.x = 0;
    }
    
    // Roll animation
    if(ud.rolling){
      group.rotation.x -= dt * 20;
      group.scale.set(1.2, 0.8, 1.2);
    } else {
      group.rotation.x *= 0.9;
      if(!ud.attacking) group.scale.set(1, 1, 1);
    }
    
    // Coconut gun (Q)
    if(state && state.shoot && !ud.attacking && !ud.rolling){
      ud.attacking = true;
      ud.attackType = 'shoot';
      ud.attackTime = 0.4;
      spawnProjectile(anchor, scene);
    }
    
    // Punch (E)
    if(state && state.punch && !ud.attacking && !ud.rolling){
      ud.attacking = true;
      ud.attackType = 'punch';
      ud.attackTime = 0.35;
    }
    
    // High kick (R)
    if(state && state.kick && !ud.attacking && !ud.rolling){
      ud.attacking = true;
      ud.attackType = 'kick';
      ud.attackTime = 0.5;
    }
    
    // Apply gravity
    ud.vel.y += ud.gravity * dt;
    
    // Jump input
    if(state && state.jump && ud.onGround && !ud.rolling){
      ud.vel.y = ud.jumpStrength;
      ud.onGround = false;
      ud.jumpPower = 1;
    }
    
    // Jump squash and stretch animation
    const jumpSquash = ud.jumpPower * 0.2;
    if(!ud.rolling){
      group.scale.set(1 - jumpSquash * 0.4, 1 + jumpSquash * 0.6, 1 - jumpSquash * 0.4);
    }
    ud.jumpPower *= 0.88;
    
    // Idle bob when grounded
    if(ud.onGround && !ud.attacking){
      group.position.y = Math.sin(ud.animTime*2) * 2;
    } else {
      group.position.y = 0;
    }
    
    // Attack animations
    if(ud.attacking){
      const t = ud.attackTime;
      if(ud.attackType === 'shoot'){
        group.userData.armR.rotation.x = -1.5;
        group.userData.armR.rotation.z = 0.3;
      } else if(ud.attackType === 'punch'){
        const punchProgress = 1 - (t / 0.35);
        group.userData.armR.rotation.z = 0.6 + Math.sin(punchProgress * Math.PI) * 1.5;
        group.userData.armR.rotation.x = -0.5;
        group.position.x = Math.sin(punchProgress * Math.PI) * 20;
      } else if(ud.attackType === 'kick'){
        const kickProgress = 1 - (t / 0.5);
        group.userData.legR.rotation.x = Math.sin(kickProgress * Math.PI) * 2.5;
        group.position.z = Math.sin(kickProgress * Math.PI) * 15;
      }
    }
    
    // Movement (slower during attacks, disabled during roll)
    if(state && state.dir && !ud.rolling){
      const speed = ud.attacking ? 1550 : 1880;
      ud.vel.x += state.dir.x * speed * dt;
      ud.vel.z += state.dir.z * speed * dt;
      
      // Face movement direction
      if(state.dir.x !== 0 || state.dir.z !== 0){
        anchor.rotation.y = Math.atan2(state.dir.x, state.dir.z);
      }
      
      // Limb swing when moving and grounded
      if(ud.onGround && !ud.attacking){
        const swing = Math.sin(ud.animTime*6) * 0.9;
        group.userData.armL.rotation.z = -0.6 + swing;
        group.userData.armR.rotation.z = 0.6 - swing;
        group.userData.legL.rotation.x = -swing * 0.5;
        group.userData.legR.rotation.x = swing * 0.5;
      }
    } else if(!ud.attacking && !ud.rolling){
      // Reset limbs when idle
      group.userData.armL.rotation.z += (-0.6 - group.userData.armL.rotation.z) * 0.1;
      group.userData.armR.rotation.z += (0.6 - group.userData.armR.rotation.z) * 0.1;
      group.userData.armL.rotation.x *= 0.9;
      group.userData.armR.rotation.x *= 0.9;
      group.userData.legL.rotation.x *= 0.9;
      group.userData.legR.rotation.x *= 0.9;
    }
    
    // Horizontal friction
    ud.vel.x *= ud.rolling ? 0.97 : 0.92;
    ud.vel.z *= ud.rolling ? 0.97 : 0.92;
    
    // Apply velocity
    anchor.position.x += ud.vel.x * dt;
    anchor.position.z += ud.vel.z * dt;
    anchor.position.y += ud.vel.y * dt;
    
    // Terrain collision with proper height offset
    let groundHeight = 0;
    if(terrain && terrain.getHeightAt){
      groundHeight = terrain.getHeightAt(anchor.position.x, anchor.position.z);
    }
    
    // Add character height offset to prevent clipping (character is ~100 units tall)
    const characterHeightOffset = 80;
    if(anchor.position.y <= groundHeight + characterHeightOffset){
      anchor.position.y = groundHeight + characterHeightOffset;
      ud.vel.y = 0;
      ud.onGround = true;
    } else {
      ud.onGround = false;
    }
  };

  return anchor;
}

// Store scene reference for projectiles
let scene = null;

function spawnProjectile(shooter, sceneRef){
  if(!sceneRef) return;
  if(!scene) scene = sceneRef;
  
  // Create coconut projectile
  const coconut = new THREE.Mesh(
    new THREE.SphereGeometry(15, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9 })
  );
  
  const shooterPos = shooter.position;
  const shooterRot = shooter.rotation.y;
  
  coconut.position.set(
    shooterPos.x + Math.sin(shooterRot) * 100,
    shooterPos.y + 50,
    shooterPos.z + Math.cos(shooterRot) * 100
  );
  
  coconut.castShadow = true;
  scene.add(coconut);
  
  // Projectile velocity
  const velocity = {
    x: Math.sin(shooterRot) * 800,
    y: 0,
    z: Math.cos(shooterRot) * 800
  };
  
  coconut.userData = {
    velocity,
    lifetime: 2.0,
    isProjectile: true
  };
  
  // Update function
  coconut.update = function(dt){
    this.userData.lifetime -= dt;
    if(this.userData.lifetime <= 0){
      scene.remove(this);
      return false;
    }
    
    this.position.x += this.userData.velocity.x * dt;
    this.position.y += this.userData.velocity.y * dt;
    this.position.z += this.userData.velocity.z * dt;
    this.userData.velocity.y -= 400 * dt; // gravity
    
    this.rotation.x += dt * 10;
    this.rotation.z += dt * 8;
    
    return true;
  };
}

export function createNPC(color, x=0, z=0){ const a = createApe(color, 0.95); a.position.set(x,40,z); a.userData.patrolOffset = Math.random()*100; return a; }
