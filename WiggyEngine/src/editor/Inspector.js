/**
 * Inspector Panel - Shows and edits properties of selected GameObjects
 */
class Inspector {
    static currentObject = null;

    // Show GameObject properties in inspector
    static showGameObject(gameObject) {
        this.currentObject = gameObject;
        const container = document.getElementById('inspector-content');
        
        if (!container || !gameObject) {
            this.clear();
            return;
        }

        container.innerHTML = '';

        // GameObject name
        this.createNameSection(container, gameObject);
        
        // Transform component (always present)
        this.createTransformSection(container, gameObject);
        
        // Other components
        if (gameObject.components && gameObject.components.length > 0) {
            gameObject.components.forEach((component, index) => {
                this.createComponentSection(container, component, index);
            });
        }

        // Add component button
        this.createAddComponentButton(container);
    }

    // Create name editing section
    static createNameSection(container, gameObject) {
        const section = document.createElement('div');
        section.className = 'inspector-section';
        
        const header = document.createElement('div');
        header.className = 'inspector-header';
        header.innerHTML = '<span>GameObject</span>';
        
        const content = document.createElement('div');
        content.className = 'inspector-content';
        
        const nameRow = document.createElement('div');
        nameRow.className = 'property-row';
        
        const nameLabel = document.createElement('span');
        nameLabel.className = 'property-label';
        nameLabel.textContent = 'Naam';
        
        const nameInput = document.createElement('input');
        nameInput.className = 'property-input';
        nameInput.type = 'text';
        nameInput.value = gameObject.name;
        nameInput.addEventListener('change', (e) => {
            gameObject.name = GameObjectManager.getUniqueName(e.target.value);
            e.target.value = gameObject.name;
            GameObjectManager.refreshHierarchy();
        });
        
        nameRow.appendChild(nameLabel);
        nameRow.appendChild(nameInput);
        content.appendChild(nameRow);
        
        section.appendChild(header);
        section.appendChild(content);
        container.appendChild(section);
    }

    // Create transform component section
    static createTransformSection(container, gameObject) {
        const section = document.createElement('div');
        section.className = 'inspector-section';
        
        const header = document.createElement('div');
        header.className = 'inspector-header';
        header.innerHTML = '<span>Transform</span>';
        
        const content = document.createElement('div');
        content.className = 'inspector-content';
        
        // Position
        this.createVector3Property(content, 'Positie', gameObject.transform.position, (value) => {
            gameObject.transform.position = value;
            this.notifyTransformChanged(gameObject);
        });
        
        // Rotation
        this.createVector3Property(content, 'Rotatie', gameObject.transform.rotation, (value) => {
            gameObject.transform.rotation = value;
            this.notifyTransformChanged(gameObject);
        });
        
        // Scale
        this.createVector3Property(content, 'Schaal', gameObject.transform.scale, (value) => {
            gameObject.transform.scale = value;
            this.notifyTransformChanged(gameObject);
        });
        
        section.appendChild(header);
        section.appendChild(content);
        container.appendChild(section);
    }

    // Create component section
    static createComponentSection(container, component, index) {
        const section = document.createElement('div');
        section.className = 'inspector-section';
        
        const header = document.createElement('div');
        header.className = 'inspector-header';
        header.innerHTML = `
            <span>${component.type || 'Component'}</span>
            <button onclick="Inspector.removeComponent(${index})" style="background: #aa4444; border: none; color: white; padding: 2px 6px; border-radius: 3px; cursor: pointer;">✕</button>
        `;
        
        const content = document.createElement('div');
        content.className = 'inspector-content';
        
        // Component-specific properties
        this.createComponentProperties(content, component, index);
        
        section.appendChild(header);
        section.appendChild(content);
        container.appendChild(section);
    }

    // Create component-specific properties
    static createComponentProperties(container, component, index) {
        switch(component.type) {
            case 'MeshRenderer':
                this.createMeshRendererProperties(container, component, index);
                break;
            case 'Light':
                this.createLightProperties(container, component, index);
                break;
            case 'Camera':
                this.createCameraProperties(container, component, index);
                break;
            case 'BoxCollider':
                this.createBoxColliderProperties(container, component, index);
                break;
            case 'SphereCollider':
                this.createSphereColliderProperties(container, component, index);
                break;
              case 'Script':
              case 'script':
                  this.createScriptProperties(container, component, index);
                  break;
            default:
                this.createGenericProperties(container, component, index);
                break;
        }
    }

    // MeshRenderer component properties
    static createMeshRendererProperties(container, component, index) {
        // Mesh property
        this.createSelectProperty(container, 'Mesh', component.mesh || 'cube', 
            ['cube', 'sphere', 'plane', 'cylinder', 'custom'], (value) => {
            component.mesh = value;
            this.notifyComponentChanged(component, index);
        });

        // Material property
        this.createSelectProperty(container, 'Material', component.material || 'default',
            ['default', 'unlit', 'standard', 'custom'], (value) => {
            component.material = value;
            this.notifyComponentChanged(component, index);
        });

          if (typeof AssetManager !== 'undefined') {
              const modelAssets = AssetManager.getAssetsByType('model');
              const materialAssets = AssetManager.getAssetsByType('material');

              this.createAssetSelectProperty(container, 'Model Asset', component.modelAssetId || '', modelAssets, 'Builtin mesh', (asset) => {
                  component.modelAssetId = asset ? asset.id : '';
                  component.modelAssetName = asset ? asset.name : '';
                  this.notifyComponentChanged(component, index);
              });

              this.createAssetSelectProperty(container, 'Material Asset', component.materialAssetId || '', materialAssets, 'Builtin material', (asset) => {
                  component.materialAssetId = asset ? asset.id : '';
                  component.materialAssetName = asset ? asset.name : '';
                  if (asset && asset.content && typeof asset.content === 'object') {
                      component.materialDefinition = asset.content;
                  }
                  this.notifyComponentChanged(component, index);
              });
          }
    }

    // Light component properties
    static createLightProperties(container, component, index) {
        // Light type
        this.createSelectProperty(container, 'Type', component.lightType || 'directional',
            ['directional', 'point', 'spot'], (value) => {
            component.lightType = value;
            this.notifyComponentChanged(component, index);
        });

        // Color
        this.createColorProperty(container, 'Kleur', component.color || {r: 1, g: 1, b: 1, a: 1}, (value) => {
            component.color = value;
            this.notifyComponentChanged(component, index);
        });

        // Intensity
        this.createNumberProperty(container, 'Intensiteit', component.intensity || 1.0, 0, 10, 0.1, (value) => {
            component.intensity = value;
            this.notifyComponentChanged(component, index);
        });

        // Range (for point and spot lights)
        if (component.lightType === 'point' || component.lightType === 'spot') {
            this.createNumberProperty(container, 'Bereik', component.range || 10, 0.1, 100, 0.1, (value) => {
                component.range = value;
                this.notifyComponentChanged(component, index);
            });
        }

        // Spot angle (for spot lights)
        if (component.lightType === 'spot') {
            this.createNumberProperty(container, 'Spot Hoek', component.spotAngle || 30, 1, 180, 1, (value) => {
                component.spotAngle = value;
                this.notifyComponentChanged(component, index);
            });
        }
    }

    // Camera component properties
    static createCameraProperties(container, component, index) {
        // Field of view
        this.createNumberProperty(container, 'Gezichtsveld', component.fieldOfView || 75, 10, 180, 1, (value) => {
            component.fieldOfView = value;
            this.notifyComponentChanged(component, index);
        });

        // Near clip plane
        this.createNumberProperty(container, 'Nabij Vlak', component.nearClipPlane || 0.1, 0.01, 10, 0.01, (value) => {
            component.nearClipPlane = value;
            this.notifyComponentChanged(component, index);
        });

        // Far clip plane
        this.createNumberProperty(container, 'Ver Vlak', component.farClipPlane || 1000, 10, 10000, 10, (value) => {
            component.farClipPlane = value;
            this.notifyComponentChanged(component, index);
        });

        // Clear color
        this.createColorProperty(container, 'Achtergrond', component.clearColor || {r: 0.2, g: 0.3, b: 0.4, a: 1}, (value) => {
            component.clearColor = value;
            this.notifyComponentChanged(component, index);
        });
    }

    // BoxCollider component properties
    static createBoxColliderProperties(container, component, index) {
        this.createVector3Property(container, 'Grootte', component.size || {x: 1, y: 1, z: 1}, (value) => {
            component.size = value;
            this.notifyComponentChanged(component, index);
        });
    }

    // SphereCollider component properties
    static createSphereColliderProperties(container, component, index) {
        this.createNumberProperty(container, 'Straal', component.radius || 0.5, 0.01, 10, 0.01, (value) => {
            component.radius = value;
            this.notifyComponentChanged(component, index);
        });
    }

      static createScriptProperties(container, component, index) {
          if (typeof AssetManager !== 'undefined') {
              const scriptAssets = AssetManager.getScriptAssets();

              this.createAssetSelectProperty(container, 'Script Asset', component.scriptAssetId || '', scriptAssets, 'None', (asset) => {
                  component.scriptAssetId = asset ? asset.id : '';
                  component.scriptName = asset ? asset.name : '';
                  component.code = asset ? (asset.content || '') : '';
                  this.notifyComponentChanged(component, index);
              });
          }

          this.createBooleanProperty(container, 'Enabled', component.enabled !== false, (value) => {
              component.enabled = value;
              this.notifyComponentChanged(component, index);
          });
      }

    // Generic properties for unknown components
    static createGenericProperties(container, component, index) {
        const keys = Object.keys(component).filter(key => key !== 'type');
        keys.forEach(key => {
            const value = component[key];
            if (typeof value === 'number') {
                this.createNumberProperty(container, key, value, -1000, 1000, 0.1, (newValue) => {
                    component[key] = newValue;
                    this.notifyComponentChanged(component, index);
                });
            } else if (typeof value === 'string') {
                this.createTextProperty(container, key, value, (newValue) => {
                    component[key] = newValue;
                    this.notifyComponentChanged(component, index);
                });
            } else if (typeof value === 'boolean') {
                this.createBooleanProperty(container, key, value, (newValue) => {
                    component[key] = newValue;
                    this.notifyComponentChanged(component, index);
                });
            }
        });
    }

    // Property creation helpers
    static createVector3Property(container, label, value, onChange) {
        const row = document.createElement('div');
        row.className = 'property-row';
        row.style.flexDirection = 'column';
        
        const labelElement = document.createElement('span');
        labelElement.className = 'property-label';
        labelElement.textContent = label;
        
        const inputContainer = document.createElement('div');
        inputContainer.style.display = 'flex';
        inputContainer.style.gap = '4px';
        
        ['x', 'y', 'z'].forEach(axis => {
            const input = document.createElement('input');
            input.className = 'property-input';
            input.type = 'number';
            input.step = '0.01';
            input.value = value[axis] || 0;
            input.placeholder = axis.toUpperCase();
            input.style.flex = '1';
            
            input.addEventListener('change', (e) => {
                value[axis] = parseFloat(e.target.value) || 0;
                onChange(value);
            });
            
            inputContainer.appendChild(input);
        });
        
        row.appendChild(labelElement);
        row.appendChild(inputContainer);
        container.appendChild(row);
    }

    static createNumberProperty(container, label, value, min, max, step, onChange) {
        const row = document.createElement('div');
        row.className = 'property-row';
        
        const labelElement = document.createElement('span');
        labelElement.className = 'property-label';
        labelElement.textContent = label;
        
        const input = document.createElement('input');
        input.className = 'property-input';
        input.type = 'number';
        input.value = value;
        input.min = min;
        input.max = max;
        input.step = step;
        
        input.addEventListener('change', (e) => {
            onChange(parseFloat(e.target.value) || 0);
        });
        
        row.appendChild(labelElement);
        row.appendChild(input);
        container.appendChild(row);
    }

    static createTextProperty(container, label, value, onChange) {
        const row = document.createElement('div');
        row.className = 'property-row';
        
        const labelElement = document.createElement('span');
        labelElement.className = 'property-label';
        labelElement.textContent = label;
        
        const input = document.createElement('input');
        input.className = 'property-input';
        input.type = 'text';
        input.value = value;
        
        input.addEventListener('change', (e) => {
            onChange(e.target.value);
        });
        
        row.appendChild(labelElement);
        row.appendChild(input);
        container.appendChild(row);
    }

    static createBooleanProperty(container, label, value, onChange) {
        const row = document.createElement('div');
        row.className = 'property-row';
        
        const labelElement = document.createElement('span');
        labelElement.className = 'property-label';
        labelElement.textContent = label;
        
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = value;
        
        input.addEventListener('change', (e) => {
            onChange(e.target.checked);
        });
        
        row.appendChild(labelElement);
        row.appendChild(input);
        container.appendChild(row);
    }

    static createSelectProperty(container, label, value, options, onChange) {
        const row = document.createElement('div');
        row.className = 'property-row';
        
        const labelElement = document.createElement('span');
        labelElement.className = 'property-label';
        labelElement.textContent = label;
        
        const select = document.createElement('select');
        select.className = 'property-input';
        
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            optionElement.selected = option === value;
            select.appendChild(optionElement);
        });
        
        select.addEventListener('change', (e) => {
            onChange(e.target.value);
        });
        
        row.appendChild(labelElement);
        row.appendChild(select);
        container.appendChild(row);
    }

      static createAssetSelectProperty(container, label, assetId, assets, emptyLabel, onChange) {
          const row = document.createElement('div');
          row.className = 'property-row';

          const labelElement = document.createElement('span');
          labelElement.className = 'property-label';
          labelElement.textContent = label;

          const select = document.createElement('select');
          select.className = 'property-input';

          const emptyOption = document.createElement('option');
          emptyOption.value = '';
          emptyOption.textContent = emptyLabel;
          emptyOption.selected = !assetId;
          select.appendChild(emptyOption);

          assets.forEach(asset => {
              const option = document.createElement('option');
              option.value = asset.id;
              option.textContent = asset.name;
              option.selected = asset.id === assetId;
              select.appendChild(option);
          });

          select.addEventListener('change', (event) => {
              const selectedAsset = assets.find(asset => asset.id === event.target.value) || null;
              onChange(selectedAsset);
          });

          row.appendChild(labelElement);
          row.appendChild(select);
          container.appendChild(row);
      }

    static createColorProperty(container, label, value, onChange) {
        const row = document.createElement('div');
        row.className = 'property-row';
        
        const labelElement = document.createElement('span');
        labelElement.className = 'property-label';
        labelElement.textContent = label;
        
        const colorContainer = document.createElement('div');
        colorContainer.style.display = 'flex';
        colorContainer.style.gap = '4px';
        
        // Color picker
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = this.rgbToHex(value.r, value.g, value.b);
        colorInput.style.width = '40px';
        colorInput.style.height = '30px';
        colorInput.style.border = 'none';
        colorInput.style.borderRadius = '4px';
        
        colorInput.addEventListener('change', (e) => {
            const color = this.hexToRgb(e.target.value);
            value.r = color.r;
            value.g = color.g;
            value.b = color.b;
            onChange(value);
        });
        
        // Alpha input
        const alphaInput = document.createElement('input');
        alphaInput.className = 'property-input';
        alphaInput.type = 'number';
        alphaInput.min = '0';
        alphaInput.max = '1';
        alphaInput.step = '0.01';
        alphaInput.value = value.a || 1;
        alphaInput.placeholder = 'Alpha';
        alphaInput.style.flex = '1';
        
        alphaInput.addEventListener('change', (e) => {
            value.a = parseFloat(e.target.value) || 0;
            onChange(value);
        });
        
        colorContainer.appendChild(colorInput);
        colorContainer.appendChild(alphaInput);
        
        row.appendChild(labelElement);
        row.appendChild(colorContainer);
        container.appendChild(row);
    }

    // Add component button
    static createAddComponentButton(container) {
        const button = document.createElement('button');
        button.textContent = '+ Component Toevoegen';
        button.style.cssText = `
            width: 100%;
            padding: 8px;
            background: #0078d4;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 10px;
        `;
        
        button.addEventListener('click', () => {
            this.showAddComponentMenu();
        });
        
        container.appendChild(button);
    }

    // Show add component menu
    static showAddComponentMenu() {
        const components = [
            'MeshRenderer',
            'Light',
            'Camera',
            'BoxCollider',
            'SphereCollider',
            'Rigidbody',
            'AudioSource',
            'Script'
        ];

        const menu = document.createElement('div');
        menu.style.cssText = `
            position: fixed;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            background: #333;
            border: 1px solid #555;
            border-radius: 8px;
            padding: 20px;
            z-index: 1001;
            max-width: 300px;
        `;

        const title = document.createElement('h3');
        title.textContent = 'Component Toevoegen';
        title.style.margin = '0 0 15px 0';
        menu.appendChild(title);

        components.forEach(componentType => {
            const button = document.createElement('button');
            button.textContent = componentType;
            button.style.cssText = `
                display: block;
                width: 100%;
                padding: 8px;
                margin: 4px 0;
                background: #404040;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                text-align: left;
            `;
            
            button.addEventListener('mouseenter', () => {
                button.style.backgroundColor = '#505050';
            });
            
            button.addEventListener('mouseleave', () => {
                button.style.backgroundColor = '#404040';
            });
            
            button.addEventListener('click', () => {
                this.addComponent(componentType);
                document.body.removeChild(overlay);
            });
            
            menu.appendChild(button);
        });

        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1000;
        `;
        
        overlay.addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
        
        overlay.appendChild(menu);
        document.body.appendChild(overlay);
    }

    // Add component to current object
    static addComponent(componentType) {
        if (!this.currentObject) return;

        const component = this.createDefaultComponent(componentType);
        
        if (!this.currentObject.components) {
            this.currentObject.components = [];
        }
        
        this.currentObject.components.push(component);
        this.showGameObject(this.currentObject);
        
        EditorUI.showNotification(`Component "${componentType}" toegevoegd`, 'success');
    }

    // Remove component
    static removeComponent(index) {
        if (!this.currentObject || !this.currentObject.components) return;

        if (confirm('Weet je zeker dat je dit component wilt verwijderen?')) {
            this.currentObject.components.splice(index, 1);
            this.showGameObject(this.currentObject);
            EditorUI.showNotification('Component verwijderd', 'info');
        }
    }

    // Create default component
    static createDefaultComponent(type) {
        switch(type) {
            case 'MeshRenderer':
                return { type: 'MeshRenderer', mesh: 'cube', material: 'default' };
            case 'Light':
                return { 
                    type: 'Light', 
                    lightType: 'directional', 
                    color: { r: 1, g: 1, b: 1, a: 1 }, 
                    intensity: 1.0 
                };
            case 'Camera':
                return {
                    type: 'Camera',
                    fieldOfView: 75,
                    nearClipPlane: 0.1,
                    farClipPlane: 1000,
                    clearColor: { r: 0.2, g: 0.3, b: 0.4, a: 1 }
                };
            case 'BoxCollider':
                return { type: 'BoxCollider', size: { x: 1, y: 1, z: 1 } };
            case 'SphereCollider':
                return { type: 'SphereCollider', radius: 0.5 };
            case 'Rigidbody':
                return { type: 'Rigidbody', mass: 1, useGravity: true };
            case 'AudioSource':
                return { type: 'AudioSource', clip: null, volume: 1, pitch: 1, loop: false };
            case 'Script':
                return { type: 'Script', scriptName: '', enabled: true };
            default:
                return { type: type };
        }
    }

    // Notification methods
    static notifyTransformChanged(gameObject) {
        if (WiggyEngine.renderer) {
            WiggyEngine.renderer.updateGameObject(gameObject);
        }
    }

    static notifyComponentChanged(component, index) {
        if (WiggyEngine.renderer) {
            WiggyEngine.renderer.updateComponent(this.currentObject, component, index);
        }
    }

    // Utility methods
    static rgbToHex(r, g, b) {
        const toHex = (c) => {
            const hex = Math.round(c * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        return '#' + toHex(r) + toHex(g) + toHex(b);
    }

    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16) / 255,
            g: parseInt(result[2], 16) / 255,
            b: parseInt(result[3], 16) / 255
        } : { r: 0, g: 0, b: 0 };
    }

    // Clear inspector
    static clear() {
        const container = document.getElementById('inspector-content');
        if (container) {
            container.innerHTML = '<p>Selecteer een object om eigenschappen te bekijken</p>';
        }
        this.currentObject = null;
    }

    // Refresh inspector
    static refresh() {
        if (this.currentObject) {
            this.showGameObject(this.currentObject);
        }
    }
}