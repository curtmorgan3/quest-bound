import { Evaluator, RuntimeError } from '@/lib/compass-logic/interpreter/evaluator';
import { Lexer } from '@/lib/compass-logic/interpreter/lexer';
import { Parser } from '@/lib/compass-logic/interpreter/parser';
import { describe, expect, it } from 'vitest';

function evaluate(source: string): any {
  const lexer = new Lexer(source);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();
  const evaluator = new Evaluator();
  return evaluator.eval(ast);
}

describe('Evaluator', () => {
  describe('Literals', () => {
    it('should evaluate number literal', () => {
      expect(evaluate('42')).toBe(42);
    });

    it('should evaluate decimal number', () => {
      expect(evaluate('3.14')).toBe(3.14);
    });

    it('should evaluate string literal', () => {
      expect(evaluate('"hello"')).toBe('hello');
    });

    it('should evaluate boolean true', () => {
      expect(evaluate('true')).toBe(true);
    });

    it('should evaluate boolean false', () => {
      expect(evaluate('false')).toBe(false);
    });

    it('should evaluate Self when defined in environment (attribute script)', () => {
      const evaluator = new Evaluator();
      const mockAttribute = { value: 42, title: 'Hit Points' };
      evaluator.globalEnv.define('Self', mockAttribute);
      const ast = new Parser(new Lexer('Self').tokenize()).parse();
      expect(evaluator.eval(ast)).toBe(mockAttribute);
    });

    it('should evaluate Self.value when Self is Owner.Attribute proxy', () => {
      const evaluator = new Evaluator();
      const mockAttribute = { value: 50, title: 'Hit Points', add() {}, subtract() {}, set() {} };
      evaluator.globalEnv.define('Self', mockAttribute);
      const ast = new Parser(new Lexer('Self.value').tokenize()).parse();
      expect(evaluator.eval(ast)).toBe(50);
    });

    it('should throw when Self is not defined (e.g. non-attribute script)', () => {
      expect(() => evaluate('Self')).toThrow("Undefined variable 'Self'");
    });
  });

  describe('Arithmetic Operations', () => {
    it('should evaluate addition', () => {
      expect(evaluate('2 + 3')).toBe(5);
    });

    it('should evaluate subtraction', () => {
      expect(evaluate('5 - 2')).toBe(3);
    });

    it('should evaluate multiplication', () => {
      expect(evaluate('3 * 4')).toBe(12);
    });

    it('should evaluate division', () => {
      expect(evaluate('10 / 2')).toBe(5);
    });

    it('should evaluate modulo', () => {
      expect(evaluate('10 % 3')).toBe(1);
    });

    it('should evaluate power', () => {
      expect(evaluate('2 ** 3')).toBe(8);
    });

    it('should evaluate complex arithmetic', () => {
      expect(evaluate('2 + 3 * 4')).toBe(14);
    });

    it('should evaluate with parentheses', () => {
      expect(evaluate('(2 + 3) * 4')).toBe(20);
    });

    it('should throw error on division by zero', () => {
      expect(() => evaluate('10 / 0')).toThrow('Division by zero');
    });

    it('should throw error on modulo by zero', () => {
      expect(() => evaluate('10 % 0')).toThrow('Modulo by zero');
    });
  });

  describe('Comparison Operations', () => {
    it('should evaluate greater than', () => {
      expect(evaluate('5 > 3')).toBe(true);
      expect(evaluate('3 > 5')).toBe(false);
    });

    it('should evaluate less than', () => {
      expect(evaluate('3 < 5')).toBe(true);
      expect(evaluate('5 < 3')).toBe(false);
    });

    it('should evaluate greater than or equal', () => {
      expect(evaluate('5 >= 5')).toBe(true);
      expect(evaluate('5 >= 3')).toBe(true);
      expect(evaluate('3 >= 5')).toBe(false);
    });

    it('should evaluate less than or equal', () => {
      expect(evaluate('3 <= 3')).toBe(true);
      expect(evaluate('3 <= 5')).toBe(true);
      expect(evaluate('5 <= 3')).toBe(false);
    });

    it('should evaluate equality', () => {
      expect(evaluate('5 == 5')).toBe(true);
      expect(evaluate('5 == 3')).toBe(false);
    });

    it('should evaluate inequality', () => {
      expect(evaluate('5 != 3')).toBe(true);
      expect(evaluate('5 != 5')).toBe(false);
    });
  });

  describe('Boolean Operations', () => {
    it('should evaluate logical and', () => {
      expect(evaluate('true && true')).toBe(true);
      expect(evaluate('true && false')).toBe(false);
      expect(evaluate('false && true')).toBe(false);
      expect(evaluate('false && false')).toBe(false);
    });

    it('should evaluate logical or', () => {
      expect(evaluate('true || true')).toBe(true);
      expect(evaluate('true || false')).toBe(true);
      expect(evaluate('false || true')).toBe(true);
      expect(evaluate('false || false')).toBe(false);
    });

    it('should evaluate logical not', () => {
      expect(evaluate('!true')).toBe(false);
      expect(evaluate('!false')).toBe(true);
    });

    it('should evaluate complex boolean expression', () => {
      expect(evaluate('5 > 3 && 2 < 4')).toBe(true);
      expect(evaluate('5 > 3 || 2 > 4')).toBe(true);
      expect(evaluate('5 < 3 || 2 > 4')).toBe(false);
    });
  });

  describe('Unary Operations', () => {
    it('should evaluate negation', () => {
      expect(evaluate('-5')).toBe(-5);
      expect(evaluate('-(-5)')).toBe(5);
    });

    it('should evaluate negation with expression', () => {
      expect(evaluate('-(2 + 3)')).toBe(-5);
    });
  });

  describe('Variables', () => {
    it('should assign and retrieve variable', () => {
      const result = evaluate(`x = 42
x`);
      expect(result).toBe(42);
    });

    it('should assign expression to variable', () => {
      const result = evaluate(`x = 2 + 3
x`);
      expect(result).toBe(5);
    });

    it('should update existing variable', () => {
      const result = evaluate(`x = 10
x = 20
x`);
      expect(result).toBe(20);
    });

    it('should use variable in expression', () => {
      const result = evaluate(`x = 5
y = x * 2
y`);
      expect(result).toBe(10);
    });

    it('should throw error on undefined variable', () => {
      expect(() => evaluate('undefined_var')).toThrow('Undefined variable');
    });
  });

  describe('Arrays', () => {
    it('should evaluate empty array', () => {
      expect(evaluate('[]')).toEqual([]);
    });

    it('should evaluate array with elements', () => {
      expect(evaluate('[1, 2, 3]')).toEqual([1, 2, 3]);
    });

    it('should evaluate array with mixed types', () => {
      expect(evaluate('[1, "hello", true]')).toEqual([1, 'hello', true]);
    });

    it('should access array element', () => {
      const result = evaluate(`arr = [10, 20, 30]
arr[1]`);
      expect(result).toBe(20);
    });

    it('should access array with expression index', () => {
      const result = evaluate(`arr = [10, 20, 30]
i = 2
arr[i]`);
      expect(result).toBe(30);
    });

    it('should throw error on out of bounds access', () => {
      expect(() =>
        evaluate(`arr = [1, 2, 3]
arr[5]`),
      ).toThrow('Array index out of bounds');
    });

    it('should throw error on negative index', () => {
      expect(() =>
        evaluate(`arr = [1, 2, 3]
arr[-1]`),
      ).toThrow('Array index out of bounds');
    });

    it('should throw error on non-array indexing', () => {
      expect(() =>
        evaluate(`x = 42
x[0]`),
      ).toThrow('Cannot index non-array');
    });
  });

  describe('Function Definitions', () => {
    it('should define and call function with no parameters', () => {
      const result = evaluate(`foo():
    return 42

foo()`);
      expect(result).toBe(42);
    });

    it('should define and call function with one parameter', () => {
      const result = evaluate(`double(x):
    return x * 2

double(5)`);
      expect(result).toBe(10);
    });

    it('should define and call function with multiple parameters', () => {
      const result = evaluate(`add(a, b, c):
    return a + b + c

add(1, 2, 3)`);
      expect(result).toBe(6);
    });

    it('should handle function with local variables', () => {
      const result = evaluate(`calculate(x):
    y = x * 2
    z = y + 1
    return z

calculate(5)`);
      expect(result).toBe(11);
    });

    it('should handle nested function calls', () => {
      const result = evaluate(`double(x):
    return x * 2

quadruple(x):
    return double(double(x))

quadruple(3)`);
      expect(result).toBe(12);
    });

    it('should handle lexical scoping', () => {
      const result = evaluate(`x = 10

getX():
    return x

getX()`);
      expect(result).toBe(10);
    });
  });

  describe('If Statements', () => {
    it('should execute then block when condition is true', () => {
      const result = evaluate(`if true:
    x = 1
x`);
      expect(result).toBe(1);
    });

    it('should skip then block when condition is false', () => {
      const result = evaluate(`x = 0
if false:
    x = 1
x`);
      expect(result).toBe(0);
    });

    it('should execute else block when condition is false', () => {
      const result = evaluate(`if false:
    x = 1
else:
    x = 2
x`);
      expect(result).toBe(2);
    });

    it('should execute else if block', () => {
      const result = evaluate(`x = 5
if x < 0:
    y = -1
else if x > 0:
    y = 1
else:
    y = 0
y`);
      expect(result).toBe(1);
    });

    it('should handle multiple else if blocks', () => {
      const result = evaluate(`x = 2
if x == 1:
    y = 1
else if x == 2:
    y = 2
else if x == 3:
    y = 3
else:
    y = 0
y`);
      expect(result).toBe(2);
    });

    it('should handle nested if statements', () => {
      const result = evaluate(`x = 5
y = 10
if x > 0:
    if y > 0:
        z = 1
z`);
      expect(result).toBe(1);
    });

    it('should handle truthiness', () => {
      expect(evaluate('if 1:\n    x = 1\nx')).toBe(1);
      expect(evaluate('if 0:\n    x = 1\nelse:\n    x = 2\nx')).toBe(2);
      expect(evaluate('if "hello":\n    x = 1\nx')).toBe(1);
      expect(evaluate('if "":\n    x = 1\nelse:\n    x = 2\nx')).toBe(2);
    });
  });

  describe('For Loops', () => {
    it('should iterate over range', () => {
      const result = evaluate(`sum = 0
for i in 5:
    sum = sum + i
sum`);
      expect(result).toBe(0 + 1 + 2 + 3 + 4);
    });

    it('should iterate over array', () => {
      const result = evaluate(`arr = [10, 20, 30]
sum = 0
for item in arr:
    sum = sum + item
sum`);
      expect(result).toBe(60);
    });

    it('should handle nested loops', () => {
      const result = evaluate(`count = 0
for i in 3:
    for j in 3:
        count = count + 1
count`);
      expect(result).toBe(9);
    });

    it('should handle loop variable in body', () => {
      const result = evaluate(`result = 0
for i in 5:
    result = i
result`);
      expect(result).toBe(4);
    });

    it('should throw error on non-iterable', () => {
      expect(() =>
        evaluate(`for i in true:
    x = i`),
      ).toThrow('Cannot iterate over');
    });
  });

  describe('Return Statements', () => {
    it('should return value from function', () => {
      const result = evaluate(`foo():
    return 42

foo()`);
      expect(result).toBe(42);
    });

    it('should return early from function', () => {
      const result = evaluate(`foo():
    return 1
    return 2

foo()`);
      expect(result).toBe(1);
    });

    it('should return from nested control flow', () => {
      const result = evaluate(`foo(x):
    if x > 0:
        return 1
    return 0

foo(5)`);
      expect(result).toBe(1);
    });

    it('should handle return without value', () => {
      const result = evaluate(`foo():
    x = 1
    return

foo()`);
      expect(result).toBeNull();
    });
  });

  describe('Built-in Functions', () => {
    describe('roll()', () => {
      it('should roll dice and return number', () => {
        const result = evaluate('roll("1d6")');
        expect(typeof result).toBe('number');
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(6);
      });

      it('should handle dice with modifiers', () => {
        const result = evaluate('roll("1d6+10")');
        expect(result).toBeGreaterThanOrEqual(11);
        expect(result).toBeLessThanOrEqual(16);
      });

      it('should handle multiple dice', () => {
        const result = evaluate('roll("2d6")');
        expect(result).toBeGreaterThanOrEqual(2);
        expect(result).toBeLessThanOrEqual(12);
      });
    });

    describe('Math functions', () => {
      it('should floor number', () => {
        expect(evaluate('floor(3.7)')).toBe(3);
        expect(evaluate('floor(3.2)')).toBe(3);
      });

      it('should ceil number', () => {
        expect(evaluate('ceil(3.2)')).toBe(4);
        expect(evaluate('ceil(3.7)')).toBe(4);
      });

      it('should round number', () => {
        expect(evaluate('round(3.4)')).toBe(3);
        expect(evaluate('round(3.5)')).toBe(4);
      });

      it('should calculate absolute value', () => {
        expect(evaluate('abs(-5)')).toBe(5);
        expect(evaluate('abs(5)')).toBe(5);
      });

      it('should calculate min', () => {
        expect(evaluate('min(3, 5, 2)')).toBe(2);
      });

      it('should calculate max', () => {
        expect(evaluate('max(3, 5, 2)')).toBe(5);
      });
    });

    describe('announce() and log()', () => {
      it('should capture announce messages', () => {
        const lexer = new Lexer('announce("Hello")');
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const evaluator = new Evaluator();
        evaluator.eval(ast);
        expect(evaluator.getAnnounceMessages()).toEqual(['Hello']);
      });

      it('should capture multiple announce messages', () => {
        const lexer = new Lexer('announce("First")\nannounce("Second")');
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const evaluator = new Evaluator();
        evaluator.eval(ast);
        expect(evaluator.getAnnounceMessages()).toEqual(['First', 'Second']);
      });

      it('should capture log messages', () => {
        const lexer = new Lexer('log("Debug", 42)');
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const evaluator = new Evaluator();
        evaluator.eval(ast);
        expect(evaluator.getLogMessages()).toEqual([['Debug', 42]]);
      });
    });
  });

  describe('String Interpolation', () => {
    it('should interpolate variable in string', () => {
      const result = evaluate(`hp = 100
"You have {{hp}} health"`);
      expect(result).toBe('You have 100 health');
    });

    it('should interpolate multiple variables', () => {
      const result = evaluate(`hp = 100
max_hp = 150
"HP: {{hp}}/{{max_hp}}"`);
      expect(result).toBe('HP: 100/150');
    });

    it('should handle missing variable in interpolation', () => {
      const result = evaluate('"Value: {{missing}}"');
      expect(result).toBe('Value: {{missing}}');
    });

    it('should interpolate in announce', () => {
      const lexer = new Lexer('damage = 10\nannounce("Dealt {{damage}} damage")');
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const evaluator = new Evaluator();
      evaluator.eval(ast);
      expect(evaluator.getAnnounceMessages()).toEqual(['Dealt 10 damage']);
    });
  });

  describe('Member Access', () => {
    it('should access object property', () => {
      const result = evaluate(`obj = [1, 2, 3]
obj.length`);
      expect(result).toBe(3);
    });
  });

  describe('Subscribe Calls', () => {
    it('should evaluate subscribe arguments', () => {
      const result = evaluate('subscribe("HP", "Level")');
      expect(result).toEqual(['HP', 'Level']);
    });

    it('should handle variable references in subscribe', () => {
      const result = evaluate(`attr = "Constitution"
subscribe(attr, "Level")`);
      expect(result).toEqual(['Constitution', 'Level']);
    });
  });

  describe('Real Script Examples', () => {
    it('should evaluate D&D modifier calculation', () => {
      const result = evaluate(`calculateModifier(score):
    return floor((score - 10) / 2)

calculateModifier(16)`);
      expect(result).toBe(3);
    });

    it('should evaluate attribute script', () => {
      const result = evaluate(`base = 10
con = 14
level = 5
con_bonus = con * 2
level_bonus = level * 5

return base + con_bonus + level_bonus`);
      expect(result).toBe(10 + 28 + 25);
    });

    it('should evaluate conditional damage calculation', () => {
      const result = evaluate(`attack_roll = 20
if attack_roll == 20:
    damage = 16
else:
    damage = 8
damage`);
      expect(result).toBe(16);
    });

    it('should evaluate loop accumulation', () => {
      const result = evaluate(`total = 0
for i in 10:
    total = total + i
total`);
      expect(result).toBe(45);
    });

    it('should evaluate nested control flow', () => {
      const result = evaluate(`checkStatus(hp):
    if hp > 50:
        return "Healthy"
    else if hp > 0:
        return "Injured"
    else:
        return "Dead"

checkStatus(75)`);
      expect(result).toBe('Healthy');
    });

    it('should evaluate recursive function', () => {
      const result = evaluate(`factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

factorial(5)`);
      expect(result).toBe(120);
    });

    it('should evaluate complex script with multiple features', () => {
      const lexer = new Lexer(`calculateDamage(base, modifier):
    roll_result = 10
    total = base + roll_result + modifier
    return total

str = 16
str_mod = floor((str - 10) / 2)
damage = calculateDamage(8, str_mod)

if damage > 15:
    announce("Critical damage!")
else:
    announce("Normal damage")

damage`);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const evaluator = new Evaluator();
      const result = evaluator.eval(ast);

      expect(result).toBe(21); // 8 + 10 + 3
      expect(evaluator.getAnnounceMessages()).toEqual(['Critical damage!']);
    });
  });

  describe('Error Handling', () => {
    it('should throw error on undefined variable', () => {
      expect(() => evaluate('x')).toThrow(RuntimeError);
      expect(() => evaluate('x')).toThrow('Undefined variable');
    });

    it('should throw error on calling non-function', () => {
      expect(() =>
        evaluate(`x = 42
x()`),
      ).toThrow('is not a function');
    });

    it('should throw error on invalid array access', () => {
      expect(() =>
        evaluate(`arr = [1, 2, 3]
arr[10]`),
      ).toThrow('Array index out of bounds');
    });

    it('should handle member access on primitives', () => {
      // JavaScript allows member access on primitives (auto-boxing)
      const result = evaluate('x = [1, 2, 3]\nx.length');
      expect(result).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty program', () => {
      expect(evaluate('')).toBeNull();
    });

    it('should handle program with only comments', () => {
      expect(evaluate('// comment')).toBeNull();
    });

    it('should return last expression value', () => {
      expect(evaluate('1\n2\n3')).toBe(3);
    });

    it('should handle assignment as expression', () => {
      expect(evaluate('x = 42')).toBe(42);
    });
  });
});
