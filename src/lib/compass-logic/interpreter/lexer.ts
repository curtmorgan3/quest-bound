export enum TokenType {
  // Literals
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  BOOLEAN = 'BOOLEAN',

  // Identifiers
  IDENTIFIER = 'IDENTIFIER',

  // Keywords
  IF = 'IF',
  ELSE = 'ELSE',
  FOR = 'FOR',
  IN = 'IN',
  RETURN = 'RETURN',
  SUBSCRIBE = 'SUBSCRIBE',
  SELF = 'SELF',

  // Operators
  PLUS = 'PLUS', // +
  MINUS = 'MINUS', // -
  MULTIPLY = 'MULTIPLY', // *
  DIVIDE = 'DIVIDE', // /
  POWER = 'POWER', // **
  MODULO = 'MODULO', // %

  // Comparison
  EQUAL = 'EQUAL', // ==
  NOT_EQUAL = 'NOT_EQUAL', // !=
  GREATER = 'GREATER', // >
  LESS = 'LESS', // <
  GREATER_EQ = 'GREATER_EQ', // >=
  LESS_EQ = 'LESS_EQ', // <=

  // Boolean
  AND = 'AND', // &&
  OR = 'OR', // ||
  NOT = 'NOT', // !

  // Assignment
  ASSIGN = 'ASSIGN', // =

  // Delimiters
  LPAREN = 'LPAREN', // (
  RPAREN = 'RPAREN', // )
  LBRACKET = 'LBRACKET', // [
  RBRACKET = 'RBRACKET', // ]
  COMMA = 'COMMA', // ,
  COLON = 'COLON', // :
  DOT = 'DOT', // .

  // Special
  NEWLINE = 'NEWLINE',
  INDENT = 'INDENT',
  DEDENT = 'DEDENT',
  EOF = 'EOF',
  COMMENT = 'COMMENT',
}

export interface Token {
  type: TokenType;
  value: any;
  line: number;
  column: number;
}

const KEYWORDS: Record<string, TokenType> = {
  if: TokenType.IF,
  else: TokenType.ELSE,
  for: TokenType.FOR,
  in: TokenType.IN,
  return: TokenType.RETURN,
  subscribe: TokenType.SUBSCRIBE,
  Self: TokenType.SELF,
  true: TokenType.BOOLEAN,
  false: TokenType.BOOLEAN,
};

export class Lexer {
  private source: string;
  private position: number;
  private line: number;
  private column: number;
  private indentStack: number[];

  constructor(source: string) {
    this.source = source;
    this.position = 0;
    this.line = 1;
    this.column = 1;
    this.indentStack = [0];
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];
    let atLineStart = true;

    while (!this.isAtEnd()) {
      // Handle indentation at the start of lines
      if (atLineStart && !this.isAtEnd()) {
        const indentTokens = this.handleIndentation();
        tokens.push(...indentTokens);
        atLineStart = false;
      }

      // Skip whitespace (but not newlines)
      this.skipWhitespaceExceptNewline();

      if (this.isAtEnd()) break;

      // Check for newline
      if (this.peek() === '\n') {
        tokens.push(this.makeToken(TokenType.NEWLINE, null));
        this.advance();
        atLineStart = true;
        continue;
      }

      const token = this.nextToken();
      if (token.type !== TokenType.COMMENT) {
        tokens.push(token);
      }
    }

    // Add remaining DEDENT tokens at end of file
    while (this.indentStack.length > 1) {
      this.indentStack.pop();
      tokens.push(this.makeToken(TokenType.DEDENT, null));
    }

    tokens.push(this.makeToken(TokenType.EOF, null));
    return tokens;
  }

  private nextToken(): Token {
    const char = this.peek();

    // Comments
    if (char === '/' && this.peekNext() === '/') {
      return this.scanComment();
    }

    if (char === '/' && this.peekNext() === '*') {
      return this.scanMultilineComment();
    }

    // Numbers
    if (this.isDigit(char)) {
      return this.scanNumber();
    }

    // Strings
    if (char === "'" || char === '"') {
      return this.scanString();
    }

    // Identifiers and keywords
    if (this.isAlpha(char) || char === '_') {
      return this.scanIdentifier();
    }

    // Two-character operators
    if (char === '*' && this.peekNext() === '*') {
      const token = this.makeToken(TokenType.POWER, '**');
      this.advance();
      this.advance();
      return token;
    }

    if (char === '=' && this.peekNext() === '=') {
      const token = this.makeToken(TokenType.EQUAL, '==');
      this.advance();
      this.advance();
      return token;
    }

    if (char === '!' && this.peekNext() === '=') {
      const token = this.makeToken(TokenType.NOT_EQUAL, '!=');
      this.advance();
      this.advance();
      return token;
    }

    if (char === '>' && this.peekNext() === '=') {
      const token = this.makeToken(TokenType.GREATER_EQ, '>=');
      this.advance();
      this.advance();
      return token;
    }

    if (char === '<' && this.peekNext() === '=') {
      const token = this.makeToken(TokenType.LESS_EQ, '<=');
      this.advance();
      this.advance();
      return token;
    }

    if (char === '&' && this.peekNext() === '&') {
      const token = this.makeToken(TokenType.AND, '&&');
      this.advance();
      this.advance();
      return token;
    }

    if (char === '|' && this.peekNext() === '|') {
      const token = this.makeToken(TokenType.OR, '||');
      this.advance();
      this.advance();
      return token;
    }

    // Single-character operators and delimiters
    const singleCharTokens: Record<string, TokenType> = {
      '+': TokenType.PLUS,
      '-': TokenType.MINUS,
      '*': TokenType.MULTIPLY,
      '/': TokenType.DIVIDE,
      '%': TokenType.MODULO,
      '=': TokenType.ASSIGN,
      '>': TokenType.GREATER,
      '<': TokenType.LESS,
      '!': TokenType.NOT,
      '(': TokenType.LPAREN,
      ')': TokenType.RPAREN,
      '[': TokenType.LBRACKET,
      ']': TokenType.RBRACKET,
      ',': TokenType.COMMA,
      ':': TokenType.COLON,
      '.': TokenType.DOT,
    };

    if (char in singleCharTokens) {
      const token = this.makeToken(singleCharTokens[char], char);
      this.advance();
      return token;
    }

    throw new Error(`Unexpected character '${char}' at line ${this.line}, column ${this.column}`);
  }

  private handleIndentation(): Token[] {
    const tokens: Token[] = [];
    let indentLevel = 0;

    // Count spaces at the start of the line
    while (this.peek() === ' ') {
      indentLevel++;
      this.advance();
    }

    // Skip empty lines and comment lines
    if (this.peek() === '\n' || (this.peek() === '/' && this.peekNext() === '/')) {
      return tokens;
    }

    // Check if indentation is a multiple of 4
    if (indentLevel % 4 !== 0) {
      throw new Error(`Invalid indentation at line ${this.line}: expected multiple of 4 spaces, got ${indentLevel}`);
    }

    const currentIndent = this.indentStack[this.indentStack.length - 1];

    if (indentLevel > currentIndent) {
      // Indent
      this.indentStack.push(indentLevel);
      tokens.push(this.makeToken(TokenType.INDENT, null));
    } else if (indentLevel < currentIndent) {
      // Dedent (possibly multiple levels)
      while (this.indentStack.length > 1 && this.indentStack[this.indentStack.length - 1] > indentLevel) {
        this.indentStack.pop();
        tokens.push(this.makeToken(TokenType.DEDENT, null));
      }

      // Check if we landed on a valid indentation level
      if (this.indentStack[this.indentStack.length - 1] !== indentLevel) {
        throw new Error(`Invalid dedentation at line ${this.line}: indentation does not match any outer level`);
      }
    }

    return tokens;
  }

  private scanNumber(): Token {
    const startLine = this.line;
    const startColumn = this.column;
    let numStr = '';

    while (this.isDigit(this.peek())) {
      numStr += this.peek();
      this.advance();
    }

    // Check for decimal point
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      numStr += this.peek();
      this.advance();

      while (this.isDigit(this.peek())) {
        numStr += this.peek();
        this.advance();
      }
    }

    return {
      type: TokenType.NUMBER,
      value: parseFloat(numStr),
      line: startLine,
      column: startColumn,
    };
  }

  private scanString(): Token {
    const startLine = this.line;
    const startColumn = this.column;
    const quote = this.peek();
    this.advance(); // Skip opening quote

    let str = '';

    while (!this.isAtEnd() && this.peek() !== quote) {
      if (this.peek() === '\\' && this.peekNext() === quote) {
        // Escaped quote
        this.advance();
        str += this.peek();
        this.advance();
      } else if (this.peek() === '\\' && this.peekNext() === 'n') {
        // Newline escape
        this.advance();
        this.advance();
        str += '\n';
      } else if (this.peek() === '\\' && this.peekNext() === 't') {
        // Tab escape
        this.advance();
        this.advance();
        str += '\t';
      } else if (this.peek() === '\\' && this.peekNext() === '\\') {
        // Backslash escape
        this.advance();
        this.advance();
        str += '\\';
      } else {
        str += this.peek();
        this.advance();
      }
    }

    if (this.isAtEnd()) {
      throw new Error(`Unterminated string at line ${startLine}, column ${startColumn}`);
    }

    this.advance(); // Skip closing quote

    return {
      type: TokenType.STRING,
      value: str,
      line: startLine,
      column: startColumn,
    };
  }

  private scanIdentifier(): Token {
    const startLine = this.line;
    const startColumn = this.column;
    let identifier = '';

    while (this.isAlphaNumeric(this.peek()) || this.peek() === '_') {
      identifier += this.peek();
      this.advance();
    }

    // Check if it's a keyword
    const keyword = KEYWORDS[identifier];
    if (keyword !== undefined) {
      const value = keyword === TokenType.BOOLEAN ? identifier === 'true' : identifier;
      return {
        type: keyword,
        value,
        line: startLine,
        column: startColumn,
      };
    }

    return {
      type: TokenType.IDENTIFIER,
      value: identifier,
      line: startLine,
      column: startColumn,
    };
  }

  private scanComment(): Token {
    const startLine = this.line;
    const startColumn = this.column;

    // Skip //
    this.advance();
    this.advance();

    // Read until end of line
    let comment = '';
    while (!this.isAtEnd() && this.peek() !== '\n') {
      comment += this.peek();
      this.advance();
    }

    return {
      type: TokenType.COMMENT,
      value: comment.trim(),
      line: startLine,
      column: startColumn,
    };
  }

  private scanMultilineComment(): Token {
    const startLine = this.line;
    const startColumn = this.column;

    // Skip /*
    this.advance();
    this.advance();

    let comment = '';
    while (!this.isAtEnd()) {
      if (this.peek() === '*' && this.peekNext() === '/') {
        this.advance(); // Skip *
        this.advance(); // Skip /
        break;
      }
      comment += this.peek();
      this.advance();
    }

    return {
      type: TokenType.COMMENT,
      value: comment.trim(),
      line: startLine,
      column: startColumn,
    };
  }

  private makeToken(type: TokenType, value: any): Token {
    return {
      type,
      value,
      line: this.line,
      column: this.column,
    };
  }

  private peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.source[this.position];
  }

  private peekNext(): string {
    if (this.position + 1 >= this.source.length) return '\0';
    return this.source[this.position + 1];
  }

  private advance(): void {
    if (this.isAtEnd()) return;

    if (this.source[this.position] === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }

    this.position++;
  }

  private skipWhitespaceExceptNewline(): void {
    while (!this.isAtEnd() && (this.peek() === ' ' || this.peek() === '\t' || this.peek() === '\r')) {
      this.advance();
    }
  }

  private isAtEnd(): boolean {
    return this.position >= this.source.length;
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }
}
