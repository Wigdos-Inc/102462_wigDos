import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.154.0/build/three.module.js';

// Create banana collectible
export function createBanana(x, y, z) {
  const group = new THREE.Group();
  
  // Banana body (curved cylinder approximation)
  const segments = 6;
  for (let i = 0; i < segments; i++) {
    const segment = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.3, 8),
      new THREE.MeshStandardMaterial({ 
        color: 0xffeb3b,
        emissive: 0xffd700,
        emissiveIntensity: 0.2
      })
    );
    const angle = (i / segments) * Math.PI * 0.7;
    const radius = 0.8;
    segment.position.x = Math.sin(angle) * radius;
    segment.position.y = Math.cos(angle) * radius - radius;
    segment.rotation.z = angle;
    segment.castShadow = true;
    group.add(segment);
  }
  
  // Stem
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x6d4c28 })
  );
  stem.position.y = 0.5;
  group.add(stem);
  
  group.position.set(x, y, z);
  group.userData = {
    collected: false,
    floatTime: Math.random() * Math.PI * 2,
    baseY: y,
    rotSpeed: 2
  };
  
  group.update = function(dt) {
    if (this.userData.collected) return;
    
    // Float and rotate
    this.userData.floatTime += dt;
    this.position.y = this.userData.baseY + Math.sin(this.userData.floatTime * 2) * 0.3;
    this.rotation.y += this.userData.rotSpeed * dt;
  };
  
  return group;
}

// Collectibles manager
export class CollectiblesManager {
  constructor(scene) {
    this.scene = scene;
    this.bananas = [];
    this.collected = 0;
    this.total = 0;
  }
  
  spawnBanana(x, y, z) {
    const banana = createBanana(x, y, z);
    this.bananas.push(banana);
    this.scene.add(banana);
    this.total++;
    return banana;
  }
  
  spawnBananaBunch(x, y, z, count = 5) {
    const radius = 2;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const bx = x + Math.cos(angle) * radius;
      const bz = z + Math.sin(angle) * radius;
      this.spawnBanana(bx, y + 1, bz);
    }
  }
  
  checkCollisions(player, onCollect) {
    const playerPos = player.position;
    const collectRadius = 1.5;
    
    for (const banana of this.bananas) {
      if (banana.userData.collected) continue;
      
      const dist = playerPos.distanceTo(banana.position);
      if (dist < collectRadius) {
        this.collectBanana(banana);
        if (onCollect) onCollect(banana);
      }
    }
  }
  
  collectBanana(banana) {
    banana.userData.collected = true;
    this.collected++;
    
    // Collect animation
    const startScale = banana.scale.clone();
    const startY = banana.position.y;
    const duration = 0.5;
    let elapsed = 0;
    
    const animateCollect = (dt) => {
      elapsed += dt;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease out cubic
      
      banana.scale.set(
        startScale.x * (1 + eased * 2),
        startScale.y * (1 + eased * 2),
        startScale.z * (1 + eased * 2)
      );
      banana.position.y = startY + eased * 3;
      banana.material = new THREE.MeshStandardMaterial({ 
        color: 0xffeb3b,
        transparent: true,
        opacity: 1 - eased
      });
      
      // Apply to all children
      banana.children.forEach(child => {
        if (child.material) {
          child.material.transparent = true;
          child.material.opacity = 1 - eased;
        }
      });
      
      if (t >= 1) {
        this.scene.remove(banana);
        return false; // Stop animation
      }
      return true; // Continue
    };
    
    banana.update = animateCollect;
  }
  
  update(dt, player, onCollect) {
    // Update all bananas
    for (const banana of this.bananas) {
      if (banana.update) {
        const cont = banana.update(dt);
        if (cont === false) {
          banana.update = null;
        }
      }
    }
    
    // Check collisions
    if (player) {
      this.checkCollisions(player, onCollect);
    }
  }
  
  getStats() {
    return {
      collected: this.collected,
      total: this.total,
      remaining: this.total - this.collected
    };
  }
}

// Spawn bananas around the world
export function populateBananas(manager, terrain, count = 30) {
  const spread = 100;
  
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * spread;
    const z = (Math.random() - 0.5) * spread;
    const y = terrain ? terrain.getHeightAt(x, z) + 2 : 2;
    
    if (Math.random() < 0.3) {
      // Spawn bunch
      manager.spawnBananaBunch(x, y, z, 5);
    } else {
      // Single banana
      manager.spawnBanana(x, y, z);
    }
  }
}
