# WiggyEngine - 3D Game Engine & Editor

A browser-based 3D game engine and editor with custom WigLang scripting language and WebAssembly compilation.

## 🚀 Quick Start

1. Open `index.html` in a modern web browser
2. Create a new project or open an existing one
3. Design your game in the visual editor
4. Build and export as a standalone HTML file

## ✨ Recent Fixes (Export/Import)

### Issues Fixed
- ✅ **File Extension Consistency**: Projects now save as `.wigp` files consistently
- ✅ **Import Compatibility**: Can load both `.wigp` and `.wigproj` files
- ✅ **Error Handling**: Enhanced error messages and fallback support
- ✅ **Build Export**: Games export with proper naming (`ProjectName_game.html`)
- ✅ **User Feedback**: Added notifications and alerts for all operations

### Testing
Open `test_export_import.html` for a comprehensive testing guide and verification page.

## 📁 Project Structure

```
WiggyEngine/
├── index.html              # Main editor entry point
├── test.html               # Test page
├── test_export_import.html # Export/Import testing page
├── EXPORT_IMPORT_FIX.md   # Detailed fix documentation
├── src/
│   ├── compiler/           # WigLang compiler and WASM generator
│   │   ├── WigLangLexer.js
│   │   ├── WigLangParser.js
│   │   ├── WASMGenerator.js
│   │   ├── WigLangCompiler.js
│   │   ├── ProjectBuilder.js
│   │   └── ProjectBuilder2.js
│   ├── editor/             # Editor UI and management
│   │   ├── EditorUI.js
│   │   ├── GameObjectManager.js
│   │   ├── Inspector.js
│   │   ├── ProjectBuilder.js
│   │   ├── ProjectManager.js
│   │   ├── ScriptEditor.js
│   │   └── styles.css
│   └── engine/             # Core engine components
│       ├── SceneEditor.js
│       ├── math/
│       │   ├── Vector3.js
│       │   └── Matrix4.js
│       └── rendering/
│           ├── Camera.js
│           └── Renderer2.js
└── images/                 # Logo and assets
```

## 🎮 Features

### Editor
- **Visual Scene Editor**: Drag-and-drop 3D viewport
- **GameObject Hierarchy**: Tree view of scene objects
- **Inspector Panel**: Edit component properties
- **Asset Browser**: Manage project resources
- **Script Editor**: Write custom game logic with WigLang

### Project Management
- **Save/Load Projects**: Compressed `.wigp` format
- **Build System**: Export to standalone HTML
- **Project Templates**: Empty, 2D, and 3D templates
- **Recent Projects**: Quick access to previous work

### Scripting
- **WigLang**: Custom scripting language
- **WebAssembly**: Compiles to WASM for performance
- **Syntax Highlighting**: Built-in code editor
- **Example Programs**: Sample scripts included

### Compression
- **LZ77 Algorithm**: Efficient data compression
- **Huffman Coding**: Entropy encoding
- **3:1 to 5:1 Ratio**: Typical compression rates
- **Fast Decompression**: Optimized for browser

## 🔧 Usage

### Creating a New Project
1. Click "Nieuw Project" in the menu bar
2. Enter a project name
3. Select a template (Empty, 2D, or 3D)
4. Click "Maken"

### Saving a Project
1. Click "Opslaan" in the menu bar
2. Project saves as `ProjectName.wigp`
3. Notification confirms save

### Loading a Project
1. Click "Project Openen" in the menu bar
2. Select a `.wigp` or `.wigproj` file
3. Project loads with all assets and settings

### Building a Game
1. Click "🔧 Bouwen" in the menu bar
2. Wait for build process (shows notification)
3. Game downloads as `ProjectName_game.html`
4. Open HTML file in any browser to play

### Adding GameObjects
1. Click "+ GameObject" in the hierarchy panel
2. Select the object in the hierarchy
3. Edit properties in the Inspector panel
4. Add components as needed

### Writing Scripts
1. Click "+ Script" in the asset browser
2. Write code in the WigLang editor
3. Click "Compileren" to test compilation
4. Click "Opslaan" to save the script
5. Attach script to a GameObject via Inspector

## 📝 File Formats

### Project Files (`.wigp`)
- Custom compressed format
- Contains scenes, gameObjects, scripts, and settings
- JSON-based with LZ77+Huffman compression
- Typical size: 1-10MB

### Exported Games (`.html`)
- Standalone HTML file
- Embedded WebAssembly scripts
- No external dependencies
- Works offline

## 🌐 Browser Support

- ✅ Chrome/Edge: Full support
- ✅ Firefox: Full support
- ✅ Safari: Full support
- ✅ Opera: Full support

## 📖 Documentation

- `EXPORT_IMPORT_FIX.md` - Detailed fix documentation
- `test_export_import.html` - Testing guide
- Console logs - Debug information

## 🐛 Known Issues

1. Recent projects list is display-only
2. Script compilation requires valid WigLang syntax
3. Large projects may take time to compress

## 🔮 Future Improvements

- [ ] Project preview thumbnails
- [ ] Auto-save functionality
- [ ] Additional templates
- [ ] External asset loading
- [ ] Cloud storage integration
- [ ] Collaborative editing

## 🤝 Contributing

This is a personal project. Feel free to fork and modify for your own use.

## 📄 License

© 2025 WiggyEngine. All rights reserved.

## 🎯 Version

**Version 1.0.0**
- Initial release with full editor
- Export/Import fixes applied
- WigLang compiler integrated
- WebAssembly support

---

Made with ❤️ for game development
