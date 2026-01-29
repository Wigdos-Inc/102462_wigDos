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
    
    static lz77Decompress(compressed) {
        let result = '';
        
        for (const token of compressed) {
            if (token.type === 'literal') {
                result += token.char;
            } else {
                const start = result.length - token.distance;
                for (let i = 0; i < token.length; i++) {
                    result += result[start + i];
                }
            }
        }
        
        return result;
    }
    
    static huffmanCompress(tokens) {
        // Build frequency table
        const frequencies = new Map();
        for (const token of tokens) {
            const key = JSON.stringify(token);
            frequencies.set(key, (frequencies.get(key) || 0) + 1);
        }
        
        // Build Huffman tree
        const tree = this.buildHuffmanTree(frequencies);
        const codes = this.generateHuffmanCodes(tree);
        
        // Encode data
        const encoded = tokens.map(token => codes.get(JSON.stringify(token))).join('');
        
        return {
            encoded: this.binaryToBytes(encoded),
            tree: tree,
            originalLength: tokens.length
        };
    }
    
    static huffmanDecompress(huffmanData) {
        const binaryString = this.bytesToBinary(huffmanData.encoded);
        const tokens = [];
        let pos = 0;
        
        while (tokens.length < huffmanData.originalLength && pos < binaryString.length) {
            const token = this.decodeHuffmanSymbol(binaryString, pos, huffmanData.tree);
            tokens.push(JSON.parse(token.symbol));
            pos = token.newPos;
        }
        
        return tokens;
    }
    
    static buildHuffmanTree(frequencies) {
        const heap = Array.from(frequencies.entries()).map(([symbol, freq]) => ({ symbol, freq, left: null, right: null }));
        
        while (heap.length > 1) {
            heap.sort((a, b) => a.freq - b.freq);
            const left = heap.shift();
            const right = heap.shift();
            
            heap.push({
                symbol: null,
                freq: left.freq + right.freq,
                left: left,
                right: right
            });
        }
        
        return heap[0];
    }
    
    static generateHuffmanCodes(tree, code = '', codes = new Map()) {
        if (!tree) return codes;
        
        if (tree.symbol !== null) {
            codes.set(tree.symbol, code || '0');
            return codes;
        }
        
        this.generateHuffmanCodes(tree.left, code + '0', codes);
        this.generateHuffmanCodes(tree.right, code + '1', codes);
        
        return codes;
    }
    
    static decodeHuffmanSymbol(binaryString, pos, tree) {
        let current = tree;
        let startPos = pos;
        
        while (current.symbol === null && pos < binaryString.length) {
            if (binaryString[pos] === '0') {
                current = current.left;
            } else {
                current = current.right;
            }
            pos++;
        }
        
        return { symbol: current.symbol, newPos: pos };
    }
    
    static binaryToBytes(binaryString) {
        const bytes = [];
        for (let i = 0; i < binaryString.length; i += 8) {
            const byte = binaryString.slice(i, i + 8).padEnd(8, '0');
            bytes.push(parseInt(byte, 2));
        }
        return new Uint8Array(bytes);
    }
    
    static bytesToBinary(bytes) {
        return Array.from(bytes)
            .map(byte => byte.toString(2).padStart(8, '0'))
            .join('');
    }
}

/**
 * Project Manager - Handles project creation, loading, saving with compression
 */
class ProjectManager {
    static currentProject = null;
    static projectHistory = [];
    
    // Initialize project manager
    static initialize() {
        this.loadProjectHistory();
        this.showProjectSelection();
    }
    
    // Show project selection screen
    static showProjectSelection() {
        const body = document.body;
        
        // Hide main editor interface
        const mainLayout = document.getElementById('wiggy-engine');
        if (mainLayout) mainLayout.style.display = 'none';
        
        // Create project selection overlay
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
                    <div id="recent-projects-list">
                        <!-- Recent projects will be populated here -->
                    </div>
                </div>
                
                <div class="project-footer">
                    <p>WiggyEngine v1.0 - Game Editor</p>
                </div>
            </div>
        `;
        
        body.appendChild(overlay);
        this.populateRecentProjects();
        this.addProjectSelectionStyles();
    }
    
    // Hide project selection and show main editor
    static hideProjectSelection() {
        const overlay = document.getElementById('project-selection');
        if (overlay) overlay.remove();
        
        const mainLayout = document.getElementById('wiggy-engine');
        if (mainLayout) mainLayout.style.display = 'flex';
    }
    
    // Show new project dialog
    static showNewProjectDialog() {
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
                    <label>Locatie:</label>
                    <input type="text" id="project-location" placeholder="C:/Projects/" readonly>
                    <small>Projecten worden opgeslagen als .wigp bestanden</small>
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
        input.accept = '.wigp,.wigproj';
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
        const project = {
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
        };
        
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
            
            // Try to parse as compressed WiggyEngine project
            try {
                const fileContent = new TextDecoder().decode(new Uint8Array(arrayBuffer));
                const parsedFile = JSON.parse(fileContent);
                
                if (parsedFile.type === 'WiggyEngine Project' && parsedFile.compression) {
                    console.log(`Loading compressed project with ${parsedFile.compression}`);
                    try {
                        projectData = WiggyCompression.decompress(parsedFile.data);
                        console.log(`Decompression successful: ${parsedFile.data.compressedSize} -> ${parsedFile.data.originalSize} bytes`);
                    } catch (decompError) {
                        console.error('Decompression failed:', decompError);
                        // Try to use the data directly if it's already in the right format
                        if (parsedFile.data && parsedFile.data.name) {
                            projectData = parsedFile.data;
                        } else {
                            throw new Error('Project file is corrupted or in an unsupported format');
                        }
                    }
                } else if (parsedFile.name && parsedFile.scenes) {
                    // Direct uncompressed format
                    projectData = parsedFile;
                } else {
                    throw new Error('Unknown project file format');
                }
            } catch (parseError) {
                console.warn('JSON parse failed, trying legacy format:', parseError);
                // Legacy format support
                try {
                    const decompressed = await this.decompressData(arrayBuffer);
                    projectData = JSON.parse(decompressed);
                } catch (legacyError) {
                    throw new Error('Could not parse project file. Format not recognized.');
                }
            }
            
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
    
    // Save current project to compressed file
    static async saveProjectToFile() {
        if (!this.currentProject) {
            alert('Geen project om op te slaan');
            return;
        }
        
        try {
            // Update modification time
            this.currentProject.modified = new Date().toISOString();
            
            // Compress project data using WiggyCompression
            const compressed = WiggyCompression.compress(this.currentProject);
            
            console.log(`Compression: ${compressed.originalSize} -> ${compressed.compressedSize} bytes (ratio: ${compressed.ratio}:1)`);
            
            // Create final file with compression metadata
            const fileData = {
                type: 'WiggyEngine Project',
                version: '1.0.0',
                compression: 'WiggyLZ77+Huffman',
                data: compressed
            };
            
            const finalData = new Uint8Array(new TextEncoder().encode(JSON.stringify(fileData)));
            const dataBlob = new Blob([finalData], { type: 'application/octet-stream' });
            
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${this.currentProject.name}.wigp`;
            link.click();
            
            URL.revokeObjectURL(url);
            console.log(`Project '${this.currentProject.name}' saved with ${compressed.ratio}:1 compression`);
            
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
        if (document.getElementById('project-selection-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'project-selection-styles';
        styles.textContent = `
            #project-selection {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, #2c3e50, #34495e);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            }
            
            .project-selection-container {
                max-width: 800px;
                width: 90%;
                text-align: center;
            }
            
            .project-header h1 {
                font-size: 3em;
                margin: 0;
                color: #ecf0f1;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
            }
            
            .project-header p {
                font-size: 1.2em;
                margin: 10px 0 40px 0;
                color: #bdc3c7;
            }
            
            .project-actions {
                display: flex;
                gap: 30px;
                justify-content: center;
                margin-bottom: 50px;
                flex-wrap: wrap;
            }
            
            .action-card {
                background: rgba(255,255,255,0.1);
                padding: 30px;
                border-radius: 15px;
                min-width: 200px;
                cursor: pointer;
                transition: all 0.3s ease;
                border: 2px solid transparent;
            }
            
            .action-card:hover {
                background: rgba(255,255,255,0.2);
                border-color: #3498db;
                transform: translateY(-5px);
            }
            
            .action-icon {
                font-size: 3em;
                margin-bottom: 15px;
            }
            
            .action-card h3 {
                margin: 0 0 10px 0;
                color: #ecf0f1;
            }
            
            .action-card p {
                margin: 0;
                color: #bdc3c7;
                font-size: 0.9em;
            }
            
            .recent-projects {
                background: rgba(0,0,0,0.2);
                padding: 30px;
                border-radius: 15px;
                margin-bottom: 30px;
            }
            
            .recent-projects h3 {
                margin-top: 0;
                color: #ecf0f1;
            }
            
            .recent-project-item {
                background: rgba(255,255,255,0.1);
                padding: 15px;
                margin: 10px 0;
                border-radius: 8px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: pointer;
                transition: background 0.2s ease;
            }
            
            .recent-project-item:hover {
                background: rgba(255,255,255,0.2);
            }
            
            .project-info {
                text-align: left;
                flex: 1;
            }
            
            .project-info h4 {
                margin: 0 0 5px 0;
                color: #ecf0f1;
            }
            
            .project-info p, .project-info small {
                margin: 0;
                color: #bdc3c7;
                font-size: 0.9em;
            }
            
            .project-actions button {
                background: #e74c3c;
                color: white;
                border: none;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 16px;
            }
            
            .project-actions button:hover {
                background: #c0392b;
            }
            
            .no-projects {
                color: #7f8c8d;
                font-style: italic;
            }
            
            .project-footer {
                margin-top: 30px;
                color: #7f8c8d;
                font-size: 0.9em;
            }
            
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10001;
            }
            
            .modal-content {
                background: #34495e;
                padding: 30px;
                border-radius: 15px;
                min-width: 400px;
                color: white;
            }
            
            .modal-content h3 {
                margin-top: 0;
                color: #ecf0f1;
            }
            
            .form-group {
                margin: 20px 0;
            }
            
            .form-group label {
                display: block;
                margin-bottom: 8px;
                color: #bdc3c7;
            }
            
            .form-group input, .form-group select {
                width: 100%;
                padding: 10px;
                border: 1px solid #7f8c8d;
                border-radius: 5px;
                background: #2c3e50;
                color: white;
                font-size: 14px;
                box-sizing: border-box;
            }
            
            .form-group small {
                color: #95a5a6;
                font-size: 12px;
                margin-top: 5px;
                display: block;
            }
            
            .modal-buttons {
                margin-top: 30px;
                text-align: right;
            }
            
            .modal-buttons button {
                padding: 10px 20px;
                margin-left: 10px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
            }
            
            .modal-buttons button:not(.primary) {
                background: #7f8c8d;
                color: white;
            }
            
            .modal-buttons button.primary {
                background: #3498db;
                color: white;
            }
            
            .modal-buttons button:hover:not(.primary) {
                background: #95a5a6;
            }
            
            .modal-buttons button.primary:hover {
                background: #2980b9;
            }
        `;
        document.head.appendChild(styles);
    }
    
    // Generate unique ID
    static generateId() {
        return 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }
}