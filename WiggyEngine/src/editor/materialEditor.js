class MaterialEditor {
    constructor(assetManager) {
        this.assetManager = assetManager;
        this.currentMaterial = null;
    }

    initialize() {
        this.modal = document.getElementById('material-editor-modal');
        this.texSelect = document.getElementById('material-editor-texture-selector');

        console.log("Material Editor is initialized.");
    }

    createNew() {
        const asset = {
            id: this.assetManager.generateId(),
            type: 'material',
            name: `New Material`,
            fileName: 'New Material',
            extension: '.mat',
            content: {baseColor: [1,1,1], twoSided: false, diffuseTexture: '', normalTexture: ''},
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString()
        };

        this.assetManager.saveAsset(asset);
    }

    save() {
        if (this.assetManager.getAssetById(this.texSelect.value)) {
            this.currentMaterial.content.diffuseTexture = this.assetManager.getAssetById(this.texSelect.value).id;
        }

        this.assetManager.saveAsset(this.currentMaterial);
    }

    edit(asset) {
        //this.assetManager.getAssetsByType('texture')[0].dataUrl
        this.currentMaterial = asset;
        this.openEditor(asset);
    }

    openEditor(asset) {
        console.log();
        this.texSelect.innerHTML = '';
        this.texSelect.innerHTML += '<option value="none">None</option>';

        const AllTextures = this.assetManager.getAssetsByType('texture');
        console.log(AllTextures)
        for(const tex of AllTextures) {
            this.texSelect.innerHTML += `<option value="${tex.id}">${tex.name}</option>`;
        }

        if (asset.content.diffuseTexture) {
            const diffuseTexture = this.assetManager.getAssetById(asset.content.diffuseTexture);
            this.texSelect.value = diffuseTexture.id;
        }

        this.modal.style.display = 'block';
    }

    closeEditor() {
        this.currentMaterial = null;
        this.modal.style.display = 'none';
    }
}
