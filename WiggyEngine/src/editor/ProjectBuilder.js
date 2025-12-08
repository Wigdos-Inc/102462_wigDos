class ProjectBuilder {
    constructor() {
        this.compiler = new WigLangCompiler();
        this.errors = [];
        this.statistics = { totalScripts: 0, compiledScripts: 0, buildTime: 0 };
    }
    
    async buildProject(project) {
        const startTime = Date.now();
        this.errors = [];
        
        try {
            console.log('Building project...');
            
            const compiledScripts = await this.compileProjectScripts(project);
            const processedScenes = this.processScenes(project.scenes);
            const html = this.generateHTML(project, { scripts: compiledScripts, scenes: processedScenes });
            
            this.statistics.buildTime = Date.now() - startTime;
            
            return {
                success: true,
                html: html,
                stats: this.getStatisticsString(),
                errors: this.errors
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                errors: this.errors
            };
        }
    }
    
    async compileProjectScripts(project) {
        const compiledScripts = [];
        this.statistics.totalScripts = 0;
        this.statistics.compiledScripts = 0;
        
        for (const scene of project.scenes) {
            for (const gameObject of scene.gameObjects) {
                for (const component of gameObject.components) {
                    if (component.type === 'script' && component.code) {
                        this.statistics.totalScripts++;
                        
                        const result = this.compiler.compile(component.code);
                        
                        if (result.success) {
                            compiledScripts.push({
                                name: component.name || `script_${this.statistics.compiledScripts}`,
                                wasm: result.wasm,
                                gameObjectId: gameObject.id
                            });
                            this.statistics.compiledScripts++;
                        } else {
                            this.errors.push(`Script compilation failed: ${result.errors.join(', ')}`);
                        }
                    }
                }
            }
        }
        
        return compiledScripts;
    }
    
    processScenes(scenes) {
        return scenes.map(scene => ({
            name: scene.name,
            gameObjects: scene.gameObjects.map(go => ({
                id: go.id,
                name: go.name,
                transform: go.transform,
                components: go.components.filter(c => c.type !== 'script')
            }))
        }));
    }
    
    generateHTML(project, buildData) {
        const wasmData = buildData.scripts.map(script => ({
            name: script.name,
            wasm: this.arrayBufferToBase64(script.wasm),
            gameObjectId: script.gameObjectId
        }));
        
        return `<!DOCTYPE html>
<html>
<head>
    <title>${project.name} - WiggyEngine Game</title>
    <style>
        body { margin: 0; padding: 0; background: #000; color: #fff; font-family: Arial; }
        #game-container { text-align: center; padding: 20px; }
        #game-canvas { border: 1px solid #333; background: #111; }
        #game-info { margin-top: 10px; font-size: 12px; color: #888; }
        
        #splash-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        }
        
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
    </style>
</head>
<body>
    <div id="splash-screen">
        <div style="text-align: center; animation: fadeInUp 1s ease-out;">
            <div style="
                width: 120px;
                height: 120px;
                background: #4CAF50;
                border-radius: 20px;
                margin: 0 auto 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 48px;
                font-weight: bold;
                color: white;
                box-shadow: 0 0 30px rgba(76,175,80,0.5);
            ">W</div>
            <h1 style="
                font-size: 36px;
                font-weight: 300;
                margin: 0 0 10px 0;
                color: #4CAF50;
                text-shadow: 0 0 10px rgba(76,175,80,0.5);
            ">WiggyEngine</h1>
            <p style="font-size: 16px; margin: 0 0 20px 0; color: #bbb;">${project.name}</p>
            <div style="font-size: 12px; color: #888; line-height: 1.6;">
                <p>Version 1.0.0</p>
                <p>© 2025 WiggyEngine. All rights reserved.</p>
            </div>
            <div style="
                margin-top: 30px;
                width: 150px;
                height: 3px;
                background: #333;
                border-radius: 2px;
                overflow: hidden;
            ">
                <div id="splash-progress" style="
                    width: 0;
                    height: 100%;
                    background: linear-gradient(90deg, #4CAF50, #81C784);
                    border-radius: 2px;
                    transition: width 0.3s ease;
                "></div>
            </div>
        </div>
    </div>
    
    <div id="game-container" style="display: none;">
        <canvas id="game-canvas" width="800" height="600"></canvas>
        <div id="game-info">
            <p><strong>${project.name}</strong></p>
            <p>Gemaakt met WiggyEngine - Scripts: ${buildData.scripts.length} | Scenes: ${buildData.scenes.length}</p>
        </div>
    </div>

    <script>
        const projectData = ${JSON.stringify({ name: project.name, scenes: buildData.scenes, scripts: wasmData })};
        
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
        
        class GameRenderer {
            constructor(canvas) {
                this.canvas = canvas;
                this.ctx = canvas.getContext('2d');
            }
            
            start() {
                this.render();
            }
            
            render() {
                this.ctx.fillStyle = '#111';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                
                this.ctx.fillStyle = '#fff';
                this.ctx.font = '24px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('${project.name}', this.canvas.width / 2, this.canvas.height / 2);
                
                this.ctx.font = '16px Arial';
                this.ctx.fillText('Game Running...', this.canvas.width / 2, this.canvas.height / 2 + 40);
                
                requestAnimationFrame(() => this.render());
            }
        }
        
        window.wasmRuntime = new WiggyWasmRuntime();
        
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
            const canvas = document.getElementById('game-canvas');
            const renderer = new GameRenderer(canvas);
            
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
                    renderer.start();
                }, 500);
            }, 1000);
        }
        
        window.addEventListener('load', initializeGame);
    </script>
</body>
</html>`;
    }
    
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
    
    getStatisticsString() {
        return `${this.statistics.compiledScripts}/${this.statistics.totalScripts} scripts in ${this.statistics.buildTime}ms`;
    }
}