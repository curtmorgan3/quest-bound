import type { Token } from './lexer';
import { TokenType } from './lexer';
import type {
  ASTNode,
  Program,
  FunctionDef,
  IfStatement,
  ForLoop,
  ReturnStatement,
  SubscribeCall,
  Assignment,
  BinaryOp,
  UnaryOp,
  FunctionCall,
  MemberAccess,
  ArrayAccess,
  ArrayLiteral,
  Identifier,
  NumberLiteral,
  StringLiteral,
  BooleanLiteral,
} from './ast';

export class ParseError extends Error {
  constructor(
    message: string,
    public line: number,
    public column: number,
  ) {
    super(`${message} at line ${line}, column ${column}`);
    this.name = 'ParseError';
  }
}

export class Parser {
  private tokens: Token[];
  private current: number;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.current = 0;
  }

  parse(): Program {
    const statements: ASTNode[] = [];

    // Skip leading newlines
    this.skipNewlines();

    while (!this.isAtEnd()) {
      statements.push(this.statement());
      this.skipNewlines();
    }

    return { type: 'Program', statements };
  }

  private statement(): ASTNode {
    // Skip any newlines before statement
    this.skipNewlines();

    // Return statement
    if (this.match(TokenType.RETURN)) {
      return this.returnStatement();
    }

    // Subscribe call
    if (this.match(TokenType.SUBSCRIBE)) {
      return this.subscribeCall();
    }

    // If statement
    if (this.match(TokenType.IF)) {
      return this.ifStatement();
    }

    // For loop
    if (this.match(TokenType.FOR)) {
      return this.forLoop();
    }

    // Check for function definition (identifier followed by parentheses and colon)
    if (this.check(TokenType.IDENTIFIER)) {
      const checkpoint = this.current;
      this.advance(); // skip identifier

      if (this.check(TokenType.LPAREN)) {
        // Look ahead to see if this is a function definition
        this.advance(); // skip (

        // Skip parameters
        while (!this.check(TokenType.RPAREN) && !this.isAtEnd()) {
          this.advance();
        }

        if (this.check(TokenType.RPAREN)) {
          this.advance(); // skip )
          if (this.check(TokenType.COLON)) {
            // It's a function definition
            this.current = checkpoint;
            return this.functionDef();
          }
        }

        // Not a function definition, restore and parse as expression
        this.current = checkpoint;
      } else {
        // Restore position
        this.current = checkpoint;
      }
    }

    // Expression statement (assignment or function call)
    return this.expressionStatement();
  }

  private returnStatement(): ReturnStatement {
    // 'return' already consumed

    // Check if there's a value to return (before skipping newlines)
    if (this.check(TokenType.NEWLINE) || this.check(TokenType.EOF) || this.check(TokenType.DEDENT)) {
      return { type: 'ReturnStatement', value: null };
    }

    const value = this.expression();
    return { type: 'ReturnStatement', value };
  }

  private subscribeCall(): SubscribeCall {
    // 'subscribe' already consumed
    this.consume(TokenType.LPAREN, "Expected '(' after 'subscribe'");

    const args: ASTNode[] = [];

    if (!this.check(TokenType.RPAREN)) {
      do {
        args.push(this.expression());
      } while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RPAREN, "Expected ')' after subscribe arguments");

    return { type: 'SubscribeCall', arguments: args };
  }

  private ifStatement(): IfStatement {
    // 'if' already consumed
    const condition = this.expression();
    this.consume(TokenType.COLON, "Expected ':' after if condition");
    this.consume(TokenType.NEWLINE, "Expected newline after ':'");
    this.consume(TokenType.INDENT, 'Expected indent after if statement');

    const thenBlock = this.block();

    const elseIfBlocks: { condition: ASTNode; block: ASTNode[] }[] = [];
    let elseBlock: ASTNode[] | null = null;

    // Handle else if and else
    while (this.match(TokenType.ELSE)) {
      if (this.match(TokenType.IF)) {
        // else if
        const elseIfCondition = this.expression();
        this.consume(TokenType.COLON, "Expected ':' after else if condition");
        this.consume(TokenType.NEWLINE, "Expected newline after ':'");
        this.consume(TokenType.INDENT, 'Expected indent after else if statement');
        const elseIfBlock = this.block();
        elseIfBlocks.push({ condition: elseIfCondition, block: elseIfBlock });
      } else {
        // else
        this.consume(TokenType.COLON, "Expected ':' after else");
        this.consume(TokenType.NEWLINE, "Expected newline after ':'");
        this.consume(TokenType.INDENT, 'Expected indent after else statement');
        elseBlock = this.block();
        break; // else must be last
      }
    }

    return {
      type: 'IfStatement',
      condition,
      thenBlock,
      elseIfBlocks,
      elseBlock,
    };
  }

  private forLoop(): ForLoop {
    // 'for' already consumed
    const varToken = this.consume(TokenType.IDENTIFIER, 'Expected variable name after for');
    const variable = varToken.value;

    this.consume(TokenType.IN, "Expected 'in' after for variable");

    const iterable = this.expression();

    this.consume(TokenType.COLON, "Expected ':' after for iterable");
    this.consume(TokenType.NEWLINE, "Expected newline after ':'");
    this.consume(TokenType.INDENT, 'Expected indent after for statement');

    const body = this.block();

    return {
      type: 'ForLoop',
      variable,
      iterable,
      body,
    };
  }

  private functionDef(): FunctionDef {
    const nameToken = this.consume(TokenType.IDENTIFIER, 'Expected function name');
    const name = nameToken.value;

    this.consume(TokenType.LPAREN, "Expected '(' after function name");

    const params: string[] = [];
    if (!this.check(TokenType.RPAREN)) {
      do {
        const paramToken = this.consume(TokenType.IDENTIFIER, 'Expected parameter name');
        params.push(paramToken.value);
      } while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RPAREN, "Expected ')' after parameters");
    this.consume(TokenType.COLON, "Expected ':' after function signature");
    this.consume(TokenType.NEWLINE, "Expected newline after ':'");
    this.consume(TokenType.INDENT, 'Expected indent after function definition');

    const body = this.block();

    return {
      type: 'FunctionDef',
      name,
      params,
      body,
    };
  }

  private block(): ASTNode[] {
    const statements: ASTNode[] = [];

    this.skipNewlines();

    while (!this.check(TokenType.DEDENT) && !this.isAtEnd()) {
      statements.push(this.statement());
      this.skipNewlines();
    }

    this.consume(TokenType.DEDENT, 'Expected dedent after block');

    return statements;
  }

  private expressionStatement(): ASTNode {
    const expr = this.expression();

    // Check if it's an assignment
    if (this.match(TokenType.ASSIGN)) {
      if (expr.type !== 'Identifier') {
        throw this.error('Invalid assignment target');
      }
      const value = this.expression();
      return {
        type: 'Assignment',
        name: (expr as Identifier).name,
        value,
      } as Assignment;
    }

    return expr;
  }

  private expression(): ASTNode {
    return this.logicalOr();
  }

  private logicalOr(): ASTNode {
    let left = this.logicalAnd();

    while (this.match(TokenType.OR)) {
      const operator = '||';
      const right = this.logicalAnd();
      left = { type: 'BinaryOp', operator, left, right } as BinaryOp;
    }

    return left;
  }

  private logicalAnd(): ASTNode {
    let left = this.equality();

    while (this.match(TokenType.AND)) {
      const operator = '&&';
      const right = this.equality();
      left = { type: 'BinaryOp', operator, left, right } as BinaryOp;
    }

    return left;
  }

  private equality(): ASTNode {
    let left = this.comparison();

    while (this.match(TokenType.EQUAL, TokenType.NOT_EQUAL)) {
      const operator = this.previous().value;
      const right = this.comparison();
      left = { type: 'BinaryOp', operator, left, right } as BinaryOp;
    }

    return left;
  }

  private comparison(): ASTNode {
    let left = this.addition();

    while (this.match(TokenType.GREATER, TokenType.GREATER_EQ, TokenType.LESS, TokenType.LESS_EQ)) {
      const operator = this.previous().value;
      const right = this.addition();
      left = { type: 'BinaryOp', operator, left, right } as BinaryOp;
    }

    return left;
  }

  private addition(): ASTNode {
    let left = this.multiplication();

    while (this.match(TokenType.PLUS, TokenType.MINUS)) {
      const operator = this.previous().value;
      const right = this.multiplication();
      left = { type: 'BinaryOp', operator, left, right } as BinaryOp;
    }

    return left;
  }

  private multiplication(): ASTNode {
    let left = this.power();

    while (this.match(TokenType.MULTIPLY, TokenType.DIVIDE, TokenType.MODULO)) {
      const operator = this.previous().value;
      const right = this.power();
      left = { type: 'BinaryOp', operator, left, right } as BinaryOp;
    }

    return left;
  }

  private power(): ASTNode {
    let left = this.unary();

    while (this.match(TokenType.POWER)) {
      const operator = '**';
      const right = this.unary();
      left = { type: 'BinaryOp', operator, left, right } as BinaryOp;
    }

    return left;
  }

  private unary(): ASTNode {
    if (this.match(TokenType.NOT, TokenType.MINUS)) {
      const operator = this.previous().value === '!' ? '!' : '-';
      const operand = this.unary();
      return { type: 'UnaryOp', operator, operand } as UnaryOp;
    }

    return this.postfix();
  }

  private postfix(): ASTNode {
    let expr = this.primary();

    while (true) {
      if (this.match(TokenType.DOT)) {
        // Member access
        const propertyToken = this.consume(TokenType.IDENTIFIER, 'Expected property name after "."');
        expr = {
          type: 'MemberAccess',
          object: expr,
          property: propertyToken.value,
        } as MemberAccess;
      } else if (this.match(TokenType.LBRACKET)) {
        // Array access
        const index = this.expression();
        this.consume(TokenType.RBRACKET, "Expected ']' after array index");
        expr = {
          type: 'ArrayAccess',
          object: expr,
          index,
        } as ArrayAccess;
      } else if (this.check(TokenType.LPAREN) && expr.type === 'Identifier') {
        // Function call
        this.advance(); // consume (
        const args: ASTNode[] = [];

        if (!this.check(TokenType.RPAREN)) {
          do {
            args.push(this.expression());
          } while (this.match(TokenType.COMMA));
        }

        this.consume(TokenType.RPAREN, "Expected ')' after function arguments");

        expr = {
          type: 'FunctionCall',
          name: (expr as Identifier).name,
          arguments: args,
        } as FunctionCall;
      } else if (this.check(TokenType.LPAREN) && expr.type === 'MemberAccess') {
        // Method call (member access followed by parentheses)
        this.advance(); // consume (
        const args: ASTNode[] = [];

        if (!this.check(TokenType.RPAREN)) {
          do {
            args.push(this.expression());
          } while (this.match(TokenType.COMMA));
        }

        this.consume(TokenType.RPAREN, "Expected ')' after method arguments");

        // Convert MemberAccess to FunctionCall with dotted name
        const memberAccess = expr as MemberAccess;
        let fullName = '';

        // Build the full method name (e.g., "Owner.Attribute")
        if (memberAccess.object.type === 'Identifier') {
          fullName = `${(memberAccess.object as Identifier).name}.${memberAccess.property}`;
        } else {
          // For nested member access, we need to handle it recursively
          fullName = this.buildMemberPath(memberAccess);
        }

        expr = {
          type: 'FunctionCall',
          name: fullName,
          arguments: args,
        } as FunctionCall;
      } else {
        break;
      }
    }

    return expr;
  }

  private buildMemberPath(node: ASTNode): string {
    if (node.type === 'Identifier') {
      return (node as Identifier).name;
    } else if (node.type === 'MemberAccess') {
      const memberAccess = node as MemberAccess;
      return `${this.buildMemberPath(memberAccess.object)}.${memberAccess.property}`;
    } else if (node.type === 'FunctionCall') {
      // Handle chained method calls like Owner.Attribute("HP").add(10)
      const funcCall = node as FunctionCall;
      return funcCall.name;
    }
    throw this.error('Invalid member access');
  }

  private primary(): ASTNode {
    // Boolean literals
    if (this.match(TokenType.BOOLEAN)) {
      return { type: 'BooleanLiteral', value: this.previous().value } as BooleanLiteral;
    }

    // Number literals
    if (this.match(TokenType.NUMBER)) {
      return { type: 'NumberLiteral', value: this.previous().value } as NumberLiteral;
    }

    // String literals
    if (this.match(TokenType.STRING)) {
      return { type: 'StringLiteral', value: this.previous().value } as StringLiteral;
    }

    // Identifiers
    if (this.match(TokenType.IDENTIFIER)) {
      return { type: 'Identifier', name: this.previous().value } as Identifier;
    }

    // Array literals
    if (this.match(TokenType.LBRACKET)) {
      const elements: ASTNode[] = [];

      if (!this.check(TokenType.RBRACKET)) {
        do {
          elements.push(this.expression());
        } while (this.match(TokenType.COMMA));
      }

      this.consume(TokenType.RBRACKET, "Expected ']' after array elements");
      return { type: 'ArrayLiteral', elements } as ArrayLiteral;
    }

    // Parenthesized expressions
    if (this.match(TokenType.LPAREN)) {
      const expr = this.expression();
      this.consume(TokenType.RPAREN, "Expected ')' after expression");
      return expr;
    }

    throw this.error('Expected expression');
  }

  // Helper methods

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();

    throw this.error(message);
  }

  private skipNewlines(): void {
    while (this.match(TokenType.NEWLINE)) {
      // Skip newlines
    }
  }

  private error(message: string): ParseError {
    const token = this.peek();
    return new ParseError(message, token.line, token.column);
  }
}
