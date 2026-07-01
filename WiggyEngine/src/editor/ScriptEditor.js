class ScriptEditor {
    static currentScript = null;
    static modal = null;
    static codeTextarea = null;
    static compileOutput = null;
    static compiler = null;
    static runtime = null;

    static initialize() {
        this.modal = document.getElementById('script-editor-modal');
        this.codeTextarea = document.getElementById('script-code');
        this.compileOutput = document.getElementById('compile-output');
        
        // Initialize WigLang compiler
        this.compiler = new StinkPiler.WigLangCompiler();
        this.runtime = new StinkPiler.WASMRuntime();
        
        // Create syntax highlighted code editor
        this.createCodeEditor();
        
        // Load example programs into dropdown
        //this.setupExamplePrograms();
        
        console.log('🔧 ScriptEditor initialized with WigLang compiler and syntax highlighting');
    }

    static setupExamplePrograms() {
        const examples = WigLangCompiler.getExamplePrograms();
        
        // Create dropdown for example programs
        const exampleSelect = document.createElement('select');
        exampleSelect.id = 'example-programs';
        exampleSelect.style.margin = '10px';
        
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Load Example...';
        exampleSelect.appendChild(defaultOption);
        
        for (const [name, code] of Object.entries(examples)) {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = name;
            exampleSelect.appendChild(option);
        }
        
        exampleSelect.addEventListener('change', (e) => {
            if (e.target.value) {
                this.codeTextarea.value = e.target.value.trim();
                e.target.value = ''; // Reset dropdown
            }
        });
        
        // Add to modal controls
        const modalControls = document.querySelector('.modal-controls');
        if (modalControls) {
            modalControls.insertBefore(exampleSelect, modalControls.firstChild);
        }
    }
    
    static createCodeEditor() {
        if (!this.codeTextarea) return;
        
        // Hide the original textarea
        this.codeTextarea.style.display = 'none';
        
        // Create code editor container
        const editorContainer = document.createElement('div');
        editorContainer.id = 'code-editor-container';
        editorContainer.style.cssText = `
            position: relative;
            width: 100%;
            height: 400px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 14px;
            background: #1e1e1e;
            color: #d4d4d4;
            overflow: hidden;
        `;
        
        // Create line numbers container
        const lineNumbers = document.createElement('div');
        lineNumbers.id = 'line-numbers';
        lineNumbers.style.cssText = `
            position: absolute;
            left: 0;
            top: 0;
            width: 25px;
            height: 100%;
            background: #2d2d30;
            border-right: 1px solid #3e3e42;
            color: #858585;
            text-align: right;
            padding-right: 8px;
            padding-top: 10px;
            line-height: 18px;
            font-size: 12px;
            user-select: none;
            overflow: hidden;
        `;
        
        // Create code input area
        const codeInput = document.createElement('div');
        codeInput.id = 'code-input';
        codeInput.contentEditable = true;
        codeInput.style.cssText = `
            position: absolute;
            left: 60px;
            top: 0;
            right: 0;
            height: 100%;
            padding: 10px;
            overflow-y: auto;
            line-height: 18px;
            white-space: pre;
            outline: none;
            caret-color: #ffffff;
        `;
        
        // Create error overlay for squiggles
        const errorOverlay = document.createElement('div');
        errorOverlay.id = 'error-overlay';
        errorOverlay.style.cssText = `
            position: absolute;
            left: 60px;
            top: 0;
            right: 0;
            height: 100%;
            padding: 10px;
            pointer-events: none;
            line-height: 18px;
            white-space: pre;
            overflow: hidden;
        `;
        
        // Assemble editor
        editorContainer.appendChild(lineNumbers);
        editorContainer.appendChild(codeInput);
        editorContainer.appendChild(errorOverlay);
        
        // Insert after original textarea
        this.codeTextarea.parentNode.insertBefore(editorContainer, this.codeTextarea.nextSibling);
        
        // Store references
        this.editorContainer = editorContainer;
        this.lineNumbers = lineNumbers;
        this.codeInput = codeInput;
        this.errorOverlay = errorOverlay;
        
        // Set initial content
        this.codeInput.textContent = this.getDefaultScriptTemplate();
        
        // Setup event handlers
        this.setupCodeEditorEvents();
        
        // Initial syntax highlighting
        this.updateSyntaxHighlighting();
        this.updateLineNumbers();
    }
    
    static setupCodeEditorEvents() {
        if (!this.codeInput) return;
        
        // Handle input changes
        this.codeInput.addEventListener('input', () => {
            this.updateSyntaxHighlighting();
            this.updateLineNumbers();
            this.checkForErrors();
            this.syncWithTextarea();
        });
        
        // Handle keyboard shortcuts
        this.codeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                this.insertText('    ');
            } else if (e.ctrlKey || e.metaKey) {
                if (e.key === 's') {
                    e.preventDefault();
                    this.saveScript();
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    this.compileScript();
                }
            }
        });
        
        // Handle scroll synchronization
        this.codeInput.addEventListener('scroll', () => {
            if (this.lineNumbers) {
                this.lineNumbers.scrollTop = this.codeInput.scrollTop;
            }
            if (this.errorOverlay) {
                this.errorOverlay.scrollTop = this.codeInput.scrollTop;
            }
        });
    }
    
    static updateSyntaxHighlighting() {
        if (!this.codeInput) return;
        
        const code = this.codeInput.textContent;
        const highlightedCode = this.applySyntaxHighlighting(code);
        
        // Preserve cursor position
        const selection = window.getSelection();
        const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
        const cursorOffset = range ? range.startOffset : 0;
        
        // Update content
        this.codeInput.innerHTML = highlightedCode;
        
        // Restore cursor position
        if (range) {
            try {
                const textNode = this.findTextNodeAtOffset(this.codeInput, cursorOffset);
                if (textNode) {
                    const newRange = document.createRange();
                    newRange.setStart(textNode.node, textNode.offset);
                    newRange.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                }
            } catch (e) {
                // Cursor restoration failed, ignore
            }
        }
    }
    
    static applySyntaxHighlighting(code) {
        try {
            const lexer = new WigLangLexer(code);
            const tokens = lexer.tokenize();
            
            let highlightedCode = '';
            let currentPos = 0;
            
            for (const token of tokens) {
                // Add any text before this token
                const tokenStart = this.getTokenPosition(code, token, currentPos);
                if (tokenStart > currentPos) {
                    highlightedCode += this.escapeHtml(code.substring(currentPos, tokenStart));
                }
                
                // Add highlighted token
                const tokenClass = this.getTokenClass(token.type);
                const tokenText = this.escapeHtml(token.value || this.getTokenText(token.type));
                
                if (tokenClass) {
                    highlightedCode += `<span class="${tokenClass}">${tokenText}</span>`;
                } else {
                    highlightedCode += tokenText;
                }
                
                currentPos = tokenStart + tokenText.length;
            }
            
            // Add any remaining text
            if (currentPos < code.length) {
                highlightedCode += this.escapeHtml(code.substring(currentPos));
            }
            
            return highlightedCode;
            
        } catch (error) {
            // If tokenization fails, return escaped code
            return this.escapeHtml(code);
        }
    }
    
    static getTokenClass(tokenType) {
        const tokenClasses = {
            'function': 'keyword',
            'if': 'keyword',
            'else': 'keyword',
            'while': 'keyword',
            'for': 'keyword',
            'return': 'keyword',
            'var': 'keyword',
            'const': 'keyword',
            'int': 'type',
            'float': 'type',
            'bool': 'type',
            'void': 'type',
            'NUMBER': 'number',
            'STRING': 'string',
            'IDENTIFIER': 'identifier',
            '+': 'operator',
            '-': 'operator',
            '*': 'operator',
            '/': 'operator',
            '=': 'operator',
            '==': 'operator',
            '!=': 'operator',
            '<': 'operator',
            '>': 'operator',
            '<=': 'operator',
            '>=': 'operator',
            '&&': 'operator',
            '||': 'operator',
            '!': 'operator'
        };
        
        return tokenClasses[tokenType] || null;
    }
    
    static getTokenPosition(code, token, startPos) {
        // Simple position calculation - in a real implementation would be more precise
        const lines = code.split('\n');
        let pos = 0;
        
        for (let i = 0; i < token.line - 1; i++) {
            pos += lines[i].length + 1; // +1 for newline
        }
        
        pos += token.column - 1;
        return Math.max(startPos, pos);
    }
    
    static getTokenText(tokenType) {
        return tokenType;
    }
    
    static escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    
    static updateLineNumbers() {
        if (!this.lineNumbers || !this.codeInput) return;
        
        const code = this.codeInput.textContent;
        const lines = code.split('\n');
        
        let lineNumbersHtml = '';
        for (let i = 1; i <= lines.length; i++) {
            lineNumbersHtml += i + '\n';
        }
        
        this.lineNumbers.textContent = lineNumbersHtml;
    }
    
    static syncWithTextarea() {
        if (this.codeTextarea && this.codeInput) {
            this.codeTextarea.value = this.codeInput.textContent;
        }
    }
    
    static insertText(text) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(document.createTextNode(text));
            range.collapse(false);
        }
    }
    
    static findTextNodeAtOffset(element, offset) {
        let currentOffset = 0;
        
        function traverse(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                const nodeLength = node.textContent.length;
                if (currentOffset + nodeLength >= offset) {
                    return { node: node, offset: offset - currentOffset };
                }
                currentOffset += nodeLength;
            } else {
                for (let child of node.childNodes) {
                    const result = traverse(child);
                    if (result) return result;
                }
            }
            return null;
        }
        
        return traverse(element);
    }
    
    static checkForErrors() {
        if (!this.codeInput || !this.errorOverlay) return;
        
        const code = this.codeInput.textContent;
        
        try {
            // Validate syntax using WigLang compiler
            const validation = this.compiler.validateSyntax(code);
            
            if (validation.valid) {
                // Clear errors
                this.errorOverlay.innerHTML = '';
                this.clearErrorSquiggles();
            } else {
                // Show error squiggles
                this.showErrorSquiggles(validation.errors);
            }
        } catch (error) {
            // Show general error
            this.showErrorSquiggles([error.message]);
        }
    }
    
    static showErrorSquiggles(errors) {
        if (!this.errorOverlay) return;
        
        // Clear previous errors
        this.errorOverlay.innerHTML = '';
        
        const code = this.codeInput.textContent;
        const lines = code.split('\n');
        
        for (const errorMessage of errors) {
            // Extract line number from error message if available
            const lineMatch = errorMessage.match(/line (\d+)/);
            if (lineMatch) {
                const lineNumber = parseInt(lineMatch[1]) - 1; // Convert to 0-based
                
                if (lineNumber >= 0 && lineNumber < lines.length) {
                    this.addErrorSquiggleToLine(lineNumber, errorMessage);
                }
            }
        }
    }
    
    static addErrorSquiggleToLine(lineNumber, errorMessage) {
        if (!this.errorOverlay) return;
        
        const code = this.codeInput.textContent;
        const lines = code.split('\n');
        
        // Calculate position
        let charsBefore = 0;
        for (let i = 0; i < lineNumber; i++) {
            charsBefore += lines[i].length + 1; // +1 for newline
        }
        
        // Create error element
        const errorSpan = document.createElement('span');
        errorSpan.style.cssText = `
            position: absolute;
            top: ${lineNumber * 18 + 10}px;
            left: 10px;
            width: ${lines[lineNumber].length * 8.4}px;
            height: 18px;
            border-bottom: 2px wavy #f14c4c;
            pointer-events: all;
            cursor: help;
        `;
        
        errorSpan.title = errorMessage;
        errorSpan.addEventListener('click', () => {
            alert(`Error on line ${lineNumber + 1}: ${errorMessage}`);
        });
        
        this.errorOverlay.appendChild(errorSpan);
    }
    
    static clearErrorSquiggles() {
        if (this.errorOverlay) {
            this.errorOverlay.innerHTML = '';
        }
    }

    static newScript() {
        this.currentScript = {
            name: 'NewScript',
            content: this.getDefaultScriptTemplate(),
            isNew: true
        };
        
        this.openEditor();
    }

    static editScript(scriptAsset) {
        this.currentScript = {
            name: scriptAsset.name,
            content: scriptAsset.content || this.getDefaultScriptTemplate(),
            asset: scriptAsset,
            isNew: false
        };
        
        this.openEditor();
    }

    static openEditor() {
        if (!this.modal || !this.codeTextarea) {
            console.error('Script Editor not initialized');
            return;
        }

        this.modal.style.display = 'block';
        this.codeTextarea.value = this.currentScript.content;
        this.codeTextarea.focus();
        
        // Update modal title
        const title = this.modal.querySelector('h3');
        if (title) {
            title.textContent = `Script Editor - ${this.currentScript.name}`;
        }
        
        // Clear previous compile output
        if (this.compileOutput) {
            this.compileOutput.innerHTML = '';
        }
    }

    static closeEditor() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
        this.currentScript = null;
    }

    static saveScript() {
        if (!this.currentScript) return;
        
        this.currentScript.content = this.codeTextarea.value;
        
        try {
            if (this.currentScript.isNew) {
                // Create new script asset
                const scriptName = prompt('Script Name:', this.currentScript.name);
                if (!scriptName) return;
                
                const asset = AssetManager.createScriptAsset(scriptName, this.currentScript.content);
                this.currentScript.asset = asset;
                this.currentScript.name = scriptName;
                this.currentScript.isNew = false;
                
                console.log(`Script '${scriptName}' created successfully`);
            } else {
                // Update existing script
                if (this.currentScript.asset) {
                    this.currentScript.asset.content = this.currentScript.content;
                    AssetManager.saveAsset(this.currentScript.asset);
                }
                
                console.log(`Script '${this.currentScript.name}' saved successfully`);
            }
            
            // Update compile output
            this.showMessage('Script saved successfully', 'success');
            
        } catch (error) {
            console.error('Failed to save script:', error);
            this.showMessage('Failed to save script: ' + error.message, 'error');
        }
    }

    static compileScript() {
        if (!this.currentScript) return;
        
        const code = this.codeTextarea.value;
        
        try {
            console.log('🔨 Compiling WigLang script...');
            this.showMessage('Compiling...', 'info');
            
            // Use WigLang compiler
            const result = this.compiler.compile(code);
            
            if (result.success) {
                this.showMessage('✅ Compilation successful!', 'success');
                this.showCompileDetails(result);
                
                // Update current script with compiled version
                this.currentScript.compiled = result.wasm;
                this.currentScript.ast = result.ast;
                this.currentScript.tokens = result.tokens;
                
                return result.wasm;
            } else {
                this.showMessage('❌ Compilation failed', 'error');
                this.showCompileErrors(result.errors);
                return null;
            }
            
        } catch (error) {
            console.error('Compilation error:', error);
            this.showMessage('❌ Compilation failed: ' + error.message, 'error');
            if (error.line !== undefined) {
                this.highlightErrorLine(error.line);
            }
            
            return null;
        }
    }

    static showCompileDetails(result) {
        if (!this.compileOutput) return;
        
        // Clear previous output
        this.compileOutput.innerHTML = '';
        
        // Show compilation statistics
        const stats = document.createElement('div');
        stats.className = 'compile-stats';
        stats.innerHTML = `
            <h4>📊 Compilation Statistics</h4>
            <ul>
                <li>Tokens: ${result.tokens.length}</li>
                <li>Functions: ${result.ast.functions.length}</li>
                <li>Variables: ${result.ast.variables.length}</li>
                <li>WASM Size: ${result.wasm.length} bytes</li>
            </ul>
        `;
        this.compileOutput.appendChild(stats);
        
        // Show function list
        if (result.ast.functions.length > 0) {
            const funcList = document.createElement('div');
            funcList.className = 'function-list';
            funcList.innerHTML = '<h4>🔧 Functions</h4>';
            
            const ul = document.createElement('ul');
            for (const func of result.ast.functions) {
                const li = document.createElement('li');
                const params = func.parameters.map(p => `${p.type} ${p.name}`).join(', ');
                li.textContent = `${func.returnType} ${func.name}(${params})`;
                ul.appendChild(li);
            }
            funcList.appendChild(ul);
            this.compileOutput.appendChild(funcList);
        }
        
        // Add buttons for testing and export
        const actions = document.createElement('div');
        actions.className = 'compile-actions';
        actions.style.marginTop = '10px';
        
        const testBtn = document.createElement('button');
        testBtn.textContent = '🚀 Test WASM';
        testBtn.onclick = () => this.testCompiledScript();
        
        const exportBtn = document.createElement('button');
        exportBtn.textContent = '📦 Export HTML';
        exportBtn.onclick = () => this.exportAsHTML();
        
        const downloadBtn = document.createElement('button');
        downloadBtn.textContent = '💾 Download WASM';
        downloadBtn.onclick = () => this.downloadWASM();
        
        actions.appendChild(testBtn);
        actions.appendChild(exportBtn);
        actions.appendChild(downloadBtn);
        this.compileOutput.appendChild(actions);
    }
    
    static showCompileErrors(errors) {
        if (!this.compileOutput) return;
        
        this.compileOutput.innerHTML = '';
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'compile-errors';
        errorDiv.innerHTML = '<h4>❌ Compilation Errors</h4>';
        
        const ul = document.createElement('ul');
        for (const error of errors) {
            const li = document.createElement('li');
            li.textContent = error;
            li.style.color = '#721c24';
            ul.appendChild(li);
        }
        errorDiv.appendChild(ul);
        this.compileOutput.appendChild(errorDiv);
    }
    
    static async testCompiledScript() {
        if (!this.currentScript || !this.currentScript.compiled) {
            this.showMessage('❌ No compiled script to test', 'error');
            return;
        }
        
        try {
            this.showMessage('🧪 Loading WASM for testing...', 'info');
            
            const result = await this.runtime.loadWASM(this.currentScript.compiled, 'test_script');
            
            if (result.success) {
                this.showMessage('✅ WASM loaded successfully', 'success');
                
                // Try to execute main function
                try {
                    const mainResult = this.runtime.executeFunction('test_script', 'main');
                    this.showMessage(`🎯 main() returned: ${mainResult}`, 'success');
                } catch (error) {
                    this.showMessage(`⚠️ Failed to execute main(): ${error.message}`, 'warning');
                }
                
                // Show available exports
                const exports = this.runtime.listExports('test_script');
                this.showMessage(`📋 Available functions: ${exports.join(', ')}`, 'info');
                
            } else {
                this.showMessage(`❌ Failed to load WASM: ${result.error}`, 'error');
            }
            
        } catch (error) {
            this.showMessage(`❌ Testing failed: ${error.message}`, 'error');
        }
    }
    
    static exportAsHTML() {
        if (!this.currentScript || !this.currentScript.compiled) {
            this.showMessage('❌ No compiled script to export', 'error');
            return;
        }
        
        try {
            const title = this.currentScript.name || 'WigLang App';
            const html = this.runtime.generateHTMLPage(this.currentScript.compiled, title);
            
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showMessage('📦 HTML page exported successfully!', 'success');
            
        } catch (error) {
            this.showMessage(`❌ Export failed: ${error.message}`, 'error');
        }
    }
    
    static downloadWASM() {
        if (!this.currentScript || !this.currentScript.compiled) {
            this.showMessage('❌ No compiled script to download', 'error');
            return;
        }
        
        try {
            const filename = `${this.currentScript.name || 'script'}.wasm`;
            const blob = new Blob([this.currentScript.compiled], { type: 'application/wasm' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showMessage(`💾 WASM file downloaded: ${filename}`, 'success');
            
        } catch (error) {
            this.showMessage(`❌ Download failed: ${error.message}`, 'error');
        }
    }

    static showMessage(message, type = 'info') {
        if (!this.compileOutput) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `compile-message ${type}`;
        messageDiv.textContent = message;
        messageDiv.style.padding = '5px';
        messageDiv.style.margin = '2px 0';
        messageDiv.style.borderRadius = '3px';
        
        switch (type) {
            case 'success':
                messageDiv.style.backgroundColor = '#d4edda';
                messageDiv.style.color = '#155724';
                messageDiv.style.border = '1px solid #c3e6cb';
                break;
            case 'error':
                messageDiv.style.backgroundColor = '#f8d7da';
                messageDiv.style.color = '#721c24';
                messageDiv.style.border = '1px solid #f5c6cb';
                break;
            case 'warning':
                messageDiv.style.backgroundColor = '#fff3cd';
                messageDiv.style.color = '#856404';
                messageDiv.style.border = '1px solid #ffeaa7';
                break;
            default:
                messageDiv.style.backgroundColor = '#d1ecf1';
                messageDiv.style.color = '#0c5460';
                messageDiv.style.border = '1px solid #bee5eb';
                break;
        }
        
        this.compileOutput.appendChild(messageDiv);
    }

    static countASTNodes(node) {
        if (!node) return 0;
        
        let count = 1;
        if (node.body && Array.isArray(node.body)) {
            for (let child of node.body) {
                count += this.countASTNodes(child);
            }
        }
        if (node.statements && Array.isArray(node.statements)) {
            for (let statement of node.statements) {
                count += this.countASTNodes(statement);
            }
        }
        
        return count;
    }

    static highlightErrorLine(lineNumber) {
        // Highlight the error line in the textarea
        const lines = this.codeTextarea.value.split('\n');
        if (lineNumber > 0 && lineNumber <= lines.length) {
            const startPos = lines.slice(0, lineNumber - 1).join('\n').length + (lineNumber > 1 ? 1 : 0);
            const endPos = startPos + lines[lineNumber - 1].length;
            
            this.codeTextarea.focus();
            this.codeTextarea.setSelectionRange(startPos, endPos);
        }
    }

    static getDefaultScriptTemplate() {
        return `// WigLang Script - C-like syntax compiles to WebAssembly
// Simple example showing basic language features

function int main() {
    // Entry point - return an integer value
    var int result = calculate(10, 5);
    return result;
}

function int calculate(int a, int b) {
    // Simple calculation function
    var int sum = a + b;
    var int product = a * b;
    
    if (sum > product) {
        return sum;
    } else {
        return product;
    }
}

function int factorial(int n) {
    // Recursive factorial calculation
    if (n <= 1) {
        return 1;
    } else {
        return n * factorial(n - 1);
    }
}`;
    }

    // Utility method to format code
    static formatCode() {
        if (!this.codeTextarea) return;
        
        let code = this.codeTextarea.value;
        
        // Basic code formatting
        const lines = code.split('\n');
        let indentLevel = 0;
        const formattedLines = [];
        
        for (let line of lines) {
            const trimmed = line.trim();
            
            if (trimmed.includes('}')) {
                indentLevel = Math.max(0, indentLevel - 1);
            }
            
            if (trimmed.length > 0) {
                formattedLines.push('    '.repeat(indentLevel) + trimmed);
            } else {
                formattedLines.push('');
            }
            
            if (trimmed.includes('{')) {
                indentLevel++;
            }
        }
        
        this.codeTextarea.value = formattedLines.join('\n');
    }

    // Find and replace functionality
    static findReplace() {
        const find = prompt('Find:');
        if (!find) return;
        
        const replace = prompt('Replace with:');
        if (replace === null) return;
        
        const code = this.codeTextarea.value;
        const newCode = code.replace(new RegExp(find, 'g'), replace);
        this.codeTextarea.value = newCode;
        
        this.showMessage(`Replaced ${(code.match(new RegExp(find, 'g')) || []).length} occurrences`, 'info');
    }
}
