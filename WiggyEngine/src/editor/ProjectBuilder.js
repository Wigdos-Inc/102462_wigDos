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
            
            const normalizedProject = this.normalizeProject(project);
            const compiledScripts = await this.compileProjectScripts(normalizedProject);
            const processedScenes = this.processScenes(normalizedProject.scenes);
            const html = this.generateHTML(normalizedProject, { scripts: compiledScripts, scenes: processedScenes });
            
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
        
        for (const scene of project.scenes || []) {
            for (const gameObject of scene.gameObjects || []) {
                for (const component of gameObject.components || []) {
                      if (String(component.type).toLowerCase() === 'script') {
                          const code = this.resolveScriptSource(project, component);
                          if (!code) {
                              this.errors.push(`Script '${component.name || component.scriptName || component.scriptAssetId || 'unnamed'}' has no source code`);
                              continue;
                          }

                        this.statistics.totalScripts++;
                        
                          const result = this.compiler.compile(code);
                        
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

      resolveScriptSource(project, component) {
          if (component.code) {
              return component.code;
          }

          const assets = Array.isArray(project.assets) ? project.assets : [];
          const asset = assets.find(entry => entry.id === component.scriptAssetId || entry.name === component.scriptName);

          if (!asset) {
              return '';
          }

          return typeof asset.content === 'string' ? asset.content : '';
      }
    
    processScenes(scenes) {
        return (scenes || []).map(scene => ({
            name: scene.name,
            id: scene.id,
            gameObjects: (scene.gameObjects || []).map(go => ({
                id: go.id,
                name: go.name,
                transform: go.transform,
                components: (go.components || []).filter(c => c.type !== 'script')
            }))
        }));
    }

    normalizeProject(project) {
        const safeProject = project || {};
        return {
            name: safeProject.name || 'UntitledProject',
            version: safeProject.version || '1.0.0',
            created: safeProject.created || new Date().toISOString(),
            modified: safeProject.modified || new Date().toISOString(),
            template: safeProject.template || 'empty',
            settings: safeProject.settings || {},
            scenes: Array.isArray(safeProject.scenes) ? safeProject.scenes.map(scene => ({
                id: scene.id || `scene_${Math.random().toString(36).slice(2, 10)}`,
                name: scene.name || 'Main Scene',
                gameObjects: Array.isArray(scene.gameObjects) ? scene.gameObjects.map(gameObject => ({
                    id: gameObject.id || `go_${Math.random().toString(36).slice(2, 10)}`,
                    name: gameObject.name || 'GameObject',
                    transform: gameObject.transform || {
                        position: { x: 0, y: 0, z: 0 },
                        rotation: { x: 0, y: 0, z: 0 },
                        scale: { x: 1, y: 1, z: 1 }
                    },
                    components: Array.isArray(gameObject.components) ? gameObject.components.map(component => {
                        if (typeof component === 'string') {
                            return {
                                id: `component_${Math.random().toString(36).slice(2, 10)}`,
                                type: component.toLowerCase(),
                                name: component,
                                enabled: true
                            };
                        }

                        return {
                            id: component.id || `component_${Math.random().toString(36).slice(2, 10)}`,
                            type: component.type || 'unknown',
                            name: component.name || component.type || 'Component',
                            enabled: component.enabled !== false,
                            code: component.code,
                            ...component
                        };
                    }) : []
                })) : []
            })) : [],
            assets: Array.isArray(safeProject.assets) ? safeProject.assets : [],
            metadata: safeProject.metadata || {}
        };
    }

    escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    
    generateHTML(project, buildData) {
        const wasmData = buildData.scripts.map(script => ({
            name: script.name,
            wasm: this.arrayBufferToBase64(script.wasm),
            gameObjectId: script.gameObjectId
        }));
        const safeName = this.escapeHtml(project.name);
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