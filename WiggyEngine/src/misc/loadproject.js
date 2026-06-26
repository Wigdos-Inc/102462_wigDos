// Load project from file
async function loadProjectFromFile(file) {
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
                    const decompressed = await decompressData(arrayBuffer);
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
