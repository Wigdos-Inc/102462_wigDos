/**
 * Project Builder - Compiles entire project into deployable HTML with WASM
 */
class ProjectBuilder {
    constructor() {
        this.compiler = new WigLangCompiler();
        this.errors = [];
        this.warnings = [];
        this.statistics = {
            totalScripts: 0,
            compiledScripts: 0,
            totalAssets: 0,
            buildTime: 0
        };
    }
    
    async buildProject(project) {
        const startTime = Date.now();
        this.errors = [];
        this.warnings = [];
        
        try {
            console.log('🏗️ Starting project build...');
            
            // Step 1: Compile all scripts
            const compiledScripts = await this.compileProjectScripts(project);
            
            // Step 2: Process scenes
            const processedScenes = this.processScenes(project.scenes);
            
            // Step 3: Gather assets (textures, models, etc.)
            const processedAssets = this.processAssets(project);
            
            // Step 4: Generate WebAssembly runtime
            const wasmRuntime = this.generateWasmRuntime();
            
            // Step 5: Create final HTML
            const html = this.generateHTML(project, {
                scripts: compiledScripts,
                scenes: processedScenes,
                assets: processedAssets,
                runtime: wasmRuntime
            });
            
            const buildTime = Date.now() - startTime;
            this.statistics.buildTime = buildTime;
            
            console.log(`✅ Build completed in ${buildTime}ms`);
            
            return {
                success: true,
                html: html,
                stats: this.getStatisticsString(),
                errors: this.errors,
                warnings: this.warnings
            };
            
        } catch (error) {
            console.error('❌ Build failed:', error);
            return {
                success: false,
                error: error.message,
                errors: this.errors,
                warnings: this.warnings
            };
        }
    }
    
    async compileProjectScripts(project) {
        const compiledScripts = [];
        this.statistics.totalScripts = 0;
        this.statistics.compiledScripts = 0;
        
        // Get all script components from game objects
        for (const scene of project.scenes) {
            for (const gameObject of scene.gameObjects) {
                for (const component of gameObject.components) {
                    if (component.type === 'script' && component.code) {
                        this.statistics.totalScripts++;
                        
                        console.log(`📝 Compiling script: ${component.name || 'Unnamed'}`);
                        const result = this.compiler.compile(component.code);
                        
                        if (result.success) {
                            compiledScripts.push({
                                name: component.name || `script_${this.statistics.compiledScripts}`,
                                wasm: result.wasm,
                                source: component.code,
                                gameObjectId: gameObject.id,
                                componentId: component.id
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
        const processedScenes = [];
        
        for (const scene of scenes) {
            const processedScene = {
                name: scene.name,
                gameObjects: scene.gameObjects.map(go => ({
                    id: go.id,
                    name: go.name,
                    transform: go.transform,
                    components: go.components.map(comp => {
                        // Remove script source code from runtime, keep only references
                        if (comp.type === 'script') {
                            return {
                                ...comp,
                                code: undefined, // Remove source code
                                compiled: true
                            };
                        }
                        return comp;
                    })
                }))
            };
            processedScenes.push(processedScene);
        }
        
        return processedScenes;
    }
    
    processAssets(project) {
        // For now, return empty assets array since we don't have asset management yet
        // This can be extended when asset management is added
        this.statistics.totalAssets = 0;
        
        return {
            textures: [],
            models: [],
            audio: [],
            other: []
        };
    }
    
    generateWasmRuntime() {
        return `
// WebAssembly Runtime for WiggyEngine
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
                    // Environment functions that scripts can call
                    print: (value) => console.log('Script output:', value),
                    abort: () => console.error('Script aborted')
                }
            });
            
            this.instances.set(name, instance);
            console.log('Loaded WASM script:', name);
            
            return instance;
        } catch (error) {
            console.error('Failed to load WASM script:', name, error);
            return null;
        }
    }
    
    executeScript(name, functionName = 'main', ...args) {
        const instance = this.instances.get(name);
        if (!instance) {
            console.error('Script not found:', name);
            return null;
        }
        
        const func = instance.exports[functionName];
        if (!func) {
            console.error('Function not found in script:', functionName, 'in', name);
            return null;
        }
        
        try {
            return func(...args);
        } catch (error) {
            console.error('Script execution error:', error);
            return null;
        }
    }
    
    getAllScripts() {
        return Array.from(this.modules.keys());
    }
}

// Global runtime instance
window.wasmRuntime = new WiggyWasmRuntime();
`;
    }
    
    generateHTML(project, buildData) {
        // Convert WASM binaries to base64 for embedding
        const wasmData = buildData.scripts.map(script => ({
            name: script.name,
            wasm: this.arrayBufferToBase64(script.wasm),
            gameObjectId: script.gameObjectId,
            componentId: script.componentId
        }));
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${project.name} - WiggyEngine Game</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            background-color: #000;
            color: #fff;
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        
        #game-container {
            text-align: center;
        }
        
        #game-canvas {
            border: 1px solid #333;
            background-color: #111;
        }
        
        #game-info {
            margin-top: 10px;
            font-size: 12px;
            color: #888;
        }
        
        #loading {
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div id="game-container">
        <canvas id="game-canvas" width="800" height="600"></canvas>
        <div id="game-info">
            <p><strong>${project.name}</strong></p>
            <p>Gemaakt met WiggyEngine</p>
            <p>Scripts: ${buildData.scripts.length} | Scenes: ${buildData.scenes.length}</p>
        </div>
        <div id="loading">Laden...</div>
    </div>

    <script>
        // Embedded project data
        const projectData = ${JSON.stringify({
            name: project.name,
            scenes: buildData.scenes,
            scripts: wasmData,
            assets: buildData.assets
        }, null, 8)};
        
        ${buildData.runtime}
        
        // Simple 3D renderer for the game
        class GameRenderer {
            constructor(canvas) {
                this.canvas = canvas;
                this.ctx = canvas.getContext('2d');
                this.isRunning = false;
            }
            
            start() {
                this.isRunning = true;
                this.render();
            }
            
            stop() {
                this.isRunning = false;
            }
            
            render() {
                if (!this.isRunning) return;
                
                // Clear canvas
                this.ctx.fillStyle = '#111';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                
                // Simple placeholder rendering
                this.ctx.fillStyle = '#333';
                this.ctx.fillRect(100, 100, 600, 400);
                
                this.ctx.fillStyle = '#fff';
                this.ctx.font = '24px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('${project.name}', this.canvas.width / 2, this.canvas.height / 2);
                
                this.ctx.font = '16px Arial';
                this.ctx.fillText('Game wordt uitgevoerd...', this.canvas.width / 2, this.canvas.height / 2 + 40);
                
                requestAnimationFrame(() => this.render());
            }
        }
        
        // Game initialization
        async function initializeGame() {
            console.log('🎮 Initializing game:', projectData.name);
            
            // Load all WASM scripts
            for (const script of projectData.scripts) {
                const wasmBytes = Uint8Array.from(atob(script.wasm), c => c.charCodeAt(0));
                await window.wasmRuntime.loadScript(script.name, wasmBytes);
            }
            
            // Initialize renderer
            const canvas = document.getElementById('game-canvas');
            const renderer = new GameRenderer(canvas);
            renderer.start();
            
            // Execute main scripts
            for (const script of projectData.scripts) {
                console.log('Executing script:', script.name);
                window.wasmRuntime.executeScript(script.name, 'main');
            }
            
            document.getElementById('loading').textContent = 'Game geladen!';
            
            console.log('✅ Game initialized successfully');
        }
        
        // Start the game when page loads
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
        return `${this.statistics.compiledScripts}/${this.statistics.totalScripts} scripts compiled in ${this.statistics.buildTime}ms`;
    }
}