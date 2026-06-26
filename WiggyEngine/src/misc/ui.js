const projectSelectionContainer = `
    <div class="project-selection-container">
        <div class="project-header">
            <img src="images/logo.png" alt="WiggyEngine" class="project-logo">
            <h1>${globalEditorVersion['WGY']} ${globalEditorVersion['ED']}</h1>
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
            <p>WiggyEngine v${globalEditorVersion['V']}.0 - Game Editor</p>
        </div>
    </div>
`;

const projectSettingsModal = `
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

const SplashScreen = `
    <div id="splash-screen" style="
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
        color: #ffffff;
        font-family: 'Segoe UI', sans-serif;
    ">
        <div style="text-align: center; animation: fadeInUp 1s ease-out;">
            <img src="images/logo2.png" alt="WiggyEngine" style="
                width: 200px;
                height: auto;
                margin-bottom: 30px;
                filter: drop-shadow(0 0 20px rgba(255,255,255,0.3));
            ">
            <h1 style="
                font-size: 48px;
                font-weight: 300;
                margin: 0 0 10px 0;
                color: #4CAF50;
                text-shadow: 0 0 10px rgba(76,175,80,0.5);
            ">${globalEditorVersion['WGY']}</h1>
            <p style="
                font-size: 18px;
                margin: 0 0 20px 0;
                color: #bbb;
            ">3D Game ${globalEditorVersion['ED']}</p>
            <div style="
                font-size: 14px;
                color: #888;
                line-height: 1.6;
            ">
                <p>Version v${globalEditorVersion['V']}.0</p>
                <p>© 2026 ${globalEditorVersion['WGY']} ${globalEditorVersion['ED']}. All rights reserved.</p>
            </div>
            <div style="
                margin-top: 40px;
                width: 200px;
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
    <style>
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        @keyframes fadeOut {
            from {
                opacity: 1;
            }
            to {
                opacity: 0;
            }
        }
    </style>
`;

const EditorMainUI = `
    <div id="wiggy-engine">
        <!-- Main Menu Bar -->
        <div id="menu-bar">
            <div class="menu-brand">
                <img src="images/logo.png" alt="${globalEditorVersion['WGY']}${globalEditorVersion['ED']}" class="menu-logo">
                <span class="menu-title">${globalEditorVersion['WGY']} ${globalEditorVersion['ED']}</span>
            </div>
            <div class="menu-group">
                <button class="menu-item" onclick="EditorUI.newProject()">Nieuw Project</button>
                <button class="menu-item" onclick="EditorUI.openProject()">Project Openen</button>
                <button class="menu-item" onclick="EditorUI.saveProject()">Opslaan</button>
                <button class="menu-item menu-item-accent" onclick="EditorUI.exportProject()">RBXL Export</button>
            </div>
            <div class="menu-group">
                <button class="menu-item" onclick="EditorUI.playProject()">▶ Afspelen</button>
                <button class="menu-item" onclick="EditorUI.buildProject()">🔧 Bouwen</button>
            </div>
        </div>

        <!-- Main Layout -->
        <div id="main-layout">
            <!-- Hierarchy Panel -->
            <div id="hierarchy-panel" class="panel">
                <h3>Scene Hiërarchie</h3>
                <div id="scene-tree"></div>
                <button onclick="GameObjectManager.createGameObject('GameObject')">+ GameObject</button>
            </div>

            <!-- Viewport -->
            <div id="viewport-container">
                <canvas id="canvas" width="800" height="600"></canvas>
                <div id="viewport-controls">
                    <button id="move-tool" class="tool-btn active">Verplaatsen</button>
                    <button id="rotate-tool" class="tool-btn">Roteren</button>
                    <button id="scale-tool" class="tool-btn">Schalen</button>
                </div>
            </div>

            <!-- Inspector Panel -->
            <div id="inspector-panel" class="panel">
                <h3>Inspector</h3>
                <div id="inspector-content">
                    <p>Selecteer een object om eigenschappen te bekijken</p>
                </div>
            </div>
        </div>

        <!-- Asset Browser -->
        <div id="asset-browser" class="panel">
            <h3>Asset Browser</h3>
            <div id="asset-grid"></div>
            <div class="asset-hint">Rechtsklik om textures, materials, models, objects of .wigscripts toe te voegen.</div>
        </div>
    </div>

    <!-- Script Editor Modal -->
    <div id="script-editor-modal" class="modal">
        <div class="modal-content">
            <h3>Script Editor</h3>
            <textarea id="script-code" rows="20" cols="80"></textarea>
            <div class="modal-controls">
                <button onclick="ScriptEditor.compileScript()">Compileren</button>
                <button onclick="ScriptEditor.saveScript()">Opslaan</button>
                <button onclick="ScriptEditor.closeEditor()">Sluiten</button>
            </div>
            <div id="compile-output"></div>
        </div>
    </div>
`;

document.body.innerHTML = EditorMainUI;
