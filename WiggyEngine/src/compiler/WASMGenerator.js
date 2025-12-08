/**
 * WigLang WebAssembly Code Generator
 * Converts AST to WebAssembly binary format
 */

class WASMCodeGenerator {
    constructor() {
        this.functions = [];
        this.types = [];
        this.exports = [];
        this.imports = [];
        this.memory = null;
        this.localVariables = new Map();
        this.functionIndex = 0;
        
        // WASM opcodes
        this.opcodes = {
            // Control
            'end': 0x0b,
            'return': 0x0f,
            'if': 0x04,
            'else': 0x05,
            'loop': 0x03,
            'br': 0x0c,
            'br_if': 0x0d,
            
            // Numeric operations
            'i32.const': 0x41,
            'i32.add': 0x6a,
            'i32.sub': 0x6b,
            'i32.mul': 0x6c,
            'i32.div_s': 0x6d,
            'i32.rem_s': 0x6f,
            'i32.eq': 0x46,
            'i32.ne': 0x47,
            'i32.lt_s': 0x48,
            'i32.gt_s': 0x4a,
            'i32.le_s': 0x4c,
            'i32.ge_s': 0x4e,
            
            'f32.const': 0x43,
            'f32.add': 0x92,
            'f32.sub': 0x93,
            'f32.mul': 0x94,
            'f32.div': 0x95,
            'f32.eq': 0x5b,
            'f32.ne': 0x5c,
            'f32.lt': 0x5d,
            'f32.gt': 0x5e,
            'f32.le': 0x5f,
            'f32.ge': 0x60,
            
            // Local variables
            'local.get': 0x20,
            'local.set': 0x21,
            'local.tee': 0x22,
            
            // Memory operations
            'i32.load': 0x28,
            'i32.store': 0x36,
            
            // Function calls
            'call': 0x10,
        };
        
        // WASM types
        this.wasmTypes = {
            'void': 0x40,
            'i32': 0x7f,
            'i64': 0x7e,
            'f32': 0x7d,
            'f64': 0x7c
        };
    }
    
    generate(ast) {
        // Reset state
        this.functions = [];
        this.types = [];
        this.exports = [];
        this.localVariables.clear();
        this.functionIndex = 0;
        
        // Process AST
        this.processProgram(ast);
        
        // Generate WASM binary
        return this.generateBinary();
    }
    
    processProgram(program) {
        // Process function declarations
        for (const func of program.functions) {
            this.processFunction(func);
        }
    }
    
    processFunction(funcDecl) {
        const functionType = this.createFunctionType(funcDecl);
        this.types.push(functionType);
        
        // Create function body
        const body = this.compileFunctionBody(funcDecl);
        this.functions.push(body);
        
        // Add export if it's main function
        if (funcDecl.name === 'main') {
            this.exports.push({
                name: 'main',
                kind: 0, // function
                index: this.functionIndex
            });
        }
        
        this.functionIndex++;
    }
    
    createFunctionType(funcDecl) {
        const params = funcDecl.parameters.map(p => this.mapType(p.type));
        const results = funcDecl.returnType === 'void' ? [] : [this.mapType(funcDecl.returnType)];
        
        return {
            params,
            results
        };
    }
    
    mapType(type) {
        const typeMap = {
            'int': 'i32',
            'float': 'f32',
            'bool': 'i32',
            'void': 'void'
        };
        return this.wasmTypes[typeMap[type] || 'i32'];
    }
    
    compileFunctionBody(funcDecl) {
        // Reset local variables for this function
        this.localVariables.clear();
        
        // Map parameters to local variables
        funcDecl.parameters.forEach((param, index) => {
            this.localVariables.set(param.name, index);
        });
        
        // Compile function body
        const bodyCode = this.compileStatement(funcDecl.body);
        
        // Create locals array (for now, just parameters)
        const locals = [];
        
        return {
            locals,
            code: [...bodyCode, this.opcodes.end]
        };
    }
    
    compileStatement(stmt) {
        switch (stmt.type) {
            case 'BlockStatement':
                return this.compileBlockStatement(stmt);
            case 'IfStatement':
                return this.compileIfStatement(stmt);
            case 'WhileStatement':
                return this.compileWhileStatement(stmt);
            case 'ReturnStatement':
                return this.compileReturnStatement(stmt);
            case 'VariableDeclaration':
                return this.compileVariableDeclaration(stmt);
            case 'BinaryOperation':
            case 'UnaryOperation':
            case 'FunctionCall':
            case 'Literal':
            case 'Identifier':
                return this.compileExpression(stmt);
            default:
                throw new Error(`Unsupported statement type: ${stmt.type}`);
        }
    }
    
    compileBlockStatement(block) {
        let code = [];
        for (const stmt of block.statements) {
            code = code.concat(this.compileStatement(stmt));
        }
        return code;
    }
    
    compileIfStatement(ifStmt) {
        let code = [];
        
        // Compile condition
        code = code.concat(this.compileExpression(ifStmt.condition));
        
        // If instruction
        code.push(this.opcodes.if);
        code.push(this.wasmTypes.void); // block type
        
        // Then branch
        code = code.concat(this.compileStatement(ifStmt.thenBranch));
        
        // Else branch if present
        if (ifStmt.elseBranch) {
            code.push(this.opcodes.else);
            code = code.concat(this.compileStatement(ifStmt.elseBranch));
        }
        
        code.push(this.opcodes.end);
        return code;
    }
    
    compileWhileStatement(whileStmt) {
        let code = [];
        
        // Loop instruction
        code.push(this.opcodes.loop);
        code.push(this.wasmTypes.void); // block type
        
        // Condition
        code = code.concat(this.compileExpression(whileStmt.condition));
        
        // Break if condition is false
        code.push(this.opcodes.br_if);
        code.push(0x01); // break out of loop
        
        // Body
        code = code.concat(this.compileStatement(whileStmt.body));
        
        // Continue loop
        code.push(this.opcodes.br);
        code.push(0x00); // continue loop
        
        code.push(this.opcodes.end);
        return code;
    }
    
    compileReturnStatement(returnStmt) {
        let code = [];
        
        if (returnStmt.value) {
            code = code.concat(this.compileExpression(returnStmt.value));
        }
        
        code.push(this.opcodes.return);
        return code;
    }
    
    compileVariableDeclaration(varDecl) {
        // Add to local variables map
        const index = this.localVariables.size;
        this.localVariables.set(varDecl.name, index);
        
        let code = [];
        if (varDecl.value) {
            // Compile initial value
            code = code.concat(this.compileExpression(varDecl.value));
            // Set local variable
            code.push(this.opcodes['local.set']);
            code = code.concat(this.encodeULEB128(index));
        }
        
        return code;
    }
    
    compileExpression(expr) {
        switch (expr.type) {
            case 'Literal':
                return this.compileLiteral(expr);
            case 'Identifier':
                return this.compileIdentifier(expr);
            case 'BinaryOperation':
                return this.compileBinaryOperation(expr);
            case 'UnaryOperation':
                return this.compileUnaryOperation(expr);
            case 'FunctionCall':
                return this.compileFunctionCall(expr);
            default:
                throw new Error(`Unsupported expression type: ${expr.type}`);
        }
    }
    
    compileLiteral(literal) {
        if (literal.dataType === 'number') {
            if (Number.isInteger(literal.value)) {
                return [
                    this.opcodes['i32.const'],
                    ...this.encodeSLEB128(literal.value)
                ];
            } else {
                return [
                    this.opcodes['f32.const'],
                    ...this.encodeFloat32(literal.value)
                ];
            }
        }
        throw new Error(`Unsupported literal type: ${literal.dataType}`);
    }
    
    compileIdentifier(identifier) {
        const index = this.localVariables.get(identifier.name);
        if (index === undefined) {
            throw new Error(`Unknown variable: ${identifier.name}`);
        }
        
        return [
            this.opcodes['local.get'],
            ...this.encodeULEB128(index)
        ];
    }
    
    compileBinaryOperation(binOp) {
        let code = [];
        
        // Compile operands
        code = code.concat(this.compileExpression(binOp.left));
        code = code.concat(this.compileExpression(binOp.right));
        
        // Compile operator
        const opMap = {
            '+': 'i32.add',
            '-': 'i32.sub',
            '*': 'i32.mul',
            '/': 'i32.div_s',
            '%': 'i32.rem_s',
            '==': 'i32.eq',
            '!=': 'i32.ne',
            '<': 'i32.lt_s',
            '>': 'i32.gt_s',
            '<=': 'i32.le_s',
            '>=': 'i32.ge_s'
        };
        
        const opcode = opMap[binOp.operator];
        if (!opcode) {
            throw new Error(`Unsupported binary operator: ${binOp.operator}`);
        }
        
        code.push(this.opcodes[opcode]);
        return code;
    }
    
    compileUnaryOperation(unaryOp) {
        let code = [];
        
        if (unaryOp.operator === '-') {
            // Negate: 0 - operand
            code.push(this.opcodes['i32.const']);
            code = code.concat(this.encodeSLEB128(0));
            code = code.concat(this.compileExpression(unaryOp.operand));
            code.push(this.opcodes['i32.sub']);
        } else if (unaryOp.operator === '!') {
            // Logical not: operand == 0
            code = code.concat(this.compileExpression(unaryOp.operand));
            code.push(this.opcodes['i32.const']);
            code = code.concat(this.encodeSLEB128(0));
            code.push(this.opcodes['i32.eq']);
        }
        
        return code;
    }
    
    compileFunctionCall(funcCall) {
        let code = [];
        
        // Compile arguments
        for (const arg of funcCall.arguments) {
            code = code.concat(this.compileExpression(arg));
        }
        
        // Find function index (simplified - in real implementation would need function table)
        const functionIndex = 0; // Placeholder
        
        code.push(this.opcodes.call);
        code = code.concat(this.encodeULEB128(functionIndex));
        
        return code;
    }
    
    generateBinary() {
        const sections = [];
        
        // Magic number and version
        const header = [0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00];
        
        // Type section
        if (this.types.length > 0) {
            sections.push(this.generateTypeSection());
        }
        
        // Function section
        if (this.functions.length > 0) {
            sections.push(this.generateFunctionSection());
        }
        
        // Export section
        if (this.exports.length > 0) {
            sections.push(this.generateExportSection());
        }
        
        // Code section
        if (this.functions.length > 0) {
            sections.push(this.generateCodeSection());
        }
        
        return new Uint8Array([...header, ...sections.flat()]);
    }
    
    generateTypeSection() {
        let content = [];
        content = content.concat(this.encodeULEB128(this.types.length));
        
        for (const type of this.types) {
            content.push(0x60); // function type
            content = content.concat(this.encodeULEB128(type.params.length));
            content = content.concat(type.params);
            content = content.concat(this.encodeULEB128(type.results.length));
            content = content.concat(type.results);
        }
        
        return [0x01, ...this.encodeULEB128(content.length), ...content];
    }
    
    generateFunctionSection() {
        let content = [];
        content = content.concat(this.encodeULEB128(this.functions.length));
        
        for (let i = 0; i < this.functions.length; i++) {
            content = content.concat(this.encodeULEB128(i)); // type index
        }
        
        return [0x03, ...this.encodeULEB128(content.length), ...content];
    }
    
    generateExportSection() {
        let content = [];
        content = content.concat(this.encodeULEB128(this.exports.length));
        
        for (const exp of this.exports) {
            const nameBytes = new TextEncoder().encode(exp.name);
            content = content.concat(this.encodeULEB128(nameBytes.length));
            content = content.concat(Array.from(nameBytes));
            content.push(exp.kind);
            content = content.concat(this.encodeULEB128(exp.index));
        }
        
        return [0x07, ...this.encodeULEB128(content.length), ...content];
    }
    
    generateCodeSection() {
        let content = [];
        content = content.concat(this.encodeULEB128(this.functions.length));
        
        for (const func of this.functions) {
            let funcContent = [];
            funcContent = funcContent.concat(this.encodeULEB128(func.locals.length));
            funcContent = funcContent.concat(func.locals.flat());
            funcContent = funcContent.concat(func.code);
            
            content = content.concat(this.encodeULEB128(funcContent.length));
            content = content.concat(funcContent);
        }
        
        return [0x0a, ...this.encodeULEB128(content.length), ...content];
    }
    
    // Utility functions for encoding
    encodeULEB128(value) {
        const result = [];
        do {
            let byte = value & 0x7f;
            value >>>= 7;
            if (value !== 0) {
                byte |= 0x80;
            }
            result.push(byte);
        } while (value !== 0);
        return result;
    }
    
    encodeSLEB128(value) {
        const result = [];
        let more = true;
        
        while (more) {
            let byte = value & 0x7f;
            value >>= 7;
            
            if ((value === 0 && (byte & 0x40) === 0) || (value === -1 && (byte & 0x40) !== 0)) {
                more = false;
            } else {
                byte |= 0x80;
            }
            
            result.push(byte);
        }
        
        return result;
    }
    
    encodeFloat32(value) {
        const buffer = new ArrayBuffer(4);
        const view = new DataView(buffer);
        view.setFloat32(0, value, true); // little endian
        return Array.from(new Uint8Array(buffer));
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WASMCodeGenerator };
} else {
    window.WASMCodeGenerator = WASMCodeGenerator;
}