function getexportHTML(project, buildData, builder) {
    const wasmData = buildData.scripts.map(script => ({
        name: script.name,
        wasm: builder.arrayBufferToBase64(script.wasm),
        gameObjectId: script.gameObjectId
    }));

    let assets = [];
    for (let i = 0; i < project.assets.length; i++) {
        if (project.assets[i].type != 'script') {
            assets[i] = project.assets[i];
        }
    }

    const safeName = builder.escapeHtml(project.name);
    const projectDataJson = JSON.stringify({ name: project.name, scenes: buildData.scenes, scripts: wasmData, assets: assets }).replace(/</g, '\\u003c');
    const scriptProjectName = JSON.stringify(project.name);

    let exportFile = '';

    exportFile += getHTMLHeader(safeName);
    exportFile += getHTMLbody(project, buildData, safeName);
    exportFile += getGlobalScriptVariables(projectDataJson);
    exportFile += BurtCoreLoader;
    exportFile += wasmRuntime;
    exportFile += getBootscript(scriptProjectName);
    exportFile += HTMLfileEnd;

    return exportFile;
}

async function imageUrlToDataURL(url) {
    const response = await fetch(url);
    const blob = await response.blob();

    return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

let splashImage = null;

async function preloadAssets() {
    splashImage = await imageUrlToDataURL("images/logo2.png");
}

preloadAssets();

function getHTMLbody(project, buildData, safeName) {
    return `
<body>
    ${getSplash(splashImage)}
    
    <div id="game-container" style="display: none;">
        <canvas id="canvas" width="1920" height="1080"></canvas>
        <div id="game-info">
            <p><strong>${safeName}</strong></p>
            <p>Gemaakt met WiggyEngine - Scripts: ${buildData.scripts.length} | Scenes: ${buildData.scenes.length}</p>
        </div>
    </div>
`;
}

const BurtCoreLoader = `
    let BurtCore = await import('${BurtCorePath}');
    BurtCore = BurtCore.BurtCore;

    window.Engine = BurtCore;
    window.Matrix4 = new BurtCore.Mat4;
    window.canvas = document.getElementById('canvas');

    canvas.addEventListener("contextmenu", (event) => {
        event.preventDefault();
    });

    const renderer = new Engine.WebGLRenderer(canvas);
    renderer.gridVisible = false;
    renderer.backgroundColor = [0,0.7,1,1];

    const camera = new Engine.Camera();
    const scene = [];
    let sceneObjs = 0;
    let objectIDs = 0;

    function deg2rad(x) {
        return x * (3.14 / 180);
    }


    async function FillScene() {
        for(const map of projectData.scenes) {
            for(const object of map.gameObjects) {
                for(const component of object.components) {
                    if(component.type == 'MeshRenderer') {
                        let geometry = null;
                        switch(component.mesh) {
                            case 'cube': geometry = Engine.GeometryBuilder.createBox();break;
                            case 'sphere': geometry = Engine.GeometryBuilder.createSphere();break;
                            case 'plane': geometry = Engine.GeometryBuilder.createPlane();break;
                            case 'GLB': {
                                const file = new Uint8Array(component.glbfile.bytes);
                                const blob = new Blob([file], { type: component.glbfile.type });
                                const url = URL.createObjectURL(blob);

                                const glbParser = new Engine.GLBParser(renderer, camera);
                                const glb = await glbParser.loadGLB(url);

                                const sortedMeshes = [];
                                for (const mesh of Object.values(glb.meshes)) {
                                    if (!sortedMeshes[mesh[0].materialIndex]) {
                                        sortedMeshes[mesh[0].materialIndex] = {meshes: [], geometries: []};
                                    }

                                    sortedMeshes[mesh[0].materialIndex].meshes.push(mesh[0]);
                                }

                                for (const geometry of Object.values(glb.geometries)) {
                                    sortedMeshes[geometry.materialIndex].geometries.push(geometry);
                                }

                                geometry = [];
                                for (let i = 0; i < sortedMeshes.length; i++) {
                                    const meshData = glbParser.ConvertToFlatMesh(sortedMeshes[i]);
                                    geometry[i] = meshData;
                                }
                                break;
                            }
                        }

                        if(geometry == null) continue;
                        
                        if (geometry.length > 1) {
                            for (let i = 0; i < geometry.length; i++) {
                                const mesh = new Engine.Mesh(renderer, geometry[i]);
                                mesh.position = object.transform.position;
                                mesh.rotation.x = deg2rad(object.transform.rotation.x);
                                mesh.rotation.y = deg2rad(object.transform.rotation.y);
                                mesh.rotation.z = deg2rad(object.transform.rotation.z);
                                mesh.scale = object.transform.scale;
                                mesh.material_id = i;
                                mesh.id = objectIDs;

                                if (component.materials) {
                                    mesh.setTexture(getAssetById(component.materials[i].materialDefinition.diffuseTexture).dataUrl, component.materials[i].material == "transparent" ? 1:0);
                                }

                                mesh.updateMatrix();
                                scene[sceneObjs++] = mesh;
                            }
                            objectIDs++;
                        }
                        else {
                            const mesh = new Engine.Mesh(renderer, geometry);
                            mesh.position = object.transform.position;
                            mesh.rotation.x = deg2rad(object.transform.rotation.x);
                            mesh.rotation.y = deg2rad(object.transform.rotation.y);
                            mesh.rotation.z = deg2rad(object.transform.rotation.z);
                            mesh.scale = object.transform.scale;
                            mesh.id = objectIDs++;

                            if (component.materialDefinition) {
                                mesh.setTexture(getAssetById(component.materialDefinition.diffuseTexture).dataUrl, component.material == "transparent" ? 1:0);
                            }

                            mesh.updateMatrix();
                            scene[sceneObjs++] = mesh;
                        }
                    }

                    else if (component.type == 'Script') {
                        const script = getScriptById(component.scriptAssetId);
                        const wasmBytes = Uint8Array.from(atob(script.wasm), c => c.charCodeAt(0));
                        await window.wasmRuntime.loadScript(script.name, wasmBytes);

                        if (component.enabled) window.wasmRuntime.executeScript(script.name, 'main');
                    }

                    else if(component.type == 'Camera') {
                        camera.position = new Engine.Vec3(object.transform.position.x,object.transform.position.y,object.transform.position.z);
                    }
                }
            }
        }
    }

    function Engineinit() {
        FillScene();
    }

    const FPS = 60;
    const TIMESTEP = 1000 / FPS;
    let accumulator = 0;
    let lastTime = performance.now();

    function MainGameLoop() {
        const currentTime = performance.now();

        let deltaTime = currentTime - lastTime;
        lastTime = currentTime;

        if (deltaTime > 250) deltaTime = 250;
        accumulator += deltaTime;

        while (accumulator >= TIMESTEP) {
            for (const [index, instance] of window.wasmRuntime.instances) {
                window.wasmRuntime.executeScript(index, 'run');
            }

            renderer.render(scene, camera);
            accumulator -= TIMESTEP;
        }

        const alpha = accumulator / TIMESTEP;
        
        requestAnimationFrame(MainGameLoop);
    }
`;

const CarlNetLoader = `
    function MainGameLoop() {

    }
`;

function getGlobalScriptVariables(projectDataJson) {
    return `
<script type="module">
    const projectData = ${projectDataJson};
    console.log(projectData);

    function getAssetById(id) {
        for (const asset of projectData.assets) {
            if (id == asset.id) return asset;
        }
    }

    function getScriptById(id) {
        for (const script of projectData.scripts) {
            if (id == script.gameObjectId) return script;
        }
    }

    function updateObjectById(id, type, value) {
        for (let i = 0; i < sceneObjs; i++) {
            const mesh = scene[i];
            if (mesh.id == id) {
                switch(type) {
                    case 0: mesh.position.x = value;break;
                    case 1: mesh.position.y = value;break;
                    case 2: mesh.position.z = value;break;
                    case 3: mesh.rotation.x = value;break;
                    case 4: mesh.rotation.y = value;break;
                    case 5: mesh.rotation.z = value;break;
                    case 6: mesh.scale.x = value;break;
                    case 7: mesh.scale.y = value;break;
                    case 8: mesh.scale.z = value;break;
                }
                mesh.updateMatrix();

                scene[i] = mesh;
            }
        }
    }

    function getObjectById(id, type) {
        for (let i = 0; i < sceneObjs; i++) {
            const mesh = scene[i];
            if (mesh.id == id) {
                switch(type) {
                    case 0: return mesh.position.x;
                    case 1: return mesh.position.y;
                    case 2: return mesh.position.z;
                    case 3: return mesh.rotation.x;
                    case 4: return mesh.rotation.y;
                    case 5: return mesh.rotation.z;
                    case 6: return mesh.scale.x;
                    case 7: return mesh.scale.y;
                    case 8: return mesh.scale.z;
                }
            }
        }
    }

    const keys = {};
    window.addEventListener("keydown", (event) => {
        keys[event.key.charCodeAt(0)] = 1;
    });

    window.addEventListener("keyup", (event) => {
        keys[event.key.charCodeAt(0)] = 0;
    });

    function isKeyPressed(utf8Code) {
        return keys[utf8Code] ? 1 : 0;
    }
    `;
}

// for (const script of projectData.scripts) {
//     const wasmBytes = Uint8Array.from(atob(script.wasm), c => c.charCodeAt(0));
//     await window.wasmRuntime.loadScript(script.name, wasmBytes);
// }

// for (const script of projectData.scripts) {
//     window.wasmRuntime.executeScript(script.name, 'main');
// }

function getBootscript(scriptProjectName) {
    return `
        async function initializeGame() {
            const progressBar = document.getElementById('splash-progress');
            let progress = 0;
            
            const updateProgress = (newProgress) => {
                progress = newProgress;
                progressBar.style.width = progress + '%';
            };
            
            updateProgress(10);
            console.log('Initializing game:', projectData.name);
            
            updateProgress(30);
            updateProgress(60);
            updateProgress(80);
            
            updateProgress(100);
            console.log('Game initialized successfully');
            
            // Hide splash screen and show game
            setTimeout(() => {
                const splash = document.getElementById('splash-screen');
                const gameContainer = document.getElementById('game-container');
                
                splash.style.animation = 'fadeOut 0.5s ease-in';
                
                setTimeout(() => {
                    splash.style.display = 'none';
                    gameContainer.style.display = 'block';

                    Engineinit();
                    MainGameLoop();
                }, 500);
            }, 1000);
        }
        
        setTimeout(() => {initializeGame()}, 2000);
</script>
`;
}

const wasmRuntime = `
        class WiggyWasmRuntime {
            constructor() {
                this.modules = new Map();
                this.instances = new Map();
                this.selfGlobals = new Map();
            }
            
            async loadScript(name, wasmBytes) {
                try {
                    const module = await WebAssembly.compile(wasmBytes);
                    this.modules.set(name, module);

                    const selfGlobal = new WebAssembly.Global(
                        {
                            value: "i32",
                            mutable: true
                        },
                        0
                    );
                    
                    const instance = await WebAssembly.instantiate(module, {
                        env: {
                            print: (value) => console.log('Script:', value),
                            abort: () => console.error('Script aborted')
                        },
                        engine: {
                            self: selfGlobal,
                            
                            objectSet: (id, type, value) => {
                                updateObjectById(id, type, value);
                            },

                            objectGet: (id, type) => {
                                return getObjectById(id, type);
                            },

                            getKey: (id) => {
                                return isKeyPressed(id);
                            },
                        }
                    });
                    
                    this.instances.set(name, instance);
                    this.selfGlobals.set(name, selfGlobal);

                    //selfGlobal.value = 0;
                    //instance.exports.main();

                    console.log('Loaded script:', name);
                    return instance;
                } catch (error) {
                    console.error('Failed to load script:', name, error);
                    return null;
                }
            }
            
            executeScript(name, functionName = 'main') {
                const instance = this.instances.get(name);
                if (instance && instance.exports[functionName]) {
                    try {
                        return instance.exports[functionName]();
                    } catch (error) {
                        console.error('Script execution error:', error);
                    }
                }
                return null;
            }
        }

        window.wasmRuntime = new WiggyWasmRuntime();
`;

const HTMLfileEnd = `
</body>
</html>
`;

function getHTMLHeader(safeName) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>${safeName} - ${globalEditorVersion['WGY']} ${globalEditorVersion['ED']} Game</title>
    <style>
        body { margin: 0; padding: 0; background: #000; color: #fff; font-family: Arial; }
        #game-container { text-align: center; padding: 20px; }
        #game-info { margin-top: 10px; font-size: 12px; color: #888; }

        #canvas {
            position: absolute;
            width: 100%;
            height: 100vh;
            top: 0;
            left: 0;
        }
    </style>
</head>
`;
}
