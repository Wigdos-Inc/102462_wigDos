/**
 * WigLang Lexer - Tokenizes C-like syntax for WigLang
 */

// Token types
const TokenType = {
    // Literals
    NUMBER: 'NUMBER',
    STRING: 'STRING',
    IDENTIFIER: 'IDENTIFIER',
    
    // Keywords
    FUNCTION: 'function',
    IF: 'if',
    ELSE: 'else',
    WHILE: 'while',
    FOR: 'for',
    RETURN: 'return',
    VAR: 'var',
    CONST: 'const',
    
    // Types
    INT: 'int',
    FLOAT: 'float',
    BOOL: 'bool',
    VOID: 'void',
    
    // Operators
    PLUS: '+',
    MINUS: '-',
    MULTIPLY: '*',
    DIVIDE: '/',
    MODULO: '%',
    ASSIGN: '=',
    EQUALS: '==',
    NOT_EQUALS: '!=',
    LESS_THAN: '<',
    GREATER_THAN: '>',
    LESS_EQUAL: '<=',
    GREATER_EQUAL: '>=',
    AND: '&&',
    OR: '||',
    NOT: '!',
    
    // Delimiters
    SEMICOLON: ';',
    COMMA: ',',
    LEFT_PAREN: '(',
    RIGHT_PAREN: ')',
    LEFT_BRACE: '{',
    RIGHT_BRACE: '}',
    LEFT_BRACKET: '[',
    RIGHT_BRACKET: ']',
    
    // Special
    EOF: 'EOF',
    NEWLINE: 'NEWLINE',
    WHITESPACE: 'WHITESPACE'
};

class Token {
    constructor(type, value, line, column) {
        this.type = type;
        this.value = value;
        this.line = line;
        this.column = column;
    }
    
    toString() {
        return `Token(${this.type}, '${this.value}', ${this.line}:${this.column})`;
    }
}

class WigLangLexer {
    constructor(source) {
        this.source = source;
        this.position = 0;
        this.line = 1;
        this.column = 1;
        this.current_char = this.source[this.position] || null;
        
        // Keywords mapping
        this.keywords = {
            'function': TokenType.FUNCTION,
            'if': TokenType.IF,
            'else': TokenType.ELSE,
            'while': TokenType.WHILE,
            'for': TokenType.FOR,
            'return': TokenType.RETURN,
            'var': TokenType.VAR,
            'const': TokenType.CONST,
            'int': TokenType.INT,
            'float': TokenType.FLOAT,
            'bool': TokenType.BOOL,
            'void': TokenType.VOID,
            'true': TokenType.IDENTIFIER,
            'false': TokenType.IDENTIFIER
        };
    }
    
    advance() {
        if (this.current_char === '\n') {
            this.line++;
            this.column = 1;
        } else {
            this.column++;
        }
        
        this.position++;
        this.current_char = this.position < this.source.length ? this.source[this.position] : null;
    }
    
    peek(offset = 1) {
        const peek_pos = this.position + offset;
        return peek_pos < this.source.length ? this.source[peek_pos] : null;
    }
    
    skipWhitespace() {
        while (this.current_char && /\s/.test(this.current_char) && this.current_char !== '\n') {
            this.advance();
        }
    }
    
    skipComment() {
        if (this.current_char === '/' && this.peek() === '/') {
            // Single line comment
            while (this.current_char && this.current_char !== '\n') {
                this.advance();
            }
        } else if (this.current_char === '/' && this.peek() === '*') {
            // Multi-line comment
            this.advance(); // Skip '/'
            this.advance(); // Skip '*'
            
            while (this.current_char) {
                if (this.current_char === '*' && this.peek() === '/') {
                    this.advance(); // Skip '*'
                    this.advance(); // Skip '/'
                    break;
                }
                this.advance();
            }
        }
    }
    
    readNumber() {
        const start_line = this.line;
        const start_column = this.column;
        let number = '';
        let has_dot = false;
        
        while (this.current_char && (/\d/.test(this.current_char) || this.current_char === '.')) {
            if (this.current_char === '.') {
                if (has_dot) break; // Second dot, stop
                has_dot = true;
            }
            number += this.current_char;
            this.advance();
        }
        
        return new Token(TokenType.NUMBER, has_dot ? parseFloat(number) : parseInt(number), start_line, start_column);
    }
    
    readString() {
        const start_line = this.line;
        const start_column = this.column;
        const quote_char = this.current_char;
        let string = '';
        
        this.advance(); // Skip opening quote
        
        while (this.current_char && this.current_char !== quote_char) {
            if (this.current_char === '\\') {
                this.advance();
                if (this.current_char) {
                    // Handle escape sequences
                    switch (this.current_char) {
                        case 'n': string += '\n'; break;
                        case 't': string += '\t'; break;
                        case 'r': string += '\r'; break;
                        case '\\': string += '\\'; break;
                        case '"': string += '"'; break;
                        case "'": string += "'"; break;
                        default: string += this.current_char; break;
                    }
                    this.advance();
                }
            } else {
                string += this.current_char;
                this.advance();
            }
        }
        
        if (this.current_char === quote_char) {
            this.advance(); // Skip closing quote
        }
        
        return new Token(TokenType.STRING, string, start_line, start_column);
    }
    
    readIdentifier() {
        const start_line = this.line;
        const start_column = this.column;
        let identifier = '';
        
        while (this.current_char && (/[a-zA-Z_]/.test(this.current_char) || /\d/.test(this.current_char))) {
            identifier += this.current_char;
            this.advance();
        }
        
        const token_type = this.keywords[identifier] || TokenType.IDENTIFIER;
        return new Token(token_type, identifier, start_line, start_column);
    }
    
    getNextToken() {
        while (this.current_char) {
            const start_line = this.line;
            const start_column = this.column;
            
            // Skip whitespace
            if (/\s/.test(this.current_char) && this.current_char !== '\n') {
                this.skipWhitespace();
                continue;
            }
            
            // Handle newlines
            if (this.current_char === '\n') {
                this.advance();
                return new Token(TokenType.NEWLINE, '\n', start_line, start_column);
            }
            
            // Skip comments
            if (this.current_char === '/' && (this.peek() === '/' || this.peek() === '*')) {
                this.skipComment();
                continue;
            }
            
            // Numbers
            if (/\d/.test(this.current_char)) {
                return this.readNumber();
            }
            
            // Strings
            if (this.current_char === '"' || this.current_char === "'") {
                return this.readString();
            }
            
            // Identifiers and keywords
            if (/[a-zA-Z_]/.test(this.current_char)) {
                return this.readIdentifier();
            }
            
            // Two-character operators
            if (this.current_char === '=' && this.peek() === '=') {
                this.advance();
                this.advance();
                return new Token(TokenType.EQUALS, '==', start_line, start_column);
            }
            
            if (this.current_char === '!' && this.peek() === '=') {
                this.advance();
                this.advance();
                return new Token(TokenType.NOT_EQUALS, '!=', start_line, start_column);
            }
            
            if (this.current_char === '<' && this.peek() === '=') {
                this.advance();
                this.advance();
                return new Token(TokenType.LESS_EQUAL, '<=', start_line, start_column);
            }
            
            if (this.current_char === '>' && this.peek() === '=') {
                this.advance();
                this.advance();
                return new Token(TokenType.GREATER_EQUAL, '>=', start_line, start_column);
            }
            
            if (this.current_char === '&' && this.peek() === '&') {
                this.advance();
                this.advance();
                return new Token(TokenType.AND, '&&', start_line, start_column);
            }
            
            if (this.current_char === '|' && this.peek() === '|') {
                this.advance();
                this.advance();
                return new Token(TokenType.OR, '||', start_line, start_column);
            }
            
            // Single-character tokens
            const single_char_tokens = {
                '+': TokenType.PLUS,
                '-': TokenType.MINUS,
                '*': TokenType.MULTIPLY,
                '/': TokenType.DIVIDE,
                '%': TokenType.MODULO,
                '=': TokenType.ASSIGN,
                '<': TokenType.LESS_THAN,
                '>': TokenType.GREATER_THAN,
                '!': TokenType.NOT,
                ';': TokenType.SEMICOLON,
                ',': TokenType.COMMA,
                '(': TokenType.LEFT_PAREN,
                ')': TokenType.RIGHT_PAREN,
                '{': TokenType.LEFT_BRACE,
                '}': TokenType.RIGHT_BRACE,
                '[': TokenType.LEFT_BRACKET,
                ']': TokenType.RIGHT_BRACKET
            };
            
            if (single_char_tokens[this.current_char]) {
                const char = this.current_char;
                this.advance();
                return new Token(single_char_tokens[char], char, start_line, start_column);
            }
            
            // Unknown character
            throw new Error(`Unexpected character '${this.current_char}' at ${this.line}:${this.column}`);
        }
        
        return new Token(TokenType.EOF, null, this.line, this.column);
    }
    
    tokenize() {
        const tokens = [];
        let token = this.getNextToken();
        
        while (token.type !== TokenType.EOF) {
            // Skip newlines and whitespace tokens for easier parsing
            if (token.type !== TokenType.NEWLINE && token.type !== TokenType.WHITESPACE) {
                tokens.push(token);
            }
            token = this.getNextToken();
        }
        
        tokens.push(token); // Add EOF token
        return tokens;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WigLangLexer, Token, TokenType };
} else {
    window.WigLangLexer = WigLangLexer;
    window.Token = Token;
    window.TokenType = TokenType;
}