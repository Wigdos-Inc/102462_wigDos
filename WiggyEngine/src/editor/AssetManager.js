class AssetManager {
    static initialized = false;
    static contextMenu = null;

    static initialize() {
        if (!this.initialized) {
            this.bindBrowserEvents();
            this.initialized = true;

            window.materialEditor = new MaterialEditor(this);
            materialEditor.initialize();
        }

        this.refreshAssetBrowser();
    }

    static getProject() {
        return typeof EditorUI !== 'undefined' ? EditorUI.currentProject : null;
    }

    static ensureAssets() {
        const project = this.getProject();
        if (!project) return [];

        if (!Array.isArray(project.assets)) {
            project.assets = [];
        }

        return project.assets;
    }

    static getAssets() {
        return this.ensureAssets();
    }

    static getAssetsByType(type) {
        return this.getAssets().filter(asset => asset.type === type);
    }

    static getScriptAssets() {
        return this.getAssetsByType('script');
    }

    static getMaterialAssets() {
        return this.getAssetsByType('material');
    }

    static getAssetById(assetId) {
        return this.getAssets().find(asset => asset.id === assetId) || null;
    }

    static bindBrowserEvents() {
        const browser = document.getElementById('asset-browser');
        const grid = document.getElementById('asset-grid');

        // if (browser) {
        //     browser.addEventListener('contextmenu', (event) => {
        //         event.preventDefault();
        //         this.showRootMenu(event.clientX, event.clientY);
        //     });
        // }

        if (grid) {
            grid.addEventListener('contextmenu', (event) => {
                event.preventDefault();
                const item = event.target.closest('[data-asset-id]');
                if (item) {
                    this.showAssetMenu(item.dataset.assetId, event.clientX, event.clientY);
                } else {
                    this.showRootMenu(event.clientX, event.clientY);
                }
            });
        }

        document.addEventListener('click', () => this.hideMenu());
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') this.hideMenu();
        });
    }

    static ensureMenu() {
        if (this.contextMenu) return;
        const menu = document.createElement('div');
        menu.id = 'asset-context-menu';
        menu.className = 'asset-context-menu hidden';
        document.body.appendChild(menu);
        this.contextMenu = menu;
    }

    static hideMenu() {
        if (this.contextMenu) {
            this.contextMenu.classList.add('hidden');
            this.contextMenu.innerHTML = '';
        }
    }

    static showRootMenu(x, y) {
        const selectedObject = typeof GameObjectManager !== 'undefined' ? GameObjectManager.selectedGameObject : null;
        const actions = [
            { label: 'Import Texture', action: () => this.importAssets('texture') },
            { label: 'Import Material', action: () => this.importAssets('material') },
            { label: 'Import Audio', action: () => this.importAssets('audio') },
            //{ label: 'Import Model', action: () => this.importAssets('model') },
            //{ label: 'Import Object', action: () => this.importAssets('object') },
            //{ label: 'Import Script (.wigscripts)', action: () => this.importAssets('script') },
            { label: 'New Material', action: () => this.createMaterial() },
            { label: 'New Script', action: () => this.createNewScriptAsset() }
        ];

        if (selectedObject) {
            actions.push({
                label: `Blueprint from "${selectedObject.name}"`,
                action: () => this.createBlueprintFromObject(selectedObject)
            });
        }

        this.renderMenu(x, y, actions);
    }

    static showAssetMenu(assetId, x, y) {
        const asset = this.getAssetById(assetId);
        if (!asset) return this.showRootMenu(x, y);

        const actions = [];
        if (asset.type === 'script') {
            actions.push({ label: 'Open Script', action: () => this.openAsset(asset) });
        }

        if (asset.type === 'object') {
            actions.push({ label: 'Instantiate', action: () => this.instantiateObjectAsset(asset) });
        }

        actions.push({ label: 'Rename', action: () => this.renameAsset(asset.id) });
        actions.push({ label: 'Delete', action: () => this.deleteAsset(asset.id) });

        this.renderMenu(x, y, actions);
    }

    static renderMenu(x, y, actions) {
        this.ensureMenu();
        this.contextMenu.innerHTML = '';

        actions.forEach(entry => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'asset-context-item';
            button.textContent = entry.label;
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                this.hideMenu();
                entry.action();
            });
            this.contextMenu.appendChild(button);
        });

        const width = 240;
        const height = actions.length * 38 + 16;
        const left = Math.min(x, Math.max(8, window.innerWidth - width - 8));
        const top = Math.min(y, Math.max(100, window.innerHeight - height - 100));

        this.contextMenu.style.left = `${left}px`;
        this.contextMenu.style.top = `${top}px`;
        this.contextMenu.classList.remove('hidden');
    }

    static refreshAssetBrowser() {
        const grid = document.getElementById('asset-grid');
        if (!grid) return;

        const assets = this.getAssets();
        if (assets.length === 0) {
            grid.innerHTML = '<div class="asset-empty-state">Rechtsklik om assets toe te voegen</div>';
            return;
        }

        grid.innerHTML = '';
        
        for (const asset of assets) {
            let out = '';

            if (asset.type == 'texture') {
                out += `<div class="asset-item asset-item-${asset.type}" data-asset-id="${asset.id}" style="background-image: url('${asset.dataUrl}'); background-size: contain; background-position: center; background-repeat: no-repeat;">
                        <div style="height: 90px"></div>
                        <div class="asset-name">${this.escapeHtml(asset.name || 'Untitled')}</div>`;
            }
            else {
                out += `<div class="asset-item asset-item-${asset.type}" data-asset-id="${asset.id}" style="background-image: url('${this.getAssetIcon(asset.type)}'); background-size: contain; background-position: center; background-repeat: no-repeat;">
                        <div style="height: 90px"></div>
                        <div class="asset-name">${this.escapeHtml(asset.name || 'Untitled')}</div>
                        <div class="asset-type">${this.escapeHtml(asset.type || 'asset')}</div>`
            }

            out += `</div>`;
            grid.innerHTML += out;
        }

        grid.querySelectorAll('[data-asset-id]').forEach(item => {
            const assetId = item.dataset.assetId;
            item.addEventListener('click', () => this.openAsset(assetId));
            item.addEventListener('contextmenu', (event) => {
                event.preventDefault();
                this.showAssetMenu(assetId, event.clientX, event.clientY);
            });
        });
    }

    static getAssetIcon(type) {
        switch (type) {
            case 'material': return 'images/iconMaterial.png';
            case 'model': return 'images/iconModel.png';
            case 'object': return 'images/iconObject.png';
            case 'script': return 'images/iconScript.png';
            case 'audio': return 'images/iconAudio.png';
            default: return 'images/iconFile.png';
        }
    }

    static escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    static getAcceptString(type) {
        switch (type) {
            case 'texture': return '.png,.jpg,.jpeg,.webp,.gif';
            case 'material': return '.json,.material,.mat,.wmat';
            case 'model': return '.obj,.gltf,.glb,.dae,.fbx';
            case 'object': return '.json,.wigobject,.wigo,.blueprint';
            case 'script': return '.wigscripts,.wigscript,.txt,.c,.cpp,.h';
            case 'audio': return '.mp3';
            default: return '*/*';
        }
    }

    static async importAssets(type) {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = this.getAcceptString(type);
        input.onchange = async (event) => {
            const files = Array.from(event.target.files || []);
            for (const file of files) {
                await this.importSingleAsset(type, file);
            }

            this.refreshAssetBrowser();
            if (typeof EditorUI !== 'undefined') {
                EditorUI.showNotification(`${files.length} asset(s) imported`, 'success');
            }
        };
        input.click();
    }

    static async importSingleAsset(type, file) {
        const asset = {
            id: this.generateId(),
            type,
            name: this.getFileBaseName(file.name),
            fileName: file.name,
            extension: this.getFileExtension(file.name),
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString()
        };

        if (type === 'texture') {
            asset.dataUrl = await this.readFileAsDataUrl(file);
        }
        else if (type === 'model') {
            if (this.isTextModel(file.name)) {
                asset.content = await this.readFileAsText(file);
            } else {
                asset.dataUrl = await this.readFileAsDataUrl(file);
            }

        }
        else if (type === 'material') {
            const text = await this.readFileAsText(file);
            try {
                asset.content = JSON.parse(text);
                asset.isJson = true;
            } catch {
                asset.content = text;
                asset.isJson = false;
            }

        }
        else if (type === 'object') {
            const text = await this.readFileAsText(file);
            try {
                asset.content = JSON.parse(text);
                asset.isBlueprint = true;
            } catch {
                asset.content = { raw: text };
                asset.isBlueprint = false;
            }

        }
        else if (type === 'script') {
            asset.extension = '.wigscripts';
            asset.language = 'wigscripts';
            asset.content = await this.readFileAsText(file);
        }
        else if (type === 'audio') {
            asset.content = await file.arrayBuffer();
        }
        else {
            asset.content = await this.readFileAsText(file);
        }

        this.saveAsset(asset);
    }

    static isTextModel(fileName) {
        const ext = this.getFileExtension(fileName);
        return ext === '.obj' || ext === '.gltf' || ext === '.dae';
    }

    static getFileBaseName(fileName) {
        return fileName.replace(/\.[^.]+$/, '');
    }

    static getFileExtension(fileName) {
        const match = fileName.match(/(\.[^.]+)$/);
        return match ? match[1].toLowerCase() : '';
    }

    static readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
    }

    static readFileAsDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }

    static createScriptAsset(name, content) {
        const asset = {
            id: this.generateId(),
            type: 'script',
            name,
            fileName: `${name}.wigscripts`,
            extension: '.wigscripts',
            language: 'wigscripts',
            content,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString()
        };

        this.saveAsset(asset);
        return asset;
    }

    static createNewScriptAsset() {
        if (typeof ScriptEditor !== 'undefined') {
            ScriptEditor.newScript();
        }
    }

    static createMaterial() {
        materialEditor.createNew();
    }

    static createBlueprintFromObject(gameObject) {
        if (!gameObject) return null;

        const asset = {
            id: this.generateId(),
            type: 'object',
            name: `${gameObject.name}_Blueprint`,
            fileName: `${gameObject.name}_Blueprint.wigobject`,
            extension: '.wigobject',
            content: JSON.parse(JSON.stringify(gameObject)),
            source: 'scene-object',
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString()
        };

        this.saveAsset(asset);
        if (typeof EditorUI !== 'undefined') {
            EditorUI.showNotification(`Blueprint '${asset.name}' created`, 'success');
        }

        return asset;
    }

    static instantiateObjectAsset(asset) {
        if (!asset || asset.type !== 'object') return null;

        const project = this.getProject();
        const scene = project?.scenes?.[0];
        if (!scene) return null;

        const template = asset.content?.data || asset.content || asset;
        const gameObject = JSON.parse(JSON.stringify(template));
        gameObject.id = this.generateId();
        gameObject.name = this.getUniqueInstanceName(gameObject.name || asset.name || 'Object', scene.gameObjects || []);
        gameObject.transform = gameObject.transform || {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 }
        };
        gameObject.components = Array.isArray(gameObject.components) ? gameObject.components : [];

        scene.gameObjects.push(gameObject);
        if (typeof EditorUI !== 'undefined') {
            EditorUI.refreshHierarchy();
            EditorUI.refreshAssetBrowser();
            EditorUI.showNotification(`Object '${asset.name}' instantiated`, 'success');
        }

        return gameObject;
    }

    static getUniqueInstanceName(baseName, existingObjects) {
        const existing = new Set(existingObjects.map(object => object.name));
        let name = baseName;
        let index = 1;
        while (existing.has(name)) {
            name = `${baseName}_${index++}`;
        }
        return name;
    }

    static assignScriptToGameObject(gameObject, scriptAsset) {
        if (!gameObject || !scriptAsset) return;

        const scriptComponent = {
            id: this.generateId(),
            type: 'Script',
            name: scriptAsset.name,
            enabled: true,
            scriptAssetId: scriptAsset.id,
            scriptName: scriptAsset.name,
            code: scriptAsset.content || '',
            language: 'wigscripts'
        };

        if (!Array.isArray(gameObject.components)) {
            gameObject.components = [];
        }

        const existingIndex = gameObject.components.findIndex(component => String(component.type).toLowerCase() === 'script');
        if (existingIndex !== -1) {
            gameObject.components[existingIndex] = scriptComponent;
        } else {
            gameObject.components.push(scriptComponent);
        }

        if (typeof EditorUI !== 'undefined') {
            EditorUI.refreshInspector();
            EditorUI.showNotification(`Script '${scriptAsset.name}' assigned`, 'success');
        }
    }

    static saveAsset(asset) {
        const assets = this.ensureAssets();
        const index = assets.findIndex(existing => existing.id === asset.id);
        const savedAsset = {
            ...asset,
            modifiedAt: new Date().toISOString()
        };

        if (index === -1) {
            assets.push(savedAsset);
        } else {
            assets[index] = savedAsset;
        }

        this.refreshAssetBrowser();
        return savedAsset;
    }

    static deleteAsset(assetId) {
        const assets = this.ensureAssets();
        const index = assets.findIndex(asset => asset.id === assetId);
        if (index === -1) return;

        const [removed] = assets.splice(index, 1);
        this.refreshAssetBrowser();

        if (typeof EditorUI !== 'undefined') {
            EditorUI.showNotification(`Asset '${removed.name}' deleted`, 'info');
        }
    }

    static renameAsset(assetId) {
        if (!assetId) return;

        const asset = this.getAssetById(assetId);
        console.log(asset);

        const newName = prompt("Enter a new name:", asset.fileName);

        if (newName !== null && newName.trim() !== "") {
            console.log("Renamed to:", newName.trim());
            asset.fileName = newName.trim();
            asset.name = newName.trim();
        } else {
            console.log("Rename cancelled");
        }

        this.refreshAssetBrowser();
    }

    static openAsset(asset_id) {
        if (!asset_id) return;

        const asset = this.getAssetById(asset_id);
        console.log(asset);

        if (asset.type === 'script' && typeof ScriptEditor !== 'undefined') {
            ScriptEditor.editScript(asset);
            return;
        }

        if (asset.type === 'object') {
            this.instantiateObjectAsset(asset);
            return;
        }

        if (asset.type === 'material') {
            materialEditor.edit(asset);
            return;
        }

        if (asset.type === 'audio') {
            const blob = new Blob([asset.content], { type: "audio/mpeg" });
            const url = URL.createObjectURL(blob);

            const audio = new Audio(url);
            audio.play();
        }

        if (typeof EditorUI !== 'undefined') {
            EditorUI.showNotification(`Selected asset: ${asset.name}`, 'info');
        }
    }

    static generateId() {
        return 'asset_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now();
    }
}

window.AssetManager = AssetManager;
