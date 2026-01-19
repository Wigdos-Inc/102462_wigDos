import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

/**
 * Racing Items System - Mario Kart style
 */

export class ItemBox {
    constructor(position) {
        this.group = new THREE.Group();
        this.position = position.clone();
        this.rotation = 0;
        this.active = true;
        this.respawnTime = 0;
        this.respawnDelay = 3; // seconds
        
        this.createBox();
        this.group.position.copy(position);
    }

    createBox() {
        // Rainbow rotating cube
        const boxGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const materials = [
            new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0x660000 }),
            new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x006600 }),
            new THREE.MeshStandardMaterial({ color: 0x0000ff, emissive: 0x000066 }),
            new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0x666600 }),
            new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0x660066 }),
            new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x006666 })
        ];
        
        this.box = new THREE.Mesh(boxGeometry, materials);
        this.box.position.y = 1;
        this.box.castShadow = true;
        this.group.add(this.box);

        // Question mark symbol (simple sphere)
        const qMarkGeometry = new THREE.SphereGeometry(0.12, 16, 16);
        const qMarkMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const qMark = new THREE.Mesh(qMarkGeometry, qMarkMaterial);
        qMark.position.y = 1;
        qMark.position.z = 0.3;
        this.group.add(qMark);
        
        // Add a small sphere for the dot of the question mark
        const dotGeometry = new THREE.SphereGeometry(0.05, 12, 12);
        const dot = new THREE.Mesh(dotGeometry, qMarkMaterial);
        dot.position.y = 0.85;
        dot.position.z = 0.3;
        this.group.add(dot);

        // Support pole
        const poleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 8);
        const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.y = 0.5;
        this.group.add(pole);
    }

    update(deltaTime) {
        if (this.active) {
            this.rotation += deltaTime * 2;
            this.box.rotation.y = this.rotation;
            this.box.position.y = 1 + Math.sin(this.rotation * 2) * 0.1;
        } else {
            this.respawnTime += deltaTime;
            if (this.respawnTime >= this.respawnDelay) {
                this.activate();
            }
        }
    }

    collect() {
        if (!this.active) return false;
        
        this.active = false;
        this.respawnTime = 0;
        this.box.visible = false;
        return true;
    }

    activate() {
        this.active = true;
        this.box.visible = true;
    }

    getPosition() {
        return this.position;
    }

    getGroup() {
        return this.group;
    }
}

export class Item {
    constructor(type, owner) {
        this.type = type; // 'shell', 'banana', 'mushroom', 'star'
        this.owner = owner;
        this.mesh = null;
        this.active = false;
        this.velocity = new THREE.Vector3();
        this.lifetime = 0;
        this.maxLifetime = 10; // seconds
        
        this.createMesh();
    }

    createMesh() {
        let geometry, material;
        
        switch(this.type) {
            case 'shell':
                geometry = new THREE.SphereGeometry(0.3, 16, 16);
                geometry.scale(1, 0.8, 1);
                material = new THREE.MeshStandardMaterial({ 
                    color: 0xff0000,
                    roughness: 0.4,
                    metalness: 0.3
                });
                break;
            case 'banana':
                geometry = new THREE.CylinderGeometry(0.15, 0.15, 0.4, 8);
                geometry.scale(1, 1, 0.7);
                material = new THREE.MeshStandardMaterial({ 
                    color: 0xffff00,
                    roughness: 0.5
                });
                break;
            case 'mushroom':
                const mushroomGroup = new THREE.Group();
                const capGeometry = new THREE.SphereGeometry(0.25, 16, 16);
                capGeometry.scale(1, 0.6, 1);
                const capMaterial = new THREE.MeshStandardMaterial({ 
                    color: 0xff4444,
                    roughness: 0.6
                });
                const cap = new THREE.Mesh(capGeometry, capMaterial);
                cap.position.y = 0.2;
                mushroomGroup.add(cap);
                
                const stemGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.3, 12);
                const stemMaterial = new THREE.MeshStandardMaterial({ 
                    color: 0xffffff,
                    roughness: 0.7
                });
                const stem = new THREE.Mesh(stemGeometry, stemMaterial);
                stem.position.y = 0;
                mushroomGroup.add(stem);
                
                this.mesh = mushroomGroup;
                return;
            case 'star':
                geometry = new THREE.SphereGeometry(0.25, 5, 5);
                material = new THREE.MeshStandardMaterial({ 
                    color: 0xffff00,
                    emissive: 0xffaa00,
                    roughness: 0.2,
                    metalness: 0.8
                });
                break;
        }
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
    }

    use(position, direction, speed = 20) {
        this.active = true;
        this.lifetime = 0;
        this.mesh.position.copy(position);
        
        if (this.type === 'shell') {
            this.velocity.copy(direction).multiplyScalar(speed);
        } else if (this.type === 'banana') {
            this.velocity.set(0, 0, 0);
            this.mesh.position.y = 0.2;
        }
    }

    update(deltaTime) {
        if (!this.active) return;

        this.lifetime += deltaTime;
        if (this.lifetime > this.maxLifetime) {
            this.active = false;
            return;
        }

        if (this.type === 'shell') {
            this.mesh.position.add(this.velocity.clone().multiplyScalar(deltaTime));
            this.mesh.rotation.x += deltaTime * 10;
        } else if (this.type === 'banana') {
            this.mesh.rotation.y += deltaTime * 2;
        }
    }

    checkCollision(position, radius = 0.5) {
        if (!this.active) return false;
        
        const distance = this.mesh.position.distanceTo(position);
        return distance < (radius + 0.3);
    }

    getMesh() {
        return this.mesh;
    }

    isActive() {
        return this.active;
    }

    deactivate() {
        this.active = false;
    }
}

export class ItemManager {
    constructor(scene) {
        this.scene = scene;
        this.itemBoxes = [];
        this.activeItems = [];
        this.itemTypes = ['shell', 'banana', 'mushroom', 'star'];
    }

    createItemBoxes(positions) {
        positions.forEach(pos => {
            const box = new ItemBox(pos);
            this.itemBoxes.push(box);
            this.scene.add(box.getGroup());
        });
    }

    update(deltaTime) {
        this.itemBoxes.forEach(box => box.update(deltaTime));
        
        this.activeItems = this.activeItems.filter(item => {
            item.update(deltaTime);
            if (!item.isActive()) {
                this.scene.remove(item.getMesh());
                return false;
            }
            return true;
        });
    }

    checkItemBoxCollision(kartPosition) {
        for (let box of this.itemBoxes) {
            const distance = box.getPosition().distanceTo(kartPosition);
            if (distance < 1 && box.collect()) {
                return this.getRandomItem();
            }
        }
        return null;
    }

    getRandomItem() {
        const randomIndex = Math.floor(Math.random() * this.itemTypes.length);
        return this.itemTypes[randomIndex];
    }

    useItem(itemType, owner, position, direction) {
        const item = new Item(itemType, owner);
        item.use(position, direction);
        this.activeItems.push(item);
        this.scene.add(item.getMesh());
        return item;
    }

    checkItemCollisions(kartPosition) {
        for (let item of this.activeItems) {
            if (item.checkCollision(kartPosition)) {
                return item;
            }
        }
        return null;
    }
}
