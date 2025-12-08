/**
 * WigLang Compiler - Main compiler that combines lexer, parser, and code generator
 */

class WigLangCompiler {
    constructor() {
        this.lexer = null;
        this.parser = null;
        this.generator = new WASMCodeGenerator();
        this.errors = [];
        this.warnings = [];
    }
    
    compile(source) {
        this.errors = [];
        this.warnings = [];
        
        try {
            // Step 1: Lexical analysis
            console.log('🔍 Starting lexical analysis...');
            this.lexer = new WigLangLexer(source);
            const tokens = this.lexer.tokenize();
            console.log(`✅ Tokenization complete: ${tokens.length} tokens`);
            
            // Step 2: Syntax analysis
            console.log('📝 Starting syntax analysis...');
            this.parser = new WigLangParser(tokens);
            const ast = this.parser.parse();
            console.log('✅ Parsing complete');
            
            // Step 3: Code generation
            console.log('⚙️ Starting code generation...');
            const wasmBinary = this.generator.generate(ast);
            console.log(`✅ Code generation complete: ${wasmBinary.length} bytes`);
            
            return {
                success: true,
                wasm: wasmBinary,
                ast: ast,
                tokens: tokens,
                errors: this.errors,
                warnings: this.warnings
            };
            
        } catch (error) {
            console.error('❌ Compilation failed:', error.message);
            this.errors.push(error.message);
            
            return {
                success: false,
                wasm: null,
                ast: null,
                tokens: null,
                errors: this.errors,
                warnings: this.warnings
            };
        }
    }
    
    compileToFile(source, filename = 'script.wasm') {
        const result = this.compile(source);
        
        if (result.success) {
            // Create downloadable WASM file
            const blob = new Blob([result.wasm], { type: 'application/wasm' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log(`📦 WASM file saved: ${filename}`);
        }
        
        return result;
    }
    
    validateSyntax(source) {
        try {
            this.lexer = new WigLangLexer(source);
            const tokens = this.lexer.tokenize();
            
            this.parser = new WigLangParser(tokens);
            this.parser.parse();
            
            return { valid: true, errors: [] };
            
        } catch (error) {
            return { valid: false, errors: [error.message] };
        }
    }
    
    getTokens(source) {
        try {
            this.lexer = new WigLangLexer(source);
            return this.lexer.tokenize();
        } catch (error) {
            console.error('Tokenization failed:', error);
            return [];
        }
    }
    
    getAST(source) {
        try {
            const tokens = this.getTokens(source);
            this.parser = new WigLangParser(tokens);
            return this.parser.parse();
        } catch (error) {
            console.error('Parsing failed:', error);
            return null;
        }
    }
    
    // Example WigLang programs for testing
    static getExamplePrograms() {
        return {
            'Hello World': `
function int main() {
    return 42;
}`,
            
            'Simple Math': `
function int add(int a, int b) {
    return a + b;
}

function int main() {
    var int result = add(5, 3);
    return result;
}`,
            
            'Conditional Logic': `
function int max(int a, int b) {
    if (a > b) {
        return a;
    } else {
        return b;
    }
}

function int main() {
    return max(10, 20);
}`,
            
            'Loop Example': `
function int factorial(int n) {
    var int result = 1;
    var int i = 1;
    
    while (i <= n) {
        result = result * i;
        i = i + 1;
    }
    
    return result;
}

function int main() {
    return factorial(5);
}`,
            
            'Multiple Functions': `
function int square(int x) {
    return x * x;
}

function int sumOfSquares(int a, int b) {
    return square(a) + square(b);
}

function int main() {
    return sumOfSquares(3, 4);
}`
        };
    }
    
    // Test the compiler with example programs
    static test() {
        const compiler = new WigLangCompiler();
        const examples = WigLangCompiler.getExamplePrograms();
        
        console.log('🧪 Testing WigLang Compiler...');
        
        for (const [name, source] of Object.entries(examples)) {
            console.log(`\n📋 Testing: ${name}`);
            console.log('Source:', source.trim());
            
            const result = compiler.compile(source);
            
            if (result.success) {
                console.log(`✅ ${name}: Compilation successful`);
                console.log(`   WASM size: ${result.wasm.length} bytes`);
                console.log(`   Functions: ${result.ast.functions.length}`);
            } else {
                console.log(`❌ ${name}: Compilation failed`);
                console.log(`   Errors: ${result.errors.join(', ')}`);
            }
        }
        
        console.log('\n🏁 Testing complete');
    }
}

// WASM Runtime for executing compiled scripts
class WASMRuntime {
    constructor() {
        this.modules = new Map();
        this.instances = new Map();
    }
    
    async loadWASM(wasmBytes, moduleName = 'script') {
        try {
            console.log(`📥 Loading WASM module: ${moduleName}`);
            
            // Compile WASM module
            const module = await WebAssembly.compile(wasmBytes);
            this.modules.set(moduleName, module);
            
            // Create instance
            const instance = await WebAssembly.instantiate(module);
            this.instances.set(moduleName, instance);
            
            console.log(`✅ WASM module loaded: ${moduleName}`);
            return { success: true, module, instance };
            
        } catch (error) {
            console.error(`❌ Failed to load WASM module: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
    
    executeFunction(moduleName, functionName, ...args) {
        const instance = this.instances.get(moduleName);
        
        if (!instance) {
            throw new Error(`Module not found: ${moduleName}`);
        }
        
        const func = instance.exports[functionName];
        
        if (!func) {
            throw new Error(`Function not found: ${functionName} in module ${moduleName}`);
        }
        
        try {
            console.log(`🚀 Executing: ${moduleName}.${functionName}(${args.join(', ')})`);
            const result = func(...args);
            console.log(`✅ Result: ${result}`);
            return result;
        } catch (error) {
            console.error(`❌ Execution failed: ${error.message}`);
            throw error;
        }
    }
    
    listExports(moduleName) {
        const instance = this.instances.get(moduleName);
        if (!instance) return [];
        
        return Object.keys(instance.exports);
    }
    
    // Create HTML page with embedded WASM
    generateHTMLPage(wasmBytes, title = 'WigLang App') {
        const wasmBase64 = btoa(String.fromCharCode(...wasmBytes));
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        button {
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            margin: 5px;
        }
        button:hover {
            background: #0056b3;
        }
        #output {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            padding: 10px;
            margin-top: 10px;
            font-family: monospace;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${title}</h1>
        <p>This page contains a compiled WigLang script running in WebAssembly.</p>
        
        <div>
            <button onclick="runMain()">Run Main Function</button>
            <button onclick="clearOutput()">Clear Output</button>
        </div>
        
        <div id="output"></div>
    </div>

    <script>
        let wasmModule = null;
        let wasmInstance = null;
        
        // Embedded WASM binary (base64 encoded)
        const wasmBase64 = '${wasmBase64}';
        
        async function loadWASM() {
            try {
                const wasmBytes = Uint8Array.from(atob(wasmBase64), c => c.charCodeAt(0));
                wasmModule = await WebAssembly.compile(wasmBytes);
                wasmInstance = await WebAssembly.instantiate(wasmModule);
                
                log('✅ WASM module loaded successfully');
                log('Available functions: ' + Object.keys(wasmInstance.exports).join(', '));
                
            } catch (error) {
                log('❌ Failed to load WASM: ' + error.message);
            }
        }
        
        function runMain() {
            if (!wasmInstance) {
                log('❌ WASM module not loaded');
                return;
            }
            
            try {
                const result = wasmInstance.exports.main();
                log('🚀 main() returned: ' + result);
            } catch (error) {
                log('❌ Execution failed: ' + error.message);
            }
        }
        
        function log(message) {
            const output = document.getElementById('output');
            output.innerHTML += message + '<br>';
        }
        
        function clearOutput() {
            document.getElementById('output').innerHTML = '';
        }
        
        // Load WASM when page loads
        window.addEventListener('load', loadWASM);
    </script>
</body>
</html>`;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WigLangCompiler, WASMRuntime };
} else {
    window.WigLangCompiler = WigLangCompiler;
    window.WASMRuntime = WASMRuntime;
}