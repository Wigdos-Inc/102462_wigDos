/**
 * GameObject Manager - Handles creation and management of GameObjects in the editor
 */
class GameObjectManager {
    static selectedGameObject = null;

    // Create a new GameObject
    static async createGameObject(type, name = 'GameObject', link) {
        if (!EditorUI.currentProject || !EditorUI.currentProject.scenes[0]) {
            EditorUI.showNotification('Geen actieve scene', 'warning');
            return;
        }

        const gameObject = {
            id: this.generateId(),
            name: this.getUniqueName(name),
            type: type,
            transform: {
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 }
            },
            components: [],
            children: [],
            parent: null
        };

        if (type == 'GLB') {
            gameObject.link = link;

            gameObject.lenMeshes = await EditorUI.sceneEditor.addGameObject(gameObject);
        } else {
            EditorUI.sceneEditor.addGameObject(gameObject);
        }

        // Add to current scene
        EditorUI.currentProject.scenes[0].gameObjects.push(gameObject);
        
        // Refresh the hierarchy
        this.refreshHierarchy();
        
        // Select the new object
        this.selectGameObject(gameObject);
        
        // Update 3D scene
        if (EditorUI.sceneEditor) {
            //EditorUI.loadSceneIntoEditor();
        }
        
        EditorUI.showNotification(`GameObject "${gameObject.name}" aangemaakt`, 'success');
        
        return gameObject;
    }

    // Create specific primitive objects
    static async createCube() {
        const cube = await this.createGameObject('Cube', 'Cube');
        cube.components.push({
            type: 'MeshRenderer',
            mesh: 'cube',
            material: 'default'
        });
        cube.components.push({
            type: 'BoxCollider',
            size: { x: 1, y: 1, z: 1 }
        });
        return cube;
    }

    static async createSphere() {
        const sphere = await this.createGameObject('Sphere', 'Sphere');
        sphere.components.push({
            type: 'MeshRenderer',
            mesh: 'sphere',
            material: 'default'
        });
        sphere.components.push({
            type: 'SphereCollider',
            radius: 0.5
        });
        return sphere;
    }

    static async createPlane() {
        const plane = await this.createGameObject('Plane', 'Plane');
        plane.components.push({
            type: 'MeshRenderer',
            mesh: 'plane',
            material: 'default'
        });
        return plane;
    }

    static createGLB() {
        const glb_input = document.createElement('div');
        glb_input.innerHTML = `
            <!--<input 
                type="url" 
                id="GLBlinkInput" 
                placeholder="Enter a link (https://...)" 
                required
                style="width: 300px; padding: 8px;"
            />-->

            <input type="file" id="GLBfileInput" accept=".glb">

            <button onclick="importGLB()">Import GLB</button>
        `;

        glb_input.style.cssText = `
            position: fixed;
            left: 0px;
            top: 0px;
            background: #333;
            border: 1px solid #555;
            border-radius: 4px;
            padding: 4px 0;
            z-index: 1000;
            min-width: 120px;
        `;

        document.body.appendChild(glb_input);

        window.importGLB = async () => {
            //let link = document.getElementById('GLBlinkInput').value;
            let link = '';
            const input = document.getElementById("GLBfileInput");
            document.body.removeChild(glb_input);

            let fileBytes = null;
            let fileType = '';

            if (link == '' || link == null) {
                const file = input.files[0];

                if (!file) {
                    alert("Please select a GLB file first.");
                    return;
                }

                const buffer = await file.arrayBuffer();
                fileBytes = Array.from(new Uint8Array(buffer));
                fileType = file.type;

                //const blob = new Blob([fileBytes], { type: fileType });

                const url = URL.createObjectURL(file);
                link = url;
            }

            const GLB = await this.createGameObject('GLB', 'GLB', link);

            GLB.components.push({
                type: 'MeshRenderer',
                mesh: 'GLB',
                material: 'default',
                lenMeshes: GLB.lenMeshes,
                glbfile: {type: fileType, bytes: fileBytes}
            });
            GLB.components.push({
                type: 'BoxCollider',
                size: { x: 1, y: 1, z: 1 }
            });

            return GLB;
        }
    }

    static async createLight() {
        const light = await this.createGameObject('Light', 'Light');
        light.components.push({
            type: 'Light',
            lightType: 'directional',
            color: { r: 1, g: 1, b: 1, a: 1 },
            intensity: 1.0
        });
        return light;
    }

    static async createCamera() {
        const camera = await this.createGameObject('Camera', 'Camera');
        camera.components.push({
            type: 'Camera',
            fieldOfView: 75,
            nearClipPlane: 0.1,
            farClipPlane: 1000,
            clearColor: { r: 0.2, g: 0.3, b: 0.4, a: 1 }
        });
        return camera;
    }

    // Delete GameObject
    static deleteGameObject(gameObject) {
        if (!gameObject || !EditorUI.currentProject) return;

        const scene = EditorUI.currentProject.scenes[0];
        const index = scene.gameObjects.findIndex(obj => obj.id === gameObject.id);
        
        if (index !== -1) {
            // Remove from parent if it has one
            if (gameObject.parent) {
                const parent = this.findGameObjectById(gameObject.parent);
                if (parent) {
                    const childIndex = parent.children.indexOf(gameObject.id);
                    if (childIndex !== -1) {
                        parent.children.splice(childIndex, 1);
                    }
                }
            }

            if (gameObject.children) {
                // Remove children references
                gameObject.children.forEach(childId => {
                    const child = this.findGameObjectById(childId);
                    if (child) {
                        child.parent = null;
                    }
                });
            }

            // Remove from scene
            scene.gameObjects.splice(index, 1);
            EditorUI.sceneEditor.removeGameObject(gameObject);

            // Clear selection if this object was selected
            if (this.selectedGameObject && this.selectedGameObject.id === gameObject.id) {
                this.selectedGameObject = null;
                Inspector.clear();
                if (EditorUI.sceneEditor) {
                    EditorUI.sceneEditor.selectGameObject(null);
                }
            }

            this.refreshHierarchy();
            
            // Update 3D scene
            if (EditorUI.sceneEditor) {
                //EditorUI.loadSceneIntoEditor();
            }
            
            EditorUI.showNotification(`GameObject "${gameObject.name}" verwijderd`, 'info');
        }
    }

    // Select GameObject
    static selectGameObject(gameObject) {
        // Clear previous selection
        document.querySelectorAll('.scene-object').forEach(el => {
            el.classList.remove('selected');
        });

        this.selectedGameObject = gameObject;

        // Update visual selection
        const element = document.querySelector(`[data-object-id="${gameObject.id}"]`);
        if (element) {
            element.classList.add('selected');
        }
        
        // Update 3D scene selection
        if (EditorUI.sceneEditor) {
            EditorUI.sceneEditor.selectGameObject(gameObject);
        }

        // Update inspector
        Inspector.showGameObject(gameObject);

        // Notify renderer for gizmo display
        if (WiggyEngine.renderer) {
            WiggyEngine.renderer.setSelectedObject(gameObject);
        }
    }

    // Hierarchy management
    static setParent(child, parent) {
        if (!child || child === parent) return;

        // Remove from old parent
        if (child.parent) {
            const oldParent = this.findGameObjectById(child.parent);
            if (oldParent) {
                const index = oldParent.children.indexOf(child.id);
                if (index !== -1) {
                    oldParent.children.splice(index, 1);
                }
            }
        }

        // Set new parent
        if (parent) {
            child.parent = parent.id;
            if (!parent.children.includes(child.id)) {
                parent.children.push(child.id);
            }
        } else {
            child.parent = null;
        }

        this.refreshHierarchy();
    }

    // Find GameObject by ID
    static findGameObjectById(id) {
        if (!EditorUI.currentProject || !EditorUI.currentProject.scenes[0]) return null;
        
        return EditorUI.currentProject.scenes[0].gameObjects.find(obj => obj.id === id);
    }

    // Get all GameObjects
    static getAllGameObjects() {
        if (!EditorUI.currentProject || !EditorUI.currentProject.scenes[0]) return [];
        
        return EditorUI.currentProject.scenes[0].gameObjects;
    }

    // Refresh hierarchy display
    static refreshHierarchy() {
        const hierarchyContainer = document.getElementById('scene-tree');
        if (!hierarchyContainer) return;

        hierarchyContainer.innerHTML = '';

        if (!EditorUI.currentProject || !EditorUI.currentProject.scenes[0]) {
            hierarchyContainer.innerHTML = '<p>Geen scene geladen</p>';
            return;
        }

        const gameObjects = EditorUI.currentProject.scenes[0].gameObjects;
        const rootObjects = gameObjects.filter(obj => !obj.parent);

        rootObjects.forEach(obj => {
            this.createHierarchyElement(obj, hierarchyContainer, 0);
        });

        // Add context menu
        this.setupContextMenu();
    }

    // Create hierarchy element
    static createHierarchyElement(gameObject, container, depth) {
        const element = document.createElement('div');
        element.className = 'scene-object';
        element.style.marginLeft = (depth * 20) + 'px';
        element.dataset.objectId = gameObject.id;
        element.textContent = gameObject.name;

        // Add selection event
        element.addEventListener('click', () => {
            this.selectGameObject(gameObject);
        });

        // Add double-click to rename
        element.addEventListener('dblclick', () => {
            this.renameGameObject(gameObject);
        });

        container.appendChild(element);

        // Add children
        if (gameObject.children && gameObject.children.length > 0) {
            gameObject.children.forEach(childId => {
                const child = this.findGameObjectById(childId);
                if (child) {
                    this.createHierarchyElement(child, container, depth + 1);
                }
            });
        }
    }

    // Setup context menu for hierarchy
    static setupContextMenu() {
        const hierarchyContainer = document.getElementById('hierarchy-panel');
        
        hierarchyContainer.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            
            const objectElement = e.target.closest('.scene-object');
            let gameObject = null;
            
            if (objectElement) {
                gameObject = this.findGameObjectById(objectElement.dataset.objectId);
            }

            this.showContextMenu(e.pageX, e.pageY, gameObject);
        });
    }

    // Show context menu
    static showContextMenu(x, y, gameObject) {
        // Remove existing context menu
        const existingMenu = document.getElementById('hierarchy-context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        const menu = document.createElement('div');
        menu.id = 'hierarchy-context-menu';
        menu.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            background: #333;
            border: 1px solid #555;
            border-radius: 4px;
            padding: 4px 0;
            z-index: 1000;
            min-width: 120px;
        `;

        const menuItems = [];

        if (gameObject) {
            menuItems.push({ label: 'Hernoemen', action: () => this.renameGameObject(gameObject) });
            menuItems.push({ label: 'Dupliceren', action: () => this.duplicateGameObject(gameObject) });
            menuItems.push({ label: 'Verwijderen', action: () => this.deleteGameObject(gameObject) });
            menuItems.push({ label: '---', action: null });
        }

        menuItems.push(
            { label: 'Cube toevoegen', action: () => this.createCube() },
            { label: 'Sphere toevoegen', action: () => this.createSphere() },
            { label: 'Plane toevoegen', action: () => this.createPlane() },
            { label: 'GLB toevoegen', action: () => this.createGLB() },
            { label: '---', action: null },
            { label: 'Light toevoegen', action: () => this.createLight() },
            { label: 'Camera toevoegen', action: () => this.createCamera() }
        );

        menuItems.forEach(item => {
            if (item.label === '---') {
                const separator = document.createElement('hr');
                separator.style.cssText = 'margin: 4px 0; border: none; border-top: 1px solid #555;';
                menu.appendChild(separator);
            } else {
                const menuItem = document.createElement('div');
                menuItem.textContent = item.label;
                menuItem.style.cssText = `
                    padding: 6px 12px;
                    cursor: pointer;
                    color: white;
                `;
                
                menuItem.addEventListener('mouseenter', () => {
                    menuItem.style.backgroundColor = '#444';
                });
                
                menuItem.addEventListener('mouseleave', () => {
                    menuItem.style.backgroundColor = '';
                });
                
                menuItem.addEventListener('click', () => {
                    if (item.action) {
                        item.action();
                    }
                    menu.remove();
                });
                
                menu.appendChild(menuItem);
            }
        });

        document.body.appendChild(menu);

        // Remove menu when clicking outside
        setTimeout(() => {
            document.addEventListener('click', function removeMenu() {
                menu.remove();
                document.removeEventListener('click', removeMenu);
            });
        }, 10);
    }

    // Rename GameObject
    static renameGameObject(gameObject) {
        const newName = prompt('Nieuwe naam:', gameObject.name);
        if (newName && newName !== gameObject.name) {
            gameObject.name = this.getUniqueName(newName);
            this.refreshHierarchy();
            
            // Reselect to update inspector
            if (this.selectedGameObject && this.selectedGameObject.id === gameObject.id) {
                Inspector.showGameObject(gameObject);
            }
        }
    }

    // Duplicate GameObject
    static duplicateGameObject(gameObject) {
        const duplicate = JSON.parse(JSON.stringify(gameObject)); // Deep clone
        duplicate.id = this.generateId();
        duplicate.name = this.getUniqueName(gameObject.name);
        duplicate.parent = null; // Remove parent relationship
        duplicate.children = []; // Remove children relationships

        EditorUI.currentProject.scenes[0].gameObjects.push(duplicate);
        this.refreshHierarchy();
        this.selectGameObject(duplicate);
    }

    // Utility functions
    static generateId() {
        return 'go_' + Math.random().toString(36).substr(2, 9);
    }

    static getUniqueName(baseName) {
        if (!EditorUI.currentProject || !EditorUI.currentProject.scenes[0]) return baseName;

        const gameObjects = EditorUI.currentProject.scenes[0].gameObjects;
        const existingNames = gameObjects.map(obj => obj.name);
        
        if (!existingNames.includes(baseName)) {
            return baseName;
        }

        let counter = 1;
        let newName;
        do {
            newName = `${baseName} (${counter})`;
            counter++;
        } while (existingNames.includes(newName));

        return newName;
    }
}
