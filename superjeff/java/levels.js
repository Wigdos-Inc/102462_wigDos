let currentLevel = 0; // Track the current level
let levelCompleted = false;

let activeLevelCollisions = [{ xMin: -10, xMax: 10, zMin: -10, zMax: 10, y: 0, width: 10, depth: 6 }];

const level1 = {
  name: "Forest Start",
  geometry: [
    // Type, position, size, rotation, materialType
    { type: "cube", pos: [0, 0, 0], size: [200, 1, 200], rot: [0, 0, 0], material: "grass" },
    { type: "cube", pos: [5, 1, 5], size: [2, 2, 2], rot: [0, 0.5, 0], material: "lava" },
    { type: "cube", pos: [-7, 2, -5], size: [3, 1, 3], rot: [0, 0, 0], material: "water" },
    { type: "cube", pos: [-15, 5, -5], size: [3, 1, 3], rot: [0, 0, 0], material: "grass" }
  ],
  entities: [
    { type: "playerStart", pos: [0, 2, 0] },
    { type: "enemy", pos: [5, 2, 5], behavior: "patrol" },
    { type: "tree", pos: [-3, 1, 4], size: [1, 5, 1] },
    { type: "playerfinish", pos: [-5,3,0] }
  ],
  skybox: "assets/jpeg/bg1.jpeg",
  music: "assets/mp3/themesong.mp3"
};

const wilwest_level = {
  name: "Wild West",
  geometry: [
    // Type, position, size, rotation, materialType
    { type: "cube", pos: [0, 0, 0], size: [200, 1, 200], rot: [0, 0, 0], material: "dirt" },
    { type: "cube", pos: [55, 1, 5], size: [2, 2, 2], rot: [0, 0.5, 0], material: "lava" },
    { type: "cube", pos: [7, 2, -20], size: [3, 1, 3], rot: [0, 0, 0], material: "water" },
    { type: "cube", pos: [-15, 5, -20], size: [3, 1, 3], rot: [0, 0, 0], material: "dirt" }
  ],
  entities: [
    { type: "playerStart", pos: [0, 2, 0] },
    { type: "enemy", pos: [4, 1, -10], behavior: "patrol" },
    { type: "tree", pos: [-3, 1, 4], size: [1, 5, 1] },
    { type: "playerfinish", pos: [-5,3,0] }
  ],
  skybox: "assets/jpeg/bg3.jpeg",
  music: "assets/mp3/WildWest.mp3"
};

const Spooky_level = {
  name: "Spooky jEfF",
  geometry: [
    // Type, position, size, rotation, materialType
    { type: "cube", pos: [0, 0, 0], size: [200, 1, 200], rot: [0, 0, 0], material: "grass_dark" },
    { type: "cube", pos: [55, 1, 5], size: [2, 2, 2], rot: [0, 0.5, 0], material: "lava" },
    { type: "cube", pos: [7, 2, -20], size: [3, 1, 3], rot: [0, 0, 0], material: "water" },
    { type: "cube", pos: [-15, 5, -20], size: [3, 1, 3], rot: [0, 0, 0], material: "grass_dark" }
  ],
  entities: [
    { type: "playerStart", pos: [0, 2, 0] },
    { type: "enemy", pos: [4, 1, -10], behavior: "patrol" },
    { type: "tree", pos: [-3, 1, 4], size: [1, 5, 1] },
    { type: "playerfinish", pos: [-5,3,0] }
  ],
  skybox: "assets/jpeg/bg_4_1.jpg",
  music: "assets/mp3/SpookyJeff.mp3"
};

const chicken_bonus = {
  name: "Bonus Level chicken",
  geometry: [
    // Type, position, size, rotation, materialType
    { type: "cube", pos: [0, 0, 0], size: [200, 1, 200], rot: [0, 0, 0], material: "grass" },
    { type: "cube", pos: [55, 1, 5], size: [2, 2, 2], rot: [0, 0.5, 0], material: "lava" },
    { type: "cube", pos: [7, 2, -20], size: [3, 1, 3], rot: [0, 0, 0], material: "water" },
    { type: "cube", pos: [-15, 5, -20], size: [3, 1, 3], rot: [0, 0, 0], material: "grass" }
  ],
  entities: [
    { type: "playerStart", pos: [0, 2, 0] },
    { type: "enemy", pos: [4, 1, -10], behavior: "patrol" },
    { type: "tree", pos: [-3, 1, 4], size: [1, 5, 1] },
    { type: "playerfinish", pos: [-5,3,0] }
  ],
  skybox: "assets/jpeg/bg_5_1.jpg",
  music: "assets/mp3/chickenshack.mp3"
};

const levels = [level1, wilwest_level, Spooky_level, chicken_bonus];

function loadAndResizeImage(imageUrl, size) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous'; // Important if loading from a different domain
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, 0, 0, size, size);

            // Convert canvas back to Image
            const resizedImage = new Image();
            resizedImage.onload = () => resolve(resizedImage);
            resizedImage.src = canvas.toDataURL();
        };
        image.onerror = reject;
        image.src = imageUrl;
    });
}

function showLoadingScreen() {
    document.getElementById('loadingScreen').style.display = 'block';
}

function hideLoadingScreen() {
    document.getElementById('loadingScreen').style.display = 'none';
}

// Function to unload the current level
function unloadLevel() {
    // Traverse through all objects in the scene
    scene.children.forEach(function (child) {
        if (child instanceof THREE.Mesh) {
            // Remove mesh objects from the scene
            if(child.parent){
                child.parent.remove(child);
            }
            scene.remove(child);
        }
    });

    // Optionally, reset any level-specific variables (e.g., player speed, mascot, goomba positions)
    playerSpeed = 0;      // Reset player speed to default
    goombaSpeed = 0;      // Reset goomba speed to default
    mascotGroup.position.set(0, -100, 0);  // Move mascot off-screen
    goombaGroup.position.set(0, -100, 0);  // Move goomba off-screen

    // Optionally, if you have other groups like physics objects or animations, clear them as well
    // e.g., reset any physics engines, animations, etc.

     // If you have any specific cleanup for textures, sounds, etc., handle it here
     // Example: if there are textures loaded dynamically, you might want to dispose of them
    // Example: if you have any loaded assets or sounds, stop them and clear references
}

function loadlevel(){
    map = levels[currentLevel -1];

    document.getElementById('levelname').textContent = "LEVEL: " + map.name;
    unloadLevel();

    let skyTex = map.skybox//loadAndResizeImage(map.skybox, 512);

    const loader = new THREE.CubeTextureLoader();
    const texture = loader.load([
        skyTex,
        skyTex,
        skyTex,
        skyTex,
        skyTex,
        skyTex
    ]);

    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    scene.background = texture;

    activeLevelCollisions = [];
    for (let i = 0; i < map.geometry.length; i++){
        let pos = map.geometry[i].pos;
        let size = map.geometry[i].size;

        let col = [
            (-size[0] / 2) + pos[0],
            (size[0] / 2) + pos[0],
            (-size[2] / 2) + pos[2],
            (size[2] / 2) + pos[2],
            (-size[1] / 2) + pos[1],
            (size[1] / 2) + pos[1]
        ];
        activeLevelCollisions[i] = { xMin: col[0], xMax: col[1], zMin: col[2], zMax: col[3], y: col[4] +1.5, width: 10, depth: 6 };

        let type = map.geometry[i].material;
        let color = 0xFFFFFF;
        switch(type){
            case 'grass':{
                color = 0x228B22;
                break;
            }
            case 'dirt':{
                color = 0xf1d275;
                break;
            }
            case 'grass_dark':{
                color = 0x185f35;
                break;
            }
        }

        const floorGeometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
        const floorMaterial = new THREE.MeshStandardMaterial({ color: color });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.position.x = pos[0];
        floor.position.y = pos[1];
        floor.position.z = pos[2];
        scene.add(floor);
    }

    playerSpeed = 0.1;
    goombaSpeed = 0.05;

    mascotGroup.position.set(0, 1, 0);

    for (let i = 0; i < map.entities.length; i++){
        let cur_entity = map.entities[i];
        let pos = cur_entity.pos;
        if (cur_entity.type == 'enemy'){
            goombaGroup.position.set(pos[0], pos[1], pos[2]);
            scene.add(goombaGroup);
        }
        else if(cur_entity.type == 'playerfinish'){
            const flag_tex = new THREE.TextureLoader().load('assets/jpeg/soup_awsome_tp.png');
            const flag_material = new THREE.MeshBasicMaterial({
                map: flag_tex,
                transparent: true
            });
            const flag_geo = new THREE.PlaneGeometry(7,7);
            const flag_mesh = new THREE.Mesh(flag_geo, flag_material);
            flag_mesh.position.x = pos[0];
            flag_mesh.position.y = pos[1];
            flag_mesh.position.z = pos[2];
            flagGroup.add(flag_mesh);
        }
    }

    scene.add(mascotGroup);
    scene.add(flagGroup);
    setMusic(map.music);
    levelCompleted = false;
}

function changeLevel(level) {
    showLoadingScreen();
    setTimeout(() => {
        loadlevel();
        hideLoadingScreen();
    }, 1000);
}

function checkLevel(force){
    // Example of progressing levels after the player dies or completes a level:
    if (lives <= 0) {
        gameOver = true;
        document.getElementById('gameover').style.display = 'block';
    } else if(levelCompleted || force){
        //levelCompleted = false;
        currentLevel++;  // Move to the next level
        if (currentLevel > levels.length) {
            currentLevel = 1; // Restart from level 1
        }
        changeLevel(currentLevel);
    }
}
