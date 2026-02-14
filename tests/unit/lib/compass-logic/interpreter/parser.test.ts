import { describe, it, expect } from 'vitest';
import { Lexer } from '@/lib/compass-logic/interpreter/lexer';
import { Parser } from '@/lib/compass-logic/interpreter/parser';
import type {
  Program,
  NumberLiteral,
  StringLiteral,
  BooleanLiteral,
  Identifier,
  BinaryOp,
  UnaryOp,
  Assignment,
  FunctionCall,
  FunctionDef,
  IfStatement,
  ForLoop,
  ReturnStatement,
  SubscribeCall,
  ArrayLiteral,
  ArrayAccess,
  MemberAccess,
  MethodCall,
} from '@/lib/compass-logic/interpreter/ast';

function parse(source: string): Program {
  const lexer = new Lexer(source);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  return parser.parse();
}

describe('Parser', () => {
  describe('Literals', () => {
    it('should parse number literal', () => {
      const ast = parse('42');
      expect(ast.statements).toHaveLength(1);
      expect(ast.statements[0]).toEqual({
        type: 'NumberLiteral',
        value: 42,
      } as NumberLiteral);
    });

    it('should parse decimal number', () => {
      const ast = parse('3.14');
      const stmt = ast.statements[0] as NumberLiteral;
      expect(stmt.type).toBe('NumberLiteral');
      expect(stmt.value).toBe(3.14);
    });

    it('should parse string literal', () => {
      const ast = parse('"hello"');
      expect(ast.statements[0]).toEqual({
        type: 'StringLiteral',
        value: 'hello',
      } as StringLiteral);
    });

    it('should parse boolean true', () => {
      const ast = parse('true');
      expect(ast.statements[0]).toEqual({
        type: 'BooleanLiteral',
        value: true,
      } as BooleanLiteral);
    });

    it('should parse boolean false', () => {
      const ast = parse('false');
      expect(ast.statements[0]).toEqual({
        type: 'BooleanLiteral',
        value: false,
      } as BooleanLiteral);
    });

    it('should parse identifier', () => {
      const ast = parse('variable');
      expect(ast.statements[0]).toEqual({
        type: 'Identifier',
        name: 'variable',
      } as Identifier);
    });

    it('should parse Self keyword as identifier (owner attribute reference)', () => {
      const ast = parse('Self');
      expect(ast.statements[0]).toEqual({
        type: 'Identifier',
        name: 'Self',
      } as Identifier);
    });

    it('should parse Self.value as member access', () => {
      const ast = parse('Self.value');
      expect(ast.statements[0]).toMatchObject({
        type: 'MemberAccess',
        property: 'value',
      });
      const stmt = ast.statements[0] as MemberAccess;
      expect(stmt.object).toEqual({ type: 'Identifier', name: 'Self' });
    });
  });

  describe('Binary Operations', () => {
    it('should parse addition', () => {
      const ast = parse('2 + 3');
      const stmt = ast.statements[0] as BinaryOp;
      expect(stmt.type).toBe('BinaryOp');
      expect(stmt.operator).toBe('+');
      expect((stmt.left as NumberLiteral).value).toBe(2);
      expect((stmt.right as NumberLiteral).value).toBe(3);
    });

    it('should parse subtraction', () => {
      const ast = parse('5 - 2');
      const stmt = ast.statements[0] as BinaryOp;
      expect(stmt.operator).toBe('-');
    });

    it('should parse multiplication', () => {
      const ast = parse('3 * 4');
      const stmt = ast.statements[0] as BinaryOp;
      expect(stmt.operator).toBe('*');
    });

    it('should parse division', () => {
      const ast = parse('10 / 2');
      const stmt = ast.statements[0] as BinaryOp;
      expect(stmt.operator).toBe('/');
    });

    it('should parse modulo', () => {
      const ast = parse('10 % 3');
      const stmt = ast.statements[0] as BinaryOp;
      expect(stmt.operator).toBe('%');
    });

    it('should parse power', () => {
      const ast = parse('2 ** 3');
      const stmt = ast.statements[0] as BinaryOp;
      expect(stmt.operator).toBe('**');
    });

    it('should parse comparison operators', () => {
      expect((parse('x > 5').statements[0] as BinaryOp).operator).toBe('>');
      expect((parse('x < 5').statements[0] as BinaryOp).operator).toBe('<');
      expect((parse('x >= 5').statements[0] as BinaryOp).operator).toBe('>=');
      expect((parse('x <= 5').statements[0] as BinaryOp).operator).toBe('<=');
      expect((parse('x == 5').statements[0] as BinaryOp).operator).toBe('==');
      expect((parse('x != 5').statements[0] as BinaryOp).operator).toBe('!=');
    });

    it('should parse boolean operators', () => {
      expect((parse('x && y').statements[0] as BinaryOp).operator).toBe('&&');
      expect((parse('x || y').statements[0] as BinaryOp).operator).toBe('||');
    });

    it('should respect operator precedence (multiplication before addition)', () => {
      const ast = parse('2 + 3 * 4');
      const stmt = ast.statements[0] as BinaryOp;
      expect(stmt.operator).toBe('+');
      expect((stmt.left as NumberLiteral).value).toBe(2);
      expect((stmt.right as BinaryOp).operator).toBe('*');
    });

    it('should respect operator precedence (power before multiplication)', () => {
      const ast = parse('2 * 3 ** 4');
      const stmt = ast.statements[0] as BinaryOp;
      expect(stmt.operator).toBe('*');
      expect((stmt.right as BinaryOp).operator).toBe('**');
    });

    it('should respect operator precedence (comparison before and)', () => {
      const ast = parse('x > 5 && y < 10');
      const stmt = ast.statements[0] as BinaryOp;
      expect(stmt.operator).toBe('&&');
      expect((stmt.left as BinaryOp).operator).toBe('>');
      expect((stmt.right as BinaryOp).operator).toBe('<');
    });

    it('should respect operator precedence (and before or)', () => {
      const ast = parse('x || y && z');
      const stmt = ast.statements[0] as BinaryOp;
      expect(stmt.operator).toBe('||');
      expect((stmt.right as BinaryOp).operator).toBe('&&');
    });

    it('should handle parentheses for grouping', () => {
      const ast = parse('(2 + 3) * 4');
      const stmt = ast.statements[0] as BinaryOp;
      expect(stmt.operator).toBe('*');
      expect((stmt.left as BinaryOp).operator).toBe('+');
    });
  });

  describe('Unary Operations', () => {
    it('should parse negation', () => {
      const ast = parse('-5');
      const stmt = ast.statements[0] as UnaryOp;
      expect(stmt.type).toBe('UnaryOp');
      expect(stmt.operator).toBe('-');
      expect((stmt.operand as NumberLiteral).value).toBe(5);
    });

    it('should parse logical not', () => {
      const ast = parse('!true');
      const stmt = ast.statements[0] as UnaryOp;
      expect(stmt.operator).toBe('!');
      expect((stmt.operand as BooleanLiteral).value).toBe(true);
    });

    it('should parse double negation', () => {
      const ast = parse('!!x');
      const stmt = ast.statements[0] as UnaryOp;
      expect(stmt.operator).toBe('!');
      expect((stmt.operand as UnaryOp).operator).toBe('!');
    });
  });

  describe('Assignments', () => {
    it('should parse simple assignment', () => {
      const ast = parse('x = 42');
      const stmt = ast.statements[0] as Assignment;
      expect(stmt.type).toBe('Assignment');
      expect(stmt.name).toBe('x');
      expect((stmt.value as NumberLiteral).value).toBe(42);
    });

    it('should parse assignment with expression', () => {
      const ast = parse('x = 2 + 3');
      const stmt = ast.statements[0] as Assignment;
      expect(stmt.name).toBe('x');
      expect((stmt.value as BinaryOp).operator).toBe('+');
    });

    it('should parse assignment with identifier', () => {
      const ast = parse('y = x');
      const stmt = ast.statements[0] as Assignment;
      expect(stmt.name).toBe('y');
      expect((stmt.value as Identifier).name).toBe('x');
    });
  });

  describe('Function Calls', () => {
    it('should parse function call with no arguments', () => {
      const ast = parse('foo()');
      const stmt = ast.statements[0] as FunctionCall;
      expect(stmt.type).toBe('FunctionCall');
      expect(stmt.name).toBe('foo');
      expect(stmt.arguments).toHaveLength(0);
    });

    it('should parse function call with one argument', () => {
      const ast = parse('roll("1d6")');
      const stmt = ast.statements[0] as FunctionCall;
      expect(stmt.name).toBe('roll');
      expect(stmt.arguments).toHaveLength(1);
      expect((stmt.arguments[0] as StringLiteral).value).toBe('1d6');
    });

    it('should parse function call with multiple arguments', () => {
      const ast = parse('add(2, 3, 4)');
      const stmt = ast.statements[0] as FunctionCall;
      expect(stmt.name).toBe('add');
      expect(stmt.arguments).toHaveLength(3);
      expect((stmt.arguments[0] as NumberLiteral).value).toBe(2);
      expect((stmt.arguments[1] as NumberLiteral).value).toBe(3);
      expect((stmt.arguments[2] as NumberLiteral).value).toBe(4);
    });

    it('should parse function call with expression arguments', () => {
      const ast = parse('max(x + 1, y - 2)');
      const stmt = ast.statements[0] as FunctionCall;
      expect(stmt.arguments).toHaveLength(2);
      expect((stmt.arguments[0] as BinaryOp).operator).toBe('+');
      expect((stmt.arguments[1] as BinaryOp).operator).toBe('-');
    });
  });

  describe('Member Access', () => {
    it('should parse simple member access', () => {
      const ast = parse('Owner.title');
      const stmt = ast.statements[0] as MemberAccess;
      expect(stmt.type).toBe('MemberAccess');
      expect((stmt.object as Identifier).name).toBe('Owner');
      expect(stmt.property).toBe('title');
    });

    it('should parse chained member access', () => {
      const ast = parse('Owner.attr.value');
      const stmt = ast.statements[0] as MemberAccess;
      expect(stmt.property).toBe('value');
      expect((stmt.object as MemberAccess).property).toBe('attr');
      expect(((stmt.object as MemberAccess).object as Identifier).name).toBe('Owner');
    });

    it('should parse method call', () => {
      const ast = parse('Owner.Attribute("HP")');
      const stmt = ast.statements[0] as MethodCall;
      expect(stmt.type).toBe('MethodCall');
      expect((stmt.object as Identifier).name).toBe('Owner');
      expect(stmt.method).toBe('Attribute');
      expect(stmt.arguments).toHaveLength(1);
      expect((stmt.arguments[0] as StringLiteral).value).toBe('HP');
    });

    it('should parse chained method calls', () => {
      const ast = parse('Owner.Attribute("HP").add(10)');
      const stmt = ast.statements[0] as MethodCall;
      expect(stmt.type).toBe('MethodCall');
      expect(stmt.method).toBe('add');
      // The object should be another MethodCall
      expect((stmt.object as MethodCall).type).toBe('MethodCall');
      expect((stmt.object as MethodCall).method).toBe('Attribute');
    });
  });

  describe('Array Operations', () => {
    it('should parse empty array literal', () => {
      const ast = parse('[]');
      const stmt = ast.statements[0] as ArrayLiteral;
      expect(stmt.type).toBe('ArrayLiteral');
      expect(stmt.elements).toHaveLength(0);
    });

    it('should parse array literal with elements', () => {
      const ast = parse('[1, 2, 3]');
      const stmt = ast.statements[0] as ArrayLiteral;
      expect(stmt.elements).toHaveLength(3);
      expect((stmt.elements[0] as NumberLiteral).value).toBe(1);
      expect((stmt.elements[1] as NumberLiteral).value).toBe(2);
      expect((stmt.elements[2] as NumberLiteral).value).toBe(3);
    });

    it('should parse array literal with mixed types', () => {
      const ast = parse('[1, "hello", true]');
      const stmt = ast.statements[0] as ArrayLiteral;
      expect((stmt.elements[0] as NumberLiteral).value).toBe(1);
      expect((stmt.elements[1] as StringLiteral).value).toBe('hello');
      expect((stmt.elements[2] as BooleanLiteral).value).toBe(true);
    });

    it('should parse array access', () => {
      const ast = parse('items[0]');
      const stmt = ast.statements[0] as ArrayAccess;
      expect(stmt.type).toBe('ArrayAccess');
      expect((stmt.object as Identifier).name).toBe('items');
      expect((stmt.index as NumberLiteral).value).toBe(0);
    });

    it('should parse array access with expression index', () => {
      const ast = parse('items[i + 1]');
      const stmt = ast.statements[0] as ArrayAccess;
      expect((stmt.index as BinaryOp).operator).toBe('+');
    });

    it('should parse chained array access', () => {
      const ast = parse('matrix[0][1]');
      const stmt = ast.statements[0] as ArrayAccess;
      expect(stmt.type).toBe('ArrayAccess');
      expect((stmt.object as ArrayAccess).type).toBe('ArrayAccess');
    });
  });

  describe('Function Definitions', () => {
    it('should parse function with no parameters', () => {
      const source = `foo():
    return 42`;
      const ast = parse(source);
      const stmt = ast.statements[0] as FunctionDef;
      expect(stmt.type).toBe('FunctionDef');
      expect(stmt.name).toBe('foo');
      expect(stmt.params).toHaveLength(0);
      expect(stmt.body).toHaveLength(1);
    });

    it('should parse function with one parameter', () => {
      const source = `double(x):
    return x * 2`;
      const ast = parse(source);
      const stmt = ast.statements[0] as FunctionDef;
      expect(stmt.name).toBe('double');
      expect(stmt.params).toEqual(['x']);
    });

    it('should parse function with multiple parameters', () => {
      const source = `add(a, b, c):
    return a + b + c`;
      const ast = parse(source);
      const stmt = ast.statements[0] as FunctionDef;
      expect(stmt.params).toEqual(['a', 'b', 'c']);
    });

    it('should parse function with multiple statements', () => {
      const source = `calculate(x):
    y = x * 2
    z = y + 1
    return z`;
      const ast = parse(source);
      const stmt = ast.statements[0] as FunctionDef;
      expect(stmt.body).toHaveLength(3);
    });
  });

  describe('If Statements', () => {
    it('should parse simple if statement', () => {
      const source = `if x > 0:
    y = 1`;
      const ast = parse(source);
      const stmt = ast.statements[0] as IfStatement;
      expect(stmt.type).toBe('IfStatement');
      expect((stmt.condition as BinaryOp).operator).toBe('>');
      expect(stmt.thenBlock).toHaveLength(1);
      expect(stmt.elseIfBlocks).toHaveLength(0);
      expect(stmt.elseBlock).toBeNull();
    });

    it('should parse if-else statement', () => {
      const source = `if x > 0:
    y = 1
else:
    y = 0`;
      const ast = parse(source);
      const stmt = ast.statements[0] as IfStatement;
      expect(stmt.thenBlock).toHaveLength(1);
      expect(stmt.elseBlock).toHaveLength(1);
    });

    it('should parse if-else if statement', () => {
      const source = `if x > 0:
    y = 1
else if x < 0:
    y = -1`;
      const ast = parse(source);
      const stmt = ast.statements[0] as IfStatement;
      expect(stmt.elseIfBlocks).toHaveLength(1);
      expect((stmt.elseIfBlocks[0].condition as BinaryOp).operator).toBe('<');
    });

    it('should parse if-else if-else statement', () => {
      const source = `if x > 0:
    y = 1
else if x < 0:
    y = -1
else:
    y = 0`;
      const ast = parse(source);
      const stmt = ast.statements[0] as IfStatement;
      expect(stmt.elseIfBlocks).toHaveLength(1);
      expect(stmt.elseBlock).toHaveLength(1);
    });

    it('should parse multiple else if blocks', () => {
      const source = `if x == 1:
    y = 1
else if x == 2:
    y = 2
else if x == 3:
    y = 3
else:
    y = 0`;
      const ast = parse(source);
      const stmt = ast.statements[0] as IfStatement;
      expect(stmt.elseIfBlocks).toHaveLength(2);
    });

    it('should parse nested if statements', () => {
      const source = `if x > 0:
    if y > 0:
        z = 1`;
      const ast = parse(source);
      const stmt = ast.statements[0] as IfStatement;
      expect(stmt.thenBlock).toHaveLength(1);
      expect((stmt.thenBlock[0] as IfStatement).type).toBe('IfStatement');
    });
  });

  describe('For Loops', () => {
    it('should parse for loop with range', () => {
      const source = `for i in 10:
    log(i)`;
      const ast = parse(source);
      const stmt = ast.statements[0] as ForLoop;
      expect(stmt.type).toBe('ForLoop');
      expect(stmt.variable).toBe('i');
      expect((stmt.iterable as NumberLiteral).value).toBe(10);
      expect(stmt.body).toHaveLength(1);
    });

    it('should parse for loop with array', () => {
      const source = `for item in items:
    process(item)`;
      const ast = parse(source);
      const stmt = ast.statements[0] as ForLoop;
      expect(stmt.variable).toBe('item');
      expect((stmt.iterable as Identifier).name).toBe('items');
    });

    it('should parse for loop with multiple statements', () => {
      const source = `for i in 5:
    x = i * 2
    log(x)`;
      const ast = parse(source);
      const stmt = ast.statements[0] as ForLoop;
      expect(stmt.body).toHaveLength(2);
    });

    it('should parse nested for loops', () => {
      const source = `for i in 3:
    for j in 3:
        log(i, j)`;
      const ast = parse(source);
      const stmt = ast.statements[0] as ForLoop;
      expect(stmt.body).toHaveLength(1);
      expect((stmt.body[0] as ForLoop).type).toBe('ForLoop');
    });
  });

  describe('Return Statements', () => {
    it('should parse return with value', () => {
      const source = 'return 42';
      const ast = parse(source);
      const stmt = ast.statements[0] as ReturnStatement;
      expect(stmt.type).toBe('ReturnStatement');
      expect((stmt.value as NumberLiteral).value).toBe(42);
    });

    it('should parse return with expression', () => {
      const source = 'return x + 1';
      const ast = parse(source);
      const stmt = ast.statements[0] as ReturnStatement;
      expect((stmt.value as BinaryOp).operator).toBe('+');
    });

    it('should parse return without value', () => {
      const source = 'return\n';
      const ast = parse(source);
      const stmt = ast.statements[0] as ReturnStatement;
      expect(stmt.value).toBeNull();
    });
  });

  describe('Subscribe Calls', () => {
    it('should parse subscribe with one argument', () => {
      const source = 'subscribe("HP")';
      const ast = parse(source);
      const stmt = ast.statements[0] as SubscribeCall;
      expect(stmt.type).toBe('SubscribeCall');
      expect(stmt.arguments).toHaveLength(1);
      expect((stmt.arguments[0] as StringLiteral).value).toBe('HP');
    });

    it('should parse subscribe with multiple arguments', () => {
      const source = 'subscribe("HP", "Level", "Constitution")';
      const ast = parse(source);
      const stmt = ast.statements[0] as SubscribeCall;
      expect(stmt.arguments).toHaveLength(3);
    });

    it('should parse subscribe with variable references', () => {
      const source = 'subscribe(attr_name)';
      const ast = parse(source);
      const stmt = ast.statements[0] as SubscribeCall;
      expect((stmt.arguments[0] as Identifier).name).toBe('attr_name');
    });
  });

  describe('Complex Expressions', () => {
    it('should parse complex arithmetic', () => {
      const ast = parse('(2 + 3) * 4 - 5 / 2');
      const stmt = ast.statements[0] as BinaryOp;
      expect(stmt.operator).toBe('-');
    });

    it('should parse complex boolean expression', () => {
      const ast = parse('x > 5 && y < 10 || z == 0');
      const stmt = ast.statements[0] as BinaryOp;
      expect(stmt.operator).toBe('||');
    });

    it('should parse member access with method call', () => {
      const ast = parse('Owner.Attribute("HP").add(10)');
      const stmt = ast.statements[0] as MethodCall;
      expect(stmt.type).toBe('MethodCall');
      expect(stmt.method).toBe('add');
    });

    it('should parse array method call', () => {
      const ast = parse('items.count()');
      const stmt = ast.statements[0] as MethodCall;
      expect(stmt.type).toBe('MethodCall');
      expect(stmt.method).toBe('count');
      expect((stmt.object as Identifier).name).toBe('items');
    });
  });

  describe('Real Script Examples', () => {
    it('should parse simple attribute script', () => {
      const source = `subscribe("Constitution", "Level")

base = 10
con = Owner.Attribute("Constitution").value
level = Owner.Attribute("Level").value

return base + con + level`;
      const ast = parse(source);
      expect(ast.statements).toHaveLength(5);
      expect(ast.statements[0].type).toBe('SubscribeCall');
      expect(ast.statements[1].type).toBe('Assignment');
      expect(ast.statements[4].type).toBe('ReturnStatement');
    });

    it('should parse function with conditional', () => {
      const source = `calculateModifier(score):
    if score >= 10:
        return (score - 10) / 2
    else:
        return 0`;
      const ast = parse(source);
      const func = ast.statements[0] as FunctionDef;
      expect(func.type).toBe('FunctionDef');
      expect(func.body).toHaveLength(1);
      expect(func.body[0].type).toBe('IfStatement');
    });

    it('should parse action script with target', () => {
      const source = `on_activate(Target):
    damage = roll("1d8")
    Target.Attribute("Hit Points").subtract(damage)
    announce("Dealt damage!")
    return`;
      const ast = parse(source);
      const func = ast.statements[0] as FunctionDef;
      expect(func.name).toBe('on_activate');
      expect(func.params).toEqual(['Target']);
      expect(func.body).toHaveLength(4);
    });

    it('should parse for loop with method calls', () => {
      const source = `for arrow in arrows:
    arrow.consume()`;
      const ast = parse(source);
      const loop = ast.statements[0] as ForLoop;
      expect(loop.type).toBe('ForLoop');
      expect((loop.body[0] as MethodCall).type).toBe('MethodCall');
      expect((loop.body[0] as MethodCall).method).toBe('consume');
    });

    it('should parse nested control flow', () => {
      const source = `if hp > 0:
    for i in 10:
        if i == 5:
            return i`;
      const ast = parse(source);
      const ifStmt = ast.statements[0] as IfStatement;
      const forLoop = ifStmt.thenBlock[0] as ForLoop;
      const nestedIf = forLoop.body[0] as IfStatement;
      expect(nestedIf.type).toBe('IfStatement');
    });

    it('should parse string interpolation', () => {
      const source = 'announce("You have {{hp}} health")';
      const ast = parse(source);
      const call = ast.statements[0] as FunctionCall;
      expect((call.arguments[0] as StringLiteral).value).toBe('You have {{hp}} health');
    });
  });

  describe('Multiple Statements', () => {
    it('should parse multiple statements', () => {
      const source = `x = 1
y = 2
z = 3`;
      const ast = parse(source);
      expect(ast.statements).toHaveLength(3);
    });

    it('should parse statements with blank lines', () => {
      const source = `x = 1

y = 2

z = 3`;
      const ast = parse(source);
      expect(ast.statements).toHaveLength(3);
    });
  });

  describe('Error Handling', () => {
    it('should throw error on missing closing parenthesis', () => {
      expect(() => parse('foo(')).toThrow();
    });

    it('should throw error on missing colon after if', () => {
      expect(() => parse('if x > 0\n    y = 1')).toThrow();
    });

    it('should throw error on invalid assignment target', () => {
      expect(() => parse('42 = x')).toThrow('Invalid assignment target');
    });

    it('should throw error on unexpected token', () => {
      expect(() => parse('+')).toThrow();
    });

    it('should include line and column in error', () => {
      try {
        parse('x = 1\ny = (');
      } catch (e: any) {
        expect(e.message).toMatch(/line 2/);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should parse empty program', () => {
      const ast = parse('');
      expect(ast.statements).toHaveLength(0);
    });

    it('should parse program with only comments', () => {
      const ast = parse('// comment\n/* another */');
      expect(ast.statements).toHaveLength(0);
    });

    it('should parse program with only whitespace', () => {
      const ast = parse('\n\n');
      expect(ast.statements).toHaveLength(0);
    });
  });
});
