import { describe, it, expect } from 'vitest';
import { Lexer, TokenType } from '@/lib/compass-logic/interpreter/lexer';

describe('Lexer', () => {
  describe('Numbers', () => {
    it('should tokenize integer', () => {
      const lexer = new Lexer('42');
      const tokens = lexer.tokenize();
      expect(tokens).toHaveLength(2); // NUMBER + EOF
      expect(tokens[0]).toMatchObject({
        type: TokenType.NUMBER,
        value: 42,
        line: 1,
        column: 1,
      });
    });

    it('should tokenize decimal number', () => {
      const lexer = new Lexer('3.14');
      const tokens = lexer.tokenize();
      expect(tokens[0]).toMatchObject({
        type: TokenType.NUMBER,
        value: 3.14,
      });
    });

    it('should tokenize zero', () => {
      const lexer = new Lexer('0');
      const tokens = lexer.tokenize();
      expect(tokens[0]).toMatchObject({
        type: TokenType.NUMBER,
        value: 0,
      });
    });

    it('should tokenize multiple numbers', () => {
      const lexer = new Lexer('1 2 3');
      const tokens = lexer.tokenize();
      expect(tokens[0].value).toBe(1);
      expect(tokens[1].value).toBe(2);
      expect(tokens[2].value).toBe(3);
    });
  });

  describe('Strings', () => {
    it('should tokenize single-quoted string', () => {
      const lexer = new Lexer("'hello'");
      const tokens = lexer.tokenize();
      expect(tokens[0]).toMatchObject({
        type: TokenType.STRING,
        value: 'hello',
      });
    });

    it('should tokenize double-quoted string', () => {
      const lexer = new Lexer('"world"');
      const tokens = lexer.tokenize();
      expect(tokens[0]).toMatchObject({
        type: TokenType.STRING,
        value: 'world',
      });
    });

    it('should tokenize empty string', () => {
      const lexer = new Lexer('""');
      const tokens = lexer.tokenize();
      expect(tokens[0]).toMatchObject({
        type: TokenType.STRING,
        value: '',
      });
    });

    it('should tokenize string with spaces', () => {
      const lexer = new Lexer('"hello world"');
      const tokens = lexer.tokenize();
      expect(tokens[0].value).toBe('hello world');
    });

    it('should tokenize string with interpolation syntax', () => {
      const lexer = new Lexer('"HP: {{hp}}"');
      const tokens = lexer.tokenize();
      expect(tokens[0].value).toBe('HP: {{hp}}');
    });

    it('should handle escaped quotes in single-quoted string', () => {
      const lexer = new Lexer("'it\\'s'");
      const tokens = lexer.tokenize();
      expect(tokens[0].value).toBe("it's");
    });

    it('should handle escaped quotes in double-quoted string', () => {
      const lexer = new Lexer('"say \\"hello\\""');
      const tokens = lexer.tokenize();
      expect(tokens[0].value).toBe('say "hello"');
    });

    it('should handle newline escape', () => {
      const lexer = new Lexer('"line1\\nline2"');
      const tokens = lexer.tokenize();
      expect(tokens[0].value).toBe('line1\nline2');
    });

    it('should handle tab escape', () => {
      const lexer = new Lexer('"tab\\there"');
      const tokens = lexer.tokenize();
      expect(tokens[0].value).toBe('tab\there');
    });

    it('should handle backslash escape', () => {
      const lexer = new Lexer('"path\\\\file"');
      const tokens = lexer.tokenize();
      expect(tokens[0].value).toBe('path\\file');
    });

    it('should throw error on unterminated string', () => {
      const lexer = new Lexer('"unterminated');
      expect(() => lexer.tokenize()).toThrow('Unterminated string');
    });
  });

  describe('Booleans', () => {
    it('should tokenize true', () => {
      const lexer = new Lexer('true');
      const tokens = lexer.tokenize();
      expect(tokens[0]).toMatchObject({
        type: TokenType.BOOLEAN,
        value: true,
      });
    });

    it('should tokenize false', () => {
      const lexer = new Lexer('false');
      const tokens = lexer.tokenize();
      expect(tokens[0]).toMatchObject({
        type: TokenType.BOOLEAN,
        value: false,
      });
    });
  });

  describe('Identifiers', () => {
    it('should tokenize simple identifier', () => {
      const lexer = new Lexer('variable');
      const tokens = lexer.tokenize();
      expect(tokens[0]).toMatchObject({
        type: TokenType.IDENTIFIER,
        value: 'variable',
      });
    });

    it('should tokenize identifier with underscore', () => {
      const lexer = new Lexer('my_variable');
      const tokens = lexer.tokenize();
      expect(tokens[0]).toMatchObject({
        type: TokenType.IDENTIFIER,
        value: 'my_variable',
      });
    });

    it('should tokenize identifier starting with underscore', () => {
      const lexer = new Lexer('_private');
      const tokens = lexer.tokenize();
      expect(tokens[0]).toMatchObject({
        type: TokenType.IDENTIFIER,
        value: '_private',
      });
    });

    it('should tokenize identifier with numbers', () => {
      const lexer = new Lexer('var123');
      const tokens = lexer.tokenize();
      expect(tokens[0]).toMatchObject({
        type: TokenType.IDENTIFIER,
        value: 'var123',
      });
    });

    it('should tokenize camelCase identifier', () => {
      const lexer = new Lexer('myVariable');
      const tokens = lexer.tokenize();
      expect(tokens[0].value).toBe('myVariable');
    });

    it('should tokenize PascalCase identifier', () => {
      const lexer = new Lexer('MyClass');
      const tokens = lexer.tokenize();
      expect(tokens[0].value).toBe('MyClass');
    });
  });

  describe('Keywords', () => {
    it('should tokenize if keyword', () => {
      const lexer = new Lexer('if');
      const tokens = lexer.tokenize();
      expect(tokens[0]).toMatchObject({
        type: TokenType.IF,
        value: 'if',
      });
    });

    it('should tokenize else keyword', () => {
      const lexer = new Lexer('else');
      const tokens = lexer.tokenize();
      expect(tokens[0]).toMatchObject({
        type: TokenType.ELSE,
        value: 'else',
      });
    });

    it('should tokenize for keyword', () => {
      const lexer = new Lexer('for');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.FOR);
    });

    it('should tokenize in keyword', () => {
      const lexer = new Lexer('in');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.IN);
    });

    it('should tokenize return keyword', () => {
      const lexer = new Lexer('return');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.RETURN);
    });

    it('should tokenize subscribe keyword', () => {
      const lexer = new Lexer('subscribe');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.SUBSCRIBE);
    });
  });

  describe('Operators', () => {
    it('should tokenize arithmetic operators', () => {
      const lexer = new Lexer('+ - * / %');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.PLUS);
      expect(tokens[1].type).toBe(TokenType.MINUS);
      expect(tokens[2].type).toBe(TokenType.MULTIPLY);
      expect(tokens[3].type).toBe(TokenType.DIVIDE);
      expect(tokens[4].type).toBe(TokenType.MODULO);
    });

    it('should tokenize power operator', () => {
      const lexer = new Lexer('**');
      const tokens = lexer.tokenize();
      expect(tokens[0]).toMatchObject({
        type: TokenType.POWER,
        value: '**',
      });
    });

    it('should distinguish multiply and power', () => {
      const lexer = new Lexer('2 * 3 ** 4');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[1].type).toBe(TokenType.MULTIPLY);
      expect(tokens[2].type).toBe(TokenType.NUMBER);
      expect(tokens[3].type).toBe(TokenType.POWER);
      expect(tokens[4].type).toBe(TokenType.NUMBER);
    });

    it('should tokenize comparison operators', () => {
      const lexer = new Lexer('== != > < >= <=');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.EQUAL);
      expect(tokens[1].type).toBe(TokenType.NOT_EQUAL);
      expect(tokens[2].type).toBe(TokenType.GREATER);
      expect(tokens[3].type).toBe(TokenType.LESS);
      expect(tokens[4].type).toBe(TokenType.GREATER_EQ);
      expect(tokens[5].type).toBe(TokenType.LESS_EQ);
    });

    it('should tokenize boolean operators', () => {
      const lexer = new Lexer('&& || !');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.AND);
      expect(tokens[1].type).toBe(TokenType.OR);
      expect(tokens[2].type).toBe(TokenType.NOT);
    });

    it('should tokenize assignment operator', () => {
      const lexer = new Lexer('=');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.ASSIGN);
    });

    it('should distinguish assignment from equality', () => {
      const lexer = new Lexer('x = 5 == 5');
      const tokens = lexer.tokenize();
      expect(tokens[1].type).toBe(TokenType.ASSIGN);
      expect(tokens[3].type).toBe(TokenType.EQUAL);
    });
  });

  describe('Delimiters', () => {
    it('should tokenize parentheses', () => {
      const lexer = new Lexer('()');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.LPAREN);
      expect(tokens[1].type).toBe(TokenType.RPAREN);
    });

    it('should tokenize brackets', () => {
      const lexer = new Lexer('[]');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.LBRACKET);
      expect(tokens[1].type).toBe(TokenType.RBRACKET);
    });

    it('should tokenize comma', () => {
      const lexer = new Lexer(',');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.COMMA);
    });

    it('should tokenize colon', () => {
      const lexer = new Lexer(':');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.COLON);
    });

    it('should tokenize dot', () => {
      const lexer = new Lexer('.');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.DOT);
    });
  });

  describe('Comments', () => {
    it('should skip single-line comment', () => {
      const lexer = new Lexer('// this is a comment\n42');
      const tokens = lexer.tokenize();
      // Should only have NEWLINE, NUMBER, EOF (comment is filtered out)
      expect(tokens[0].type).toBe(TokenType.NEWLINE);
      expect(tokens[1].type).toBe(TokenType.NUMBER);
      expect(tokens[1].value).toBe(42);
    });

    it('should skip multi-line comment', () => {
      const lexer = new Lexer('/* this is\na comment */\n42');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.NEWLINE);
      expect(tokens[1].type).toBe(TokenType.NUMBER);
      expect(tokens[1].value).toBe(42);
    });

    it('should handle comment at end of file', () => {
      const lexer = new Lexer('42 // comment');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[1].type).toBe(TokenType.EOF);
    });

    it('should handle multi-line comment with multiple lines', () => {
      const lexer = new Lexer('/*\nline 1\nline 2\nline 3\n*/\n42');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.NEWLINE);
      expect(tokens[1].type).toBe(TokenType.NUMBER);
    });
  });

  describe('Newlines', () => {
    it('should tokenize newline', () => {
      const lexer = new Lexer('1\n2');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[1].type).toBe(TokenType.NEWLINE);
      expect(tokens[2].type).toBe(TokenType.NUMBER);
    });

    it('should tokenize multiple newlines', () => {
      const lexer = new Lexer('1\n\n2');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[1].type).toBe(TokenType.NEWLINE);
      expect(tokens[2].type).toBe(TokenType.NEWLINE);
      expect(tokens[3].type).toBe(TokenType.NUMBER);
    });
  });

  describe('Indentation', () => {
    it('should tokenize indent', () => {
      const lexer = new Lexer('if true:\n    x = 1');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.IF);
      expect(tokens[1].type).toBe(TokenType.BOOLEAN);
      expect(tokens[2].type).toBe(TokenType.COLON);
      expect(tokens[3].type).toBe(TokenType.NEWLINE);
      expect(tokens[4].type).toBe(TokenType.INDENT);
      expect(tokens[5].type).toBe(TokenType.IDENTIFIER);
    });

    it('should tokenize dedent', () => {
      const lexer = new Lexer('if true:\n    x = 1\ny = 2');
      const tokens = lexer.tokenize();
      const dedentIndex = tokens.findIndex((t) => t.type === TokenType.DEDENT);
      expect(dedentIndex).toBeGreaterThan(-1);
      expect(tokens[dedentIndex].type).toBe(TokenType.DEDENT);
    });

    it('should tokenize multiple indent levels', () => {
      const lexer = new Lexer('if true:\n    if false:\n        x = 1');
      const tokens = lexer.tokenize();
      const indents = tokens.filter((t) => t.type === TokenType.INDENT);
      expect(indents).toHaveLength(2);
    });

    it('should tokenize multiple dedents', () => {
      const lexer = new Lexer('if true:\n    if false:\n        x = 1\ny = 2');
      const tokens = lexer.tokenize();
      const dedents = tokens.filter((t) => t.type === TokenType.DEDENT);
      expect(dedents).toHaveLength(2);
    });

    it('should add dedents at end of file', () => {
      const lexer = new Lexer('if true:\n    x = 1');
      const tokens = lexer.tokenize();
      const lastTokens = tokens.slice(-2);
      expect(lastTokens[0].type).toBe(TokenType.DEDENT);
      expect(lastTokens[1].type).toBe(TokenType.EOF);
    });

    it('should throw error on invalid indentation', () => {
      const lexer = new Lexer('if true:\n  x = 1'); // 2 spaces instead of 4
      expect(() => lexer.tokenize()).toThrow('Invalid indentation');
    });

    it('should throw error on mismatched dedentation', () => {
      const lexer = new Lexer('if true:\n    if false:\n        x = 1\n  y = 2'); // 2 spaces
      expect(() => lexer.tokenize()).toThrow('Invalid indentation');
    });

    it('should handle 8-space indent (2 levels)', () => {
      const lexer = new Lexer('if true:\n    if false:\n        x = 1');
      const tokens = lexer.tokenize();
      const indents = tokens.filter((t) => t.type === TokenType.INDENT);
      expect(indents).toHaveLength(2);
    });
  });

  describe('Line and Column Tracking', () => {
    it('should track line numbers', () => {
      const lexer = new Lexer('1\n2\n3');
      const tokens = lexer.tokenize();
      expect(tokens[0].line).toBe(1);
      expect(tokens[2].line).toBe(2);
      expect(tokens[4].line).toBe(3);
    });

    it('should track column numbers', () => {
      const lexer = new Lexer('abc def');
      const tokens = lexer.tokenize();
      expect(tokens[0].column).toBe(1);
      expect(tokens[1].column).toBe(5);
    });

    it('should reset column on newline', () => {
      const lexer = new Lexer('abc\ndef');
      const tokens = lexer.tokenize();
      expect(tokens[0].column).toBe(1);
      expect(tokens[2].column).toBe(1);
    });
  });

  describe('Complex Expressions', () => {
    it('should tokenize arithmetic expression', () => {
      const lexer = new Lexer('2 + 3 * 4');
      const tokens = lexer.tokenize();
      expect(tokens[0].value).toBe(2);
      expect(tokens[1].type).toBe(TokenType.PLUS);
      expect(tokens[2].value).toBe(3);
      expect(tokens[3].type).toBe(TokenType.MULTIPLY);
      expect(tokens[4].value).toBe(4);
    });

    it('should tokenize function call', () => {
      const lexer = new Lexer('roll("1d6")');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[0].value).toBe('roll');
      expect(tokens[1].type).toBe(TokenType.LPAREN);
      expect(tokens[2].type).toBe(TokenType.STRING);
      expect(tokens[2].value).toBe('1d6');
      expect(tokens[3].type).toBe(TokenType.RPAREN);
    });

    it('should tokenize member access', () => {
      const lexer = new Lexer('Owner.Attribute("HP")');
      const tokens = lexer.tokenize();
      expect(tokens[0].value).toBe('Owner');
      expect(tokens[1].type).toBe(TokenType.DOT);
      expect(tokens[2].value).toBe('Attribute');
      expect(tokens[3].type).toBe(TokenType.LPAREN);
      expect(tokens[4].value).toBe('HP');
      expect(tokens[5].type).toBe(TokenType.RPAREN);
    });

    it('should tokenize array access', () => {
      const lexer = new Lexer('items[0]');
      const tokens = lexer.tokenize();
      expect(tokens[0].value).toBe('items');
      expect(tokens[1].type).toBe(TokenType.LBRACKET);
      expect(tokens[2].value).toBe(0);
      expect(tokens[3].type).toBe(TokenType.RBRACKET);
    });

    it('should tokenize array literal', () => {
      const lexer = new Lexer('[1, 2, 3]');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe(TokenType.LBRACKET);
      expect(tokens[1].value).toBe(1);
      expect(tokens[2].type).toBe(TokenType.COMMA);
      expect(tokens[3].value).toBe(2);
      expect(tokens[4].type).toBe(TokenType.COMMA);
      expect(tokens[5].value).toBe(3);
      expect(tokens[6].type).toBe(TokenType.RBRACKET);
    });

    it('should tokenize assignment', () => {
      const lexer = new Lexer('x = 42');
      const tokens = lexer.tokenize();
      expect(tokens[0].value).toBe('x');
      expect(tokens[1].type).toBe(TokenType.ASSIGN);
      expect(tokens[2].value).toBe(42);
    });

    it('should tokenize comparison', () => {
      const lexer = new Lexer('x >= 10');
      const tokens = lexer.tokenize();
      expect(tokens[0].value).toBe('x');
      expect(tokens[1].type).toBe(TokenType.GREATER_EQ);
      expect(tokens[2].value).toBe(10);
    });

    it('should tokenize boolean expression', () => {
      const lexer = new Lexer('x > 5 && y < 10');
      const tokens = lexer.tokenize();
      expect(tokens[0].value).toBe('x');
      expect(tokens[1].type).toBe(TokenType.GREATER);
      expect(tokens[2].value).toBe(5);
      expect(tokens[3].type).toBe(TokenType.AND);
      expect(tokens[4].value).toBe('y');
      expect(tokens[5].type).toBe(TokenType.LESS);
      expect(tokens[6].value).toBe(10);
    });
  });

  describe('Real Script Examples', () => {
    it('should tokenize simple function definition', () => {
      const source = `calculateModifier(score):
    return (score - 10) / 2`;
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[0].value).toBe('calculateModifier');
      expect(tokens[1].type).toBe(TokenType.LPAREN);
      expect(tokens[2].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[2].value).toBe('score');
      expect(tokens[3].type).toBe(TokenType.RPAREN);
      expect(tokens[4].type).toBe(TokenType.COLON);
      expect(tokens[5].type).toBe(TokenType.NEWLINE);
      expect(tokens[6].type).toBe(TokenType.INDENT);
      expect(tokens[7].type).toBe(TokenType.RETURN);
    });

    it('should tokenize if statement', () => {
      const source = `if hp > 0:
    announce("Alive")
else:
    announce("Dead")`;
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.IF);
      expect(tokens[1].value).toBe('hp');
      expect(tokens[2].type).toBe(TokenType.GREATER);
      expect(tokens[3].value).toBe(0);
      expect(tokens[4].type).toBe(TokenType.COLON);
      expect(tokens[5].type).toBe(TokenType.NEWLINE);
      expect(tokens[6].type).toBe(TokenType.INDENT);
    });

    it('should tokenize for loop', () => {
      const source = `for i in 10:
    log(i)`;
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.FOR);
      expect(tokens[1].value).toBe('i');
      expect(tokens[2].type).toBe(TokenType.IN);
      expect(tokens[3].value).toBe(10);
      expect(tokens[4].type).toBe(TokenType.COLON);
    });

    it('should tokenize subscribe call', () => {
      const source = `subscribe("HP", "Level")`;
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe(TokenType.SUBSCRIBE);
      expect(tokens[1].type).toBe(TokenType.LPAREN);
      expect(tokens[2].value).toBe('HP');
      expect(tokens[3].type).toBe(TokenType.COMMA);
      expect(tokens[4].value).toBe('Level');
      expect(tokens[5].type).toBe(TokenType.RPAREN);
    });

    it('should tokenize string interpolation', () => {
      const source = `announce("You have {{hp}} health")`;
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();

      expect(tokens[0].value).toBe('announce');
      expect(tokens[2].type).toBe(TokenType.STRING);
      expect(tokens[2].value).toBe('You have {{hp}} health');
    });
  });

  describe('Error Handling', () => {
    it('should throw error on unexpected character', () => {
      const lexer = new Lexer('@');
      expect(() => lexer.tokenize()).toThrow('Unexpected character');
    });

    it('should include line and column in error', () => {
      const lexer = new Lexer('x = 1\ny = @');
      expect(() => lexer.tokenize()).toThrow(/line 2/);
    });
  });

  describe('EOF Token', () => {
    it('should always end with EOF token', () => {
      const lexer = new Lexer('42');
      const tokens = lexer.tokenize();
      expect(tokens[tokens.length - 1].type).toBe(TokenType.EOF);
    });

    it('should have EOF as only token for empty input', () => {
      const lexer = new Lexer('');
      const tokens = lexer.tokenize();
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.EOF);
    });
  });
});
