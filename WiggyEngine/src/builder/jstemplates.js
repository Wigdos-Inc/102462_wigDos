function getHTMLbody(project, buildData, safeName) {
    return `
<body>
    ${getSplash(window.location.href + '/images/logo2.png')}
    
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
<script type="module">
    let BurtCore = await import('${BurtCorePath}');
    BurtCore = BurtCore.BurtCore;

    window.Engine = BurtCore;
    window.Matrix4 = new BurtCore.Mat4;
    window.canvas = document.getElementById('canvas');

    canvas.addEventListener("contextmenu", (event) => {
        event.preventDefault();
    });

    cosnt renderer = new Engine.WebGLRenderer(canvas);
    renderer.gridVisible = false;
    renderer.backgroundColor = [0,0.7,1,1];

    const camera = new Engine.FreeCamera();
    const scene = [];

    function FillScene() {
        for(scene of projectData.scenes) {
            for(object of scene.gameObjects) {
                console.log(object);
            }
        }
    }

    function MainGameLoop() {
        renderer.render(scene, camera);
        requestAnimationFrame(MainGameLoop);
    }
</script>
`;

const CarlNetLoader = `
<script type="module">
    function MainGameLoop() {

    }
</script>
`;

function getGlobalScriptVariables(projectDataJson) {
    return `
    <script>
        const projectData = ${projectDataJson};
    </script>
    `;
}

function getBootscript(scriptProjectName) {
    return `
<script>
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
                    MainGameLoop();
                }, 500);
            }, 1000);
        }
        
        window.addEventListener('load', initializeGame);
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
