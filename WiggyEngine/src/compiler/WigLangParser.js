/**
 * WigLang Parser - Creates AST from tokens for C-like WigLang syntax
 */

// AST Node types
class ASTNode {
    constructor(type, value = null) {
        this.type = type;
        this.value = value;
        this.children = [];
    }
    
    addChild(child) {
        this.children.push(child);
        return this;
    }
}

class Program extends ASTNode {
    constructor() {
        super('Program');
        this.functions = [];
        this.variables = [];
    }
}

class FunctionDeclaration extends ASTNode {
    constructor(name, returnType, parameters, body) {
        super('FunctionDeclaration');
        this.name = name;
        this.returnType = returnType;
        this.parameters = parameters;
        this.body = body;
    }
}

class VariableDeclaration extends ASTNode {
    constructor(name, type, value = null) {
        super('VariableDeclaration');
        this.name = name;
        this.varType = type;
        this.value = value;
    }
}

class BinaryOperation extends ASTNode {
    constructor(left, operator, right) {
        super('BinaryOperation');
        this.left = left;
        this.operator = operator;
        this.right = right;
    }
}

class UnaryOperation extends ASTNode {
    constructor(operator, operand) {
        super('UnaryOperation');
        this.operator = operator;
        this.operand = operand;
    }
}

class FunctionCall extends ASTNode {
    constructor(name, arguments_list) {
        super('FunctionCall');
        this.name = name;
        this.arguments = arguments_list;
    }
}

class IfStatement extends ASTNode {
    constructor(condition, thenBranch, elseBranch = null) {
        super('IfStatement');
        this.condition = condition;
        this.thenBranch = thenBranch;
        this.elseBranch = elseBranch;
    }
}

class WhileStatement extends ASTNode {
    constructor(condition, body) {
        super('WhileStatement');
        this.condition = condition;
        this.body = body;
    }
}

class ReturnStatement extends ASTNode {
    constructor(value = null) {
        super('ReturnStatement');
        this.value = value;
    }
}

class BlockStatement extends ASTNode {
    constructor(statements) {
        super('BlockStatement');
        this.statements = statements;
    }
}

class Literal extends ASTNode {
    constructor(type, value) {
        super('Literal');
        this.dataType = type;
        this.value = value;
    }
}

class Identifier extends ASTNode {
    constructor(name) {
        super('Identifier');
        this.name = name;
    }
}

class WigLangParser {
    constructor(tokens) {
        this.tokens = tokens;
        this.position = 0;
        this.current_token = this.tokens[0] || null;
    }
    
    advance() {
        this.position++;
        this.current_token = this.position < this.tokens.length ? this.tokens[this.position] : null;
    }
    
    peek(offset = 1) {
        const peek_pos = this.position + offset;
        return peek_pos < this.tokens.length ? this.tokens[peek_pos] : null;
    }
    
    expect(token_type) {
        if (!this.current_token || this.current_token.type !== token_type) {
            throw new Error(`Expected ${token_type}, got ${this.current_token ? this.current_token.type : 'EOF'} at line ${this.current_token ? this.current_token.line : '?'}`);
        }
        const token = this.current_token;
        this.advance();
        return token;
    }
    
    match(...token_types) {
        if (!this.current_token) return false;
        return token_types.includes(this.current_token.type);
    }
    
    parse() {
        const program = new Program();
        
        while (this.current_token && this.current_token.type !== TokenType.EOF) {
            if (this.match(TokenType.FUNCTION)) {
                program.functions.push(this.parseFunctionDeclaration());
            } else if (this.match(TokenType.VAR, TokenType.CONST)) {
                program.variables.push(this.parseVariableDeclaration());
            } else {
                throw new Error(`Unexpected token ${this.current_token.type} at line ${this.current_token.line}`);
            }
        }
        
        return program;
    }
    
    parseFunctionDeclaration() {
        this.expect(TokenType.FUNCTION);
        const returnType = this.parseType();
        const name = this.expect(TokenType.IDENTIFIER).value;
        
        this.expect(TokenType.LEFT_PAREN);
        const parameters = this.parseParameterList();
        this.expect(TokenType.RIGHT_PAREN);
        
        const body = this.parseBlockStatement();
        
        return new FunctionDeclaration(name, returnType, parameters, body);
    }
    
    parseParameterList() {
        const parameters = [];
        
        if (!this.match(TokenType.RIGHT_PAREN)) {
            do {
                const type = this.parseType();
                const name = this.expect(TokenType.IDENTIFIER).value;
                parameters.push({ type, name });
                
                if (this.match(TokenType.COMMA)) {
                    this.advance();
                } else {
                    break;
                }
            } while (true);
        }
        
        return parameters;
    }
    
    parseVariableDeclaration() {
        const isConst = this.match(TokenType.CONST);
        this.advance(); // Skip VAR or CONST
        
        const type = this.parseType();
        const name = this.expect(TokenType.IDENTIFIER).value;
        
        let value = null;
        if (this.match(TokenType.ASSIGN)) {
            this.advance();
            value = this.parseExpression();
        }
        
        this.expect(TokenType.SEMICOLON);
        
        const declaration = new VariableDeclaration(name, type, value);
        declaration.isConst = isConst;
        return declaration;
    }
    
    parseType() {
        if (this.match(TokenType.INT, TokenType.FLOAT, TokenType.BOOL, TokenType.VOID)) {
            const type = this.current_token.value;
            this.advance();
            return type;
        }
        throw new Error(`Expected type, got ${this.current_token.type} at line ${this.current_token.line}`);
    }
    
    parseBlockStatement() {
        this.expect(TokenType.LEFT_BRACE);
        const statements = [];
        
        while (!this.match(TokenType.RIGHT_BRACE) && this.current_token.type !== TokenType.EOF) {
            statements.push(this.parseStatement());
        }
        
        this.expect(TokenType.RIGHT_BRACE);
        return new BlockStatement(statements);
    }
    
    parseStatement() {
        if (this.match(TokenType.IF)) {
            return this.parseIfStatement();
        } else if (this.match(TokenType.WHILE)) {
            return this.parseWhileStatement();
        } else if (this.match(TokenType.RETURN)) {
            return this.parseReturnStatement();
        } else if (this.match(TokenType.VAR, TokenType.CONST)) {
            return this.parseVariableDeclaration();
        } else if (this.match(TokenType.LEFT_BRACE)) {
            return this.parseBlockStatement();
        } else {
            // Expression statement
            const expr = this.parseExpression();
            this.expect(TokenType.SEMICOLON);
            return expr;
        }
    }
    
    parseIfStatement() {
        this.expect(TokenType.IF);
        this.expect(TokenType.LEFT_PAREN);
        const condition = this.parseExpression();
        this.expect(TokenType.RIGHT_PAREN);
        
        const thenBranch = this.parseStatement();
        let elseBranch = null;
        
        if (this.match(TokenType.ELSE)) {
            this.advance();
            elseBranch = this.parseStatement();
        }
        
        return new IfStatement(condition, thenBranch, elseBranch);
    }
    
    parseWhileStatement() {
        this.expect(TokenType.WHILE);
        this.expect(TokenType.LEFT_PAREN);
        const condition = this.parseExpression();
        this.expect(TokenType.RIGHT_PAREN);
        
        const body = this.parseStatement();
        
        return new WhileStatement(condition, body);
    }
    
    parseReturnStatement() {
        this.expect(TokenType.RETURN);
        
        let value = null;
        if (!this.match(TokenType.SEMICOLON)) {
            value = this.parseExpression();
        }
        
        this.expect(TokenType.SEMICOLON);
        return new ReturnStatement(value);
    }
    
    parseExpression() {
        return this.parseLogicalOr();
    }
    
    parseLogicalOr() {
        let expr = this.parseLogicalAnd();
        
        while (this.match(TokenType.OR)) {
            const operator = this.current_token.value;
            this.advance();
            const right = this.parseLogicalAnd();
            expr = new BinaryOperation(expr, operator, right);
        }
        
        return expr;
    }
    
    parseLogicalAnd() {
        let expr = this.parseEquality();
        
        while (this.match(TokenType.AND)) {
            const operator = this.current_token.value;
            this.advance();
            const right = this.parseEquality();
            expr = new BinaryOperation(expr, operator, right);
        }
        
        return expr;
    }
    
    parseEquality() {
        let expr = this.parseComparison();
        
        while (this.match(TokenType.EQUALS, TokenType.NOT_EQUALS)) {
            const operator = this.current_token.value;
            this.advance();
            const right = this.parseComparison();
            expr = new BinaryOperation(expr, operator, right);
        }
        
        return expr;
    }
    
    parseComparison() {
        let expr = this.parseAddition();
        
        while (this.match(TokenType.LESS_THAN, TokenType.GREATER_THAN, TokenType.LESS_EQUAL, TokenType.GREATER_EQUAL)) {
            const operator = this.current_token.value;
            this.advance();
            const right = this.parseAddition();
            expr = new BinaryOperation(expr, operator, right);
        }
        
        return expr;
    }
    
    parseAddition() {
        let expr = this.parseMultiplication();
        
        while (this.match(TokenType.PLUS, TokenType.MINUS)) {
            const operator = this.current_token.value;
            this.advance();
            const right = this.parseMultiplication();
            expr = new BinaryOperation(expr, operator, right);
        }
        
        return expr;
    }
    
    parseMultiplication() {
        let expr = this.parseUnary();
        
        while (this.match(TokenType.MULTIPLY, TokenType.DIVIDE, TokenType.MODULO)) {
            const operator = this.current_token.value;
            this.advance();
            const right = this.parseUnary();
            expr = new BinaryOperation(expr, operator, right);
        }
        
        return expr;
    }
    
    parseUnary() {
        if (this.match(TokenType.NOT, TokenType.MINUS)) {
            const operator = this.current_token.value;
            this.advance();
            const operand = this.parseUnary();
            return new UnaryOperation(operator, operand);
        }
        
        return this.parsePrimary();
    }
    
    parsePrimary() {
        if (this.match(TokenType.NUMBER)) {
            const value = this.current_token.value;
            this.advance();
            return new Literal('number', value);
        }
        
        if (this.match(TokenType.STRING)) {
            const value = this.current_token.value;
            this.advance();
            return new Literal('string', value);
        }
        
        if (this.match(TokenType.IDENTIFIER)) {
            const name = this.current_token.value;
            this.advance();
            
            // Function call
            if (this.match(TokenType.LEFT_PAREN)) {
                this.advance();
                const args = this.parseArgumentList();
                this.expect(TokenType.RIGHT_PAREN);
                return new FunctionCall(name, args);
            }
            
            // Variable reference
            return new Identifier(name);
        }
        
        if (this.match(TokenType.LEFT_PAREN)) {
            this.advance();
            const expr = this.parseExpression();
            this.expect(TokenType.RIGHT_PAREN);
            return expr;
        }
        
        throw new Error(`Unexpected token ${this.current_token.type} at line ${this.current_token.line}`);
    }
    
    parseArgumentList() {
        const args = [];
        
        if (!this.match(TokenType.RIGHT_PAREN)) {
            do {
                args.push(this.parseExpression());
                
                if (this.match(TokenType.COMMA)) {
                    this.advance();
                } else {
                    break;
                }
            } while (true);
        }
        
        return args;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        WigLangParser, 
        ASTNode, Program, FunctionDeclaration, VariableDeclaration,
        BinaryOperation, UnaryOperation, FunctionCall, IfStatement,
        WhileStatement, ReturnStatement, BlockStatement, Literal, Identifier
    };
} else {
    window.WigLangParser = WigLangParser;
    window.ASTNode = ASTNode;
    window.Program = Program;
    window.FunctionDeclaration = FunctionDeclaration;
    window.VariableDeclaration = VariableDeclaration;
    window.BinaryOperation = BinaryOperation;
    window.UnaryOperation = UnaryOperation;
    window.FunctionCall = FunctionCall;
    window.IfStatement = IfStatement;
    window.WhileStatement = WhileStatement;
    window.ReturnStatement = ReturnStatement;
    window.BlockStatement = BlockStatement;
    window.Literal = Literal;
    window.Identifier = Identifier;
}