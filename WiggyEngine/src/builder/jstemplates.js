function getexportHTML(project, buildData, builder) {
    const wasmData = buildData.scripts.map(script => ({
        name: script.name,
        wasm: builder.arrayBufferToBase64(script.wasm),
        gameObjectId: script.gameObjectId
    }));

    const safeName = builder.escapeHtml(project.name);
    const projectDataJson = JSON.stringify({ name: project.name, scenes: buildData.scenes, scripts: wasmData }).replace(/</g, '\\u003c');
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
                                const glbParser = new Engine.GLBParser(renderer, camera);
                                const glb = await glbParser.loadGLB(component.link);
                                geometry = glbParser.ConvertToFlatMesh(glb);
                                break;
                            }
                        }

                        if(geometry == null) continue;

                        const mesh = new Engine.Mesh(renderer, geometry);
                        mesh.position = object.transform.position;
                        mesh.rotation = object.transform.rotation;
                        mesh.scale = object.transform.scale;

                        mesh.updateMatrix();

                        scene[sceneObjs++] = mesh;

                        console.log(object, mesh);
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

    function MainGameLoop() {
        renderer.render(scene, camera);
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
    `;
}

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
            for (const script of projectData.scripts) {
                const wasmBytes = Uint8Array.from(atob(script.wasm), c => c.charCodeAt(0));
                await window.wasmRuntime.loadScript(script.name, wasmBytes);
            }
            
            updateProgress(60);
            
            updateProgress(80);
            for (const script of projectData.scripts) {
                window.wasmRuntime.executeScript(script.name, 'main');
            }
            
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
            }
            
            async loadScript(name, wasmBytes) {
                try {
                    const module = await WebAssembly.compile(wasmBytes);
                    this.modules.set(name, module);
                    
                    const instance = await WebAssembly.instantiate(module, {
                        env: {
                            print: (value) => console.log('Script:', value),
                            abort: () => console.error('Script aborted')
                        }
                    });
                    
                    this.instances.set(name, instance);
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
