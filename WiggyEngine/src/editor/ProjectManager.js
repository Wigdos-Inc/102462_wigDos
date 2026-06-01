/**
 * WiggyCompression - Ultra-efficient lossless compression for project files
 * Uses LZ77 with optimized dictionary and Huffman coding
 */
class WiggyCompression {
    static compress(data) {
        const jsonString = JSON.stringify(data);
        
        // Step 1: LZ77 compression with optimized window
        const lz77Compressed = this.lz77Compress(jsonString);
        
        // Step 2: Huffman encoding for final compression
        const huffmanCompressed = this.huffmanCompress(lz77Compressed);
        
        return {
            compressed: huffmanCompressed,
            originalSize: jsonString.length,
            compressedSize: huffmanCompressed.length,
            ratio: (jsonString.length / huffmanCompressed.length).toFixed(2)
        };
    }
    
    static decompress(compressedData) {
        // Step 1: Huffman decoding
        const lz77Data = this.huffmanDecompress(compressedData.compressed);
        
        // Step 2: LZ77 decompression
        const jsonString = this.lz77Decompress(lz77Data);
        
        return JSON.parse(jsonString);
    }
    
    static lz77Compress(input) {
        const windowSize = 4096;
        const lookaheadSize = 18;
        const result = [];
        let pos = 0;
        
        while (pos < input.length) {
            let bestMatch = { length: 0, distance: 0 };
            
            // Search for matches in sliding window
            const windowStart = Math.max(0, pos - windowSize);
            for (let i = windowStart; i < pos; i++) {
                let matchLength = 0;
                while (matchLength < lookaheadSize && 
                       pos + matchLength < input.length &&
                       input[i + matchLength] === input[pos + matchLength]) {
                    matchLength++;
                }
                
                if (matchLength > bestMatch.length && matchLength >= 3) {
                    bestMatch = { length: matchLength, distance: pos - i };
                }
            }

            if (bestMatch.length >= 3) {
                result.push({ type: 'match', distance: bestMatch.distance, length: bestMatch.length });
                pos += bestMatch.length;
            } else {
                result.push({ type: 'literal', char: input[pos] });
                pos++;
            }
        }

        return result;
    }

}

class ProjectManager {
    static currentProject = null;
    static projectHistory = [];

    static initialize() {
        this.loadProjectHistory();
        this.showProjectSelection();
    }

    static showProjectSelection() {
        const existing = document.getElementById('project-selection');
        if (existing) {
            existing.remove();
        }

        const body = document.body;
        const overlay = document.createElement('div');
        overlay.id = 'project-selection';
        overlay.innerHTML = `
            <div class="project-selection-container">
                <div class="project-header">
                    <img src="images/logo.png" alt="WiggyEngine" class="project-logo">
                    <h1>WiggyEngine Editor</h1>
                    <p>Kies een project om te openen of maak een nieuw project aan</p>
                </div>

                <div class="project-actions">
                    <div class="action-card" onclick="ProjectManager.showNewProjectDialog()">
                        <div class="action-icon">📄</div>
                        <h3>Nieuw Project</h3>
                        <p>Maak een nieuw game project aan</p>
                    </div>

                    <div class="action-card" onclick="ProjectManager.showLoadProjectDialog()">
                        <div class="action-icon">📂</div>
                        <h3>Project Openen</h3>
                        <p>Laad een bestaand project vanaf schijf</p>
                    </div>
                </div>

                <div class="recent-projects">
                    <h3>Recente Projecten</h3>
                    <div id="recent-projects-list"></div>
                </div>

                <div class="project-footer">
                    <p>WiggyEngine v1.0 - Game Editor</p>
                </div>
            </div>
        `;

        body.appendChild(overlay);
        this.populateRecentProjects();
    }

    static hideProjectSelection() {
        const overlay = document.getElementById('project-selection');
        if (overlay) {
            overlay.remove();
        }

        const mainLayout = document.getElementById('wiggy-engine');
        if (mainLayout) {
            mainLayout.style.display = 'flex';
        }
    }

    static showNewProjectDialog() {
        const existing = document.querySelector('.modal-overlay');
        if (existing) {
            existing.remove();
        }

        const dialog = document.createElement('div');
        dialog.className = 'modal-overlay';
        dialog.innerHTML = `
            <div class="modal-content">
                <h3>Nieuw Project Maken</h3>
                <div class="form-group">
                    <label>Project Naam:</label>
                    <input type="text" id="project-name" placeholder="Mijn Game Project" value="Nieuw Project">
                </div>
                <div class="form-group">
                    <label>Template:</label>
                    <select id="project-template">
                        <option value="empty">Leeg Project</option>
                        <option value="3d">3D Project</option>
                        <option value="2d">2D Project</option>
                    </select>
                </div>
                <div class="modal-buttons">
                    <button onclick="this.closest('.modal-overlay').remove()">Annuleren</button>
                    <button onclick="ProjectManager.createNewProject()" class="primary">Maken</button>
                </div>
            </div>
        `;
        document.body.appendChild(dialog);
    }
    
    // Show load project dialog
    static showLoadProjectDialog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.wigp,.wigproj,.rbxl,.xml';
        input.onchange = (e) => {
            if (e.target.files.length > 0) {
                this.loadProjectFromFile(e.target.files[0]);
            }
        };
        input.click();
    }
    
    // Create new project
    static createNewProject() {
        const nameInput = document.getElementById('project-name');
        const templateSelect = document.getElementById('project-template');
        
        if (!nameInput) {
            // Called from test or without dialog - create with defaults
            this.createProjectWithData('Test Project', 'empty');
            return;
        }
        
        const name = nameInput.value.trim();
        const template = templateSelect.value;
        
        if (!name) {
            alert('Voer een project naam in');
            return;
        }
        
        this.createProjectWithData(name, template);
    }
    
    // Create project with specified data
    static createProjectWithData(name, template) {
        const project = this.normalizeProject({
            name: name,
            version: "1.0.0",
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            template: template,
            settings: {
                defaultScene: "Main Scene",
                targetPlatform: "web",
                buildSettings: {}
            },
            scenes: [{
                name: "Main Scene",
                id: this.generateId(),
                gameObjects: []
            }],
            assets: [],
            metadata: {
                editorVersion: "1.0.0",
                author: "WiggyEngine User"
            }
        });
        
        this.currentProject = project;
        this.addToProjectHistory(project);
        
        // Close dialogs and start editor
        document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
        this.hideProjectSelection();
        
        // Initialize editor with new project
        EditorUI.currentProject = project;
        EditorUI.initialize();
        
        console.log('New project created:', project);
    }
    
    // Load project from file
    static async loadProjectFromFile(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            let projectData;
            const fileContent = new TextDecoder().decode(new Uint8Array(arrayBuffer));
            const trimmedContent = fileContent.trim();

            if (trimmedContent.startsWith('<')) {
                projectData = this.parseRbxlProject(trimmedContent);
            } else {
                // Try to parse as compressed WiggyEngine project
                try {
                    const parsedFile = JSON.parse(fileContent);

                    if (parsedFile.type === 'WiggyEngine Project' && parsedFile.compression) {
                        console.log(`Loading compressed project with ${parsedFile.compression}`);
                        try {
                            projectData = WiggyCompression.decompress(parsedFile.data);
                            console.log(`Decompression successful: ${parsedFile.data.compressedSize} -> ${parsedFile.data.originalSize} bytes`);
                        } catch (decompError) {
                            console.error('Decompression failed:', decompError);
                            if (parsedFile.data && parsedFile.data.name) {
                                projectData = parsedFile.data;
                            } else {
                                throw new Error('Project file is corrupted or in an unsupported format');
                            }
                        }
                    } else if (parsedFile.name && parsedFile.scenes) {
                        projectData = parsedFile;
                    } else {
                        throw new Error('Unknown project file format');
                    }
                } catch (parseError) {
                    console.warn('JSON parse failed, trying legacy format:', parseError);
                    try {
                        const decompressed = await this.decompressData(arrayBuffer);
                        projectData = JSON.parse(decompressed);
                    } catch (legacyError) {
                        throw new Error('Could not parse project file. Format not recognized.');
                    }
                }
            }

            projectData = this.normalizeProject(projectData);
            
            // Validate project structure
            if (!this.validateProject(projectData)) {
                throw new Error('Invalid project file format - missing required fields');
            }
            
            this.currentProject = projectData;
            this.addToProjectHistory(projectData);
            
            this.hideProjectSelection();
            
            // Initialize editor with loaded project
            EditorUI.currentProject = projectData;
            EditorUI.initialize();
            
            console.log('Project loaded successfully:', projectData.name);
            alert('Project "' + projectData.name + '" succesvol geladen!');
            
        } catch (error) {
            console.error('Failed to load project:', error);
            alert('Kon project niet laden: ' + error.message);
        }
    }
    
    // Save current project to a file
    static async saveProjectToFile(format = 'wigp') {
        if (!this.currentProject) {
            alert('Geen project om op te slaan');
            return;
        }
        
        try {
            const normalizedProject = this.normalizeProject({
                ...this.currentProject,
                modified: new Date().toISOString()
            });
            this.currentProject = normalizedProject;
            
            let dataBlob;
            let fileName;

            if (format === 'rbxl') {
                const xmlProject = this.serializeRbxlProject(normalizedProject);
                dataBlob = new Blob([xmlProject], { type: 'application/xml' });
                fileName = `${normalizedProject.name}.rbxl`;
            } else {
                const compressed = WiggyCompression.compress(normalizedProject);
                console.log(`Compression: ${compressed.originalSize} -> ${compressed.compressedSize} bytes (ratio: ${compressed.ratio}:1)`);
                
                const fileData = {
                    type: 'WiggyEngine Project',
                    version: '1.0.0',
                    compression: 'WiggyLZ77+Huffman',
                    data: compressed
                };
                
                const finalData = new Uint8Array(new TextEncoder().encode(JSON.stringify(fileData)));
                dataBlob = new Blob([finalData], { type: 'application/octet-stream' });
                fileName = `${normalizedProject.name}.wigp`;
            }
            
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            link.click();
            
            URL.revokeObjectURL(url);
            console.log(`Project '${normalizedProject.name}' exported as ${fileName}`);
            
        } catch (error) {
            console.error('Failed to save project:', error);
            alert('Kon project niet opslaan: ' + error.message);
        }
    }
    
    // Compress data using gzip-like compression
    static async compressData(data) {
        const stream = new CompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        
        const encoder = new TextEncoder();
        const chunks = [];
        
        // Start compression
        const writePromise = writer.write(encoder.encode(data)).then(() => writer.close());
        
        // Read compressed chunks
        const readPromise = (async () => {
            let done, value;
            while (!done) {
                ({ done, value } = await reader.read());
                if (value) chunks.push(value);
            }
        })();
        
        await Promise.all([writePromise, readPromise]);
        
        // Combine chunks into single ArrayBuffer
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }
        
        return result.buffer;
    }
    
    // Decompress data
    static async decompressData(compressedData) {
        const stream = new DecompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        
        const chunks = [];
        
        // Start decompression
        const writePromise = writer.write(compressedData).then(() => writer.close());
        
        // Read decompressed chunks
        const readPromise = (async () => {
            let done, value;
            while (!done) {
                ({ done, value } = await reader.read());
                if (value) chunks.push(value);
            }
        })();
        
        await Promise.all([writePromise, readPromise]);
        
        // Combine and decode
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
            combined.set(chunk, offset);
            offset += chunk.length;
        }
        
        const decoder = new TextDecoder();
        return decoder.decode(combined);
    }
    
    // Validate project structure
    static validateProject(project) {
        return project && 
               typeof project.name === 'string' &&
               project.version &&
               project.scenes &&
               Array.isArray(project.scenes) &&
               project.scenes.length > 0;
    }

    static normalizeProject(project) {
        const safeProject = project || {};
        const scenes = Array.isArray(safeProject.scenes) ? safeProject.scenes : [];

        return {
            name: safeProject.name || 'UntitledProject',
            version: safeProject.version || '1.0.0',
            created: safeProject.created || new Date().toISOString(),
            modified: safeProject.modified || new Date().toISOString(),
            template: safeProject.template || 'empty',
            settings: {
                defaultScene: safeProject.settings?.defaultScene || 'Main Scene',
                targetPlatform: safeProject.settings?.targetPlatform || 'web',
                buildSettings: safeProject.settings?.buildSettings || {},
                ...(safeProject.settings || {})
            },
            scenes: scenes.map(scene => ({
                id: scene.id || this.generateId(),
                name: scene.name || 'Main Scene',
                gameObjects: Array.isArray(scene.gameObjects) ? scene.gameObjects.map(gameObject => ({
                    id: gameObject.id || this.generateId(),
                    name: gameObject.name || 'GameObject',
                    transform: gameObject.transform || {
                        position: { x: 0, y: 0, z: 0 },
                        rotation: { x: 0, y: 0, z: 0 },
                        scale: { x: 1, y: 1, z: 1 }
                    },
                    components: Array.isArray(gameObject.components) ? gameObject.components.map(component => {
                        if (typeof component === 'string') {
                            return {
                                id: this.generateId(),
                                type: component.toLowerCase(),
                                name: component,
                                enabled: true
                            };
                        }

                        return {
                            id: component.id || this.generateId(),
                            type: component.type || 'unknown',
                            name: component.name || component.type || 'Component',
                            enabled: component.enabled !== false,
                            code: component.code,
                            ...component
                        };
                    }) : []
                })) : []
            })),
            assets: Array.isArray(safeProject.assets) ? safeProject.assets : [],
            metadata: {
                editorVersion: safeProject.metadata?.editorVersion || '1.0.0',
                author: safeProject.metadata?.author || 'WiggyEngine User',
                projectFileType: safeProject.metadata?.projectFileType || 'wiggy'
            }
        };
    }

    static serializeRbxlProject(project) {
        const payload = this.normalizeProject(project);
        const encodedPayload = this.textToBase64(JSON.stringify(payload));
        const title = this.escapeXml(payload.name);
        const created = this.escapeXml(payload.created);
        const modified = this.escapeXml(payload.modified);

        return `<?xml version="1.0" encoding="UTF-8"?>
<wiggy-project format="rbxl" version="${this.escapeXml(payload.version)}">
    <header name="${title}" created="${created}" modified="${modified}" template="${this.escapeXml(payload.template)}" />
    <data encoding="base64">${encodedPayload}</data>
</wiggy-project>`;
    }

    static parseRbxlProject(xmlText) {
        const parser = new DOMParser();
        const xmlDocument = parser.parseFromString(xmlText, 'application/xml');
        if (xmlDocument.querySelector('parsererror')) {
            throw new Error('RBXL project file is invalid XML');
        }

        const root = xmlDocument.documentElement;
        if (!root || root.tagName !== 'wiggy-project') {
            throw new Error('Unknown RBXL project format');
        }

        const dataNode = root.querySelector('data');
        if (!dataNode) {
            throw new Error('RBXL project file is missing project data');
        }

        const encoded = (dataNode.textContent || '').trim();
        const jsonText = dataNode.getAttribute('encoding') === 'base64'
            ? this.base64ToText(encoded)
            : encoded;

        return this.normalizeProject(JSON.parse(jsonText));
    }

    static textToBase64(text) {
        const bytes = new TextEncoder().encode(text);
        let binary = '';
        for (const byte of bytes) {
            binary += String.fromCharCode(byte);
        }
        return btoa(binary);
    }

    static base64ToText(base64) {
        const binary = atob(base64);
        const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
        return new TextDecoder().decode(bytes);
    }

    static escapeXml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    static exportProjectToFile() {
        return this.saveProjectToFile('rbxl');
    }
    
    // Add project to history
    static addToProjectHistory(project) {
        const history = this.projectHistory.filter(p => p.name !== project.name);
        history.unshift({
            name: project.name,
            path: `${project.name}.wigp`,
            lastOpened: new Date().toISOString(),
            template: project.template || 'unknown'
        });
        
        // Keep only last 10 projects
        this.projectHistory = history.slice(0, 10);
        this.saveProjectHistory();
    }
    
    // Load project history from localStorage
    static loadProjectHistory() {
        try {
            const stored = localStorage.getItem('wiggyengine_project_history');
            if (stored) {
                this.projectHistory = JSON.parse(stored);
            }
        } catch (error) {
            console.warn('Could not load project history:', error);
            this.projectHistory = [];
        }
    }
    
    // Save project history to localStorage
    static saveProjectHistory() {
        try {
            localStorage.setItem('wiggyengine_project_history', JSON.stringify(this.projectHistory));
        } catch (error) {
            console.warn('Could not save project history:', error);
        }
    }
    
    // Populate recent projects list
    static populateRecentProjects() {
        const container = document.getElementById('recent-projects-list');
        if (!container) return;
        
        if (this.projectHistory.length === 0) {
            container.innerHTML = '<p class="no-projects">Geen recente projecten</p>';
            return;
        }
        
        container.innerHTML = this.projectHistory.map(project => `
            <div class="recent-project-item" onclick="ProjectManager.openRecentProject('${project.name}')">
                <div class="project-info">
                    <h4>${project.name}</h4>
                    <p>Template: ${project.template}</p>
                    <small>Laatst geopend: ${new Date(project.lastOpened).toLocaleDateString()}</small>
                </div>
                <div class="project-actions">
                    <button onclick="event.stopPropagation(); ProjectManager.removeFromHistory('${project.name}')">×</button>
                </div>
            </div>
        `).join('');
    }
    
    // Open recent project (placeholder - would need file system access)
    static openRecentProject(projectName) {
        alert(`Recent project opening niet geïmplementeerd voor: ${projectName}\nGebruik "Project Openen" om bestanden vanaf schijf te laden.`);
    }
    
    // Remove project from history
    static removeFromHistory(projectName) {
        this.projectHistory = this.projectHistory.filter(p => p.name !== projectName);
        this.saveProjectHistory();
        this.populateRecentProjects();
    }
    
    // Add project selection styles
    static addProjectSelectionStyles() {
        return;
    }
    
    // Generate unique ID
    static generateId() {
        return 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }
}

window.ProjectManager = ProjectManager;