import { Evaluator, RuntimeError } from '@/lib/compass-logic/interpreter/evaluator';
import { Lexer } from '@/lib/compass-logic/interpreter/lexer';
import { Parser } from '@/lib/compass-logic/interpreter/parser';
import { describe, expect, it } from 'vitest';

async function evaluate(source: string): Promise<any> {
  const lexer = new Lexer(source);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();
  const evaluator = new Evaluator();
  return evaluator.eval(ast);
}

describe('Evaluator', async () => {
  describe('Literals', async () => {
    it('should evaluate number literal', async () => {
      expect(await evaluate('42')).toBe(42);
    });

    it('should evaluate decimal number', async () => {
      expect(await evaluate('3.14')).toBe(3.14);
    });

    it('should evaluate string literal', async () => {
      expect(await evaluate('"hello"')).toBe('hello');
    });

    it('should evaluate boolean true', async () => {
      expect(await evaluate('true')).toBe(true);
    });

    it('should evaluate boolean false', async () => {
      expect(await evaluate('false')).toBe(false);
    });

    it('should evaluate Self when defined in environment (attribute script)', async () => {
      const evaluator = new Evaluator();
      const mockAttribute = { value: 42, title: 'Hit Points' };
      evaluator.globalEnv.define('Self', mockAttribute);
      const ast = new Parser(new Lexer('Self').tokenize()).parse();
      expect(await evaluator.eval(ast)).toBe(mockAttribute);
    });

    it('should evaluate Self.value when Self is Owner.Attribute proxy', async () => {
      const evaluator = new Evaluator();
      const mockAttribute = { value: 50, title: 'Hit Points', add() {}, subtract() {}, set() {} };
      evaluator.globalEnv.define('Self', mockAttribute);
      const ast = new Parser(new Lexer('Self.value').tokenize()).parse();
      expect(await evaluator.eval(ast)).toBe(50);
    });

    it('should throw when Self is not defined (e.g. non-attribute script)', async () => {
      await expect(evaluate('Self')).rejects.toThrow("Undefined variable 'Self'");
    });
  });

  describe('Arithmetic Operations', async () => {
    it('should evaluate addition', async () => {
      expect(await evaluate('2 + 3')).toBe(5);
    });

    it('should evaluate subtraction', async () => {
      expect(await evaluate('5 - 2')).toBe(3);
    });

    it('should evaluate multiplication', async () => {
      expect(await evaluate('3 * 4')).toBe(12);
    });

    it('should evaluate division', async () => {
      expect(await evaluate('10 / 2')).toBe(5);
    });

    it('should evaluate modulo', async () => {
      expect(await evaluate('10 % 3')).toBe(1);
    });

    it('should evaluate power', async () => {
      expect(await evaluate('2 ** 3')).toBe(8);
    });

    it('should evaluate complex arithmetic', async () => {
      expect(await evaluate('2 + 3 * 4')).toBe(14);
    });

    it('should evaluate with parentheses', async () => {
      expect(await evaluate('(2 + 3) * 4')).toBe(20);
    });

    it('should throw error on division by zero', async () => {
      await expect(evaluate('10 / 0')).rejects.toThrow('Division by zero');
    });

    it('should throw error on modulo by zero', async () => {
      await expect(evaluate('10 % 0')).rejects.toThrow('Modulo by zero');
    });
  });

  describe('Comparison Operations', async () => {
    it('should evaluate greater than', async () => {
      expect(await evaluate('5 > 3')).toBe(true);
      expect(await evaluate('3 > 5')).toBe(false);
    });

    it('should evaluate less than', async () => {
      expect(await evaluate('3 < 5')).toBe(true);
      expect(await evaluate('5 < 3')).toBe(false);
    });

    it('should evaluate greater than or equal', async () => {
      expect(await evaluate('5 >= 5')).toBe(true);
      expect(await evaluate('5 >= 3')).toBe(true);
      expect(await evaluate('3 >= 5')).toBe(false);
    });

    it('should evaluate less than or equal', async () => {
      expect(await evaluate('3 <= 3')).toBe(true);
      expect(await evaluate('3 <= 5')).toBe(true);
      expect(await evaluate('5 <= 3')).toBe(false);
    });

    it('should evaluate equality', async () => {
      expect(await evaluate('5 == 5')).toBe(true);
      expect(await evaluate('5 == 3')).toBe(false);
    });

    it('should evaluate inequality', async () => {
      expect(await evaluate('5 != 3')).toBe(true);
      expect(await evaluate('5 != 5')).toBe(false);
    });
  });

  describe('Boolean Operations', async () => {
    it('should evaluate logical and', async () => {
      expect(await evaluate('true && true')).toBe(true);
      expect(await evaluate('true && false')).toBe(false);
      expect(await evaluate('false && true')).toBe(false);
      expect(await evaluate('false && false')).toBe(false);
    });

    it('should evaluate logical or', async () => {
      expect(await evaluate('true || true')).toBe(true);
      expect(await evaluate('true || false')).toBe(true);
      expect(await evaluate('false || true')).toBe(true);
      expect(await evaluate('false || false')).toBe(false);
    });

    it('should evaluate logical not', async () => {
      expect(await evaluate('!true')).toBe(false);
      expect(await evaluate('!false')).toBe(true);
    });

    it('should evaluate complex boolean expression', async () => {
      expect(await evaluate('5 > 3 && 2 < 4')).toBe(true);
      expect(await evaluate('5 > 3 || 2 > 4')).toBe(true);
      expect(await evaluate('5 < 3 || 2 > 4')).toBe(false);
    });
  });

  describe('Unary Operations', async () => {
    it('should evaluate negation', async () => {
      expect(await evaluate('-5')).toBe(-5);
      expect(await evaluate('-(-5)')).toBe(5);
    });

    it('should evaluate negation with expression', async () => {
      expect(await evaluate('-(2 + 3)')).toBe(-5);
    });
  });

  describe('Variables', async () => {
    it('should assign and retrieve variable', async () => {
      const result = await evaluate(`x = 42
x`);
      expect(result).toBe(42);
    });

    it('should assign expression to variable', async () => {
      const result = await evaluate(`x = 2 + 3
x`);
      expect(result).toBe(5);
    });

    it('should update existing variable', async () => {
      const result = await evaluate(`x = 10
x = 20
x`);
      expect(result).toBe(20);
    });

    it('should use variable in expression', async () => {
      const result = await evaluate(`x = 5
y = x * 2
y`);
      expect(result).toBe(10);
    });

    it('should throw error on undefined variable', async () => {
      await expect(evaluate('undefined_var')).rejects.toThrow('Undefined variable');
    });
  });

  describe('Arrays', async () => {
    it('should evaluate empty array', async () => {
      expect(await evaluate('[]')).toEqual([]);
    });

    it('should evaluate array with elements', async () => {
      expect(await evaluate('[1, 2, 3]')).toEqual([1, 2, 3]);
    });

    it('should evaluate array with mixed types', async () => {
      expect(await evaluate('[1, "hello", true]')).toEqual([1, 'hello', true]);
    });

    it('should access array element', async () => {
      const result = await evaluate(`arr = [10, 20, 30]
arr[1]`);
      expect(result).toBe(20);
    });

    it('should access array with expression index', async () => {
      const result = await evaluate(`arr = [10, 20, 30]
i = 2
arr[i]`);
      expect(result).toBe(30);
    });

    it('should throw error on out of bounds access', async () => {
      await expect(
        evaluate(`arr = [1, 2, 3]
arr[5]`),
      ).rejects.toThrow('Array index out of bounds');
    });

    it('should throw error on negative index', async () => {
      await expect(
        evaluate(`arr = [1, 2, 3]
arr[-1]`),
      ).rejects.toThrow('Array index out of bounds');
    });

    it('should throw error on non-array indexing', async () => {
      await expect(
        evaluate(`x = 42
x[0]`),
      ).rejects.toThrow('Cannot index non-array');
    });
  });

  describe('Function Definitions', async () => {
    it('should define and call function with no parameters', async () => {
      const result = await evaluate(`foo():
    return 42

foo()`);
      expect(result).toBe(42);
    });

    it('should define and call function with one parameter', async () => {
      const result = await evaluate(`double(x):
    return x * 2

double(5)`);
      expect(result).toBe(10);
    });

    it('should define and call function with multiple parameters', async () => {
      const result = await evaluate(`add(a, b, c):
    return a + b + c

add(1, 2, 3)`);
      expect(result).toBe(6);
    });

    it('should handle function with local variables', async () => {
      const result = await evaluate(`calculate(x):
    y = x * 2
    z = y + 1
    return z

calculate(5)`);
      expect(result).toBe(11);
    });

    it('should handle nested function calls', async () => {
      const result = await evaluate(`double(x):
    return x * 2

quadruple(x):
    return double(double(x))

quadruple(3)`);
      expect(result).toBe(12);
    });

    it('should handle lexical scoping', async () => {
      const result = await evaluate(`x = 10

getX():
    return x

getX()`);
      expect(result).toBe(10);
    });
  });

  describe('If Statements', async () => {
    it('should execute then block when condition is true', async () => {
      const result = await evaluate(`if true:
    x = 1
x`);
      expect(result).toBe(1);
    });

    it('should skip then block when condition is false', async () => {
      const result = await evaluate(`x = 0
if false:
    x = 1
x`);
      expect(result).toBe(0);
    });

    it('should execute else block when condition is false', async () => {
      const result = await evaluate(`if false:
    x = 1
else:
    x = 2
x`);
      expect(result).toBe(2);
    });

    it('should execute else if block', async () => {
      const result = await evaluate(`x = 5
if x < 0:
    y = -1
else if x > 0:
    y = 1
else:
    y = 0
y`);
      expect(result).toBe(1);
    });

    it('should handle multiple else if blocks', async () => {
      const result = await evaluate(`x = 2
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

    it('should handle nested if statements', async () => {
      const result = await evaluate(`x = 5
y = 10
if x > 0:
    if y > 0:
        z = 1
z`);
      expect(result).toBe(1);
    });

    it('should handle truthiness', async () => {
      expect(await evaluate('if 1:\n    x = 1\nx')).toBe(1);
      expect(await evaluate('if 0:\n    x = 1\nelse:\n    x = 2\nx')).toBe(2);
      expect(await evaluate('if "hello":\n    x = 1\nx')).toBe(1);
      expect(await evaluate('if "":\n    x = 1\nelse:\n    x = 2\nx')).toBe(2);
    });
  });

  describe('For Loops', async () => {
    it('should iterate over range', async () => {
      const result = await evaluate(`sum = 0
for i in 5:
    sum = sum + i
sum`);
      expect(result).toBe(0 + 1 + 2 + 3 + 4);
    });

    it('should iterate over array', async () => {
      const result = await evaluate(`arr = [10, 20, 30]
sum = 0
for item in arr:
    sum = sum + item
sum`);
      expect(result).toBe(60);
    });

    it('should handle nested loops', async () => {
      const result = await evaluate(`count = 0
for i in 3:
    for j in 3:
        count = count + 1
count`);
      expect(result).toBe(9);
    });

    it('should handle loop variable in body', async () => {
      const result = await evaluate(`result = 0
for i in 5:
    result = i
result`);
      expect(result).toBe(4);
    });

    it('should throw error on non-iterable', async () => {
      await expect(
        evaluate(`for i in true:
    x = i`),
      ).rejects.toThrow('Cannot iterate over');
    });
  });

  describe('Return Statements', async () => {
    it('should return value from function', async () => {
      const result = await evaluate(`foo():
    return 42

foo()`);
      expect(result).toBe(42);
    });

    it('should return early from function', async () => {
      const result = await evaluate(`foo():
    return 1
    return 2

foo()`);
      expect(result).toBe(1);
    });

    it('should return from nested control flow', async () => {
      const result = await evaluate(`foo(x):
    if x > 0:
        return 1
    return 0

foo(5)`);
      expect(result).toBe(1);
    });

    it('should handle return without value', async () => {
      const result = await evaluate(`foo():
    x = 1
    return

foo()`);
      expect(result).toBeNull();
    });
  });

  describe('Built-in Functions', async () => {
    describe('roll()', async () => {
      it('should roll dice and return number', async () => {
        const result = await evaluate('roll("1d6")');
        expect(typeof result).toBe('number');
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(6);
      });

      it('should handle dice with modifiers', async () => {
        const result = await evaluate('roll("1d6+10")');
        expect(result).toBeGreaterThanOrEqual(11);
        expect(result).toBeLessThanOrEqual(16);
      });

      it('should handle multiple dice', async () => {
        const result = await evaluate('roll("2d6")');
        expect(result).toBeGreaterThanOrEqual(2);
        expect(result).toBeLessThanOrEqual(12);
      });
    });

    describe('Math functions', async () => {
      it('should floor number', async () => {
        expect(await evaluate('floor(3.7)')).toBe(3);
        expect(await evaluate('floor(3.2)')).toBe(3);
      });

      it('should ceil number', async () => {
        expect(await evaluate('ceil(3.2)')).toBe(4);
        expect(await evaluate('ceil(3.7)')).toBe(4);
      });

      it('should round number', async () => {
        expect(await evaluate('round(3.4)')).toBe(3);
        expect(await evaluate('round(3.5)')).toBe(4);
      });

      it('should calculate absolute value', async () => {
        expect(await evaluate('abs(-5)')).toBe(5);
        expect(await evaluate('abs(5)')).toBe(5);
      });

      it('should calculate min', async () => {
        expect(await evaluate('min(3, 5, 2)')).toBe(2);
      });

      it('should calculate max', async () => {
        expect(await evaluate('max(3, 5, 2)')).toBe(5);
      });
    });

    describe('announce() and log()', async () => {
      it('should capture announce messages', async () => {
        const lexer = new Lexer('announce("Hello")');
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const evaluator = new Evaluator();
        await evaluator.eval(ast);
        expect(evaluator.getAnnounceMessages()).toEqual(['Hello']);
      });

      it('should capture multiple announce messages', async () => {
        const lexer = new Lexer('announce("First")\nannounce("Second")');
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const evaluator = new Evaluator();
        await evaluator.eval(ast);
        expect(evaluator.getAnnounceMessages()).toEqual(['First', 'Second']);
      });

      it('should capture log messages', async () => {
        const lexer = new Lexer('log("Debug", 42)');
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const evaluator = new Evaluator();
        await evaluator.eval(ast);
        expect(evaluator.getLogMessages()).toEqual([['Debug', 42]]);
      });
    });
  });

  describe('String Interpolation', async () => {
    it('should interpolate variable in string', async () => {
      const result = await evaluate(`hp = 100
"You have {{hp}} health"`);
      expect(result).toBe('You have 100 health');
    });

    it('should interpolate multiple variables', async () => {
      const result = await evaluate(`hp = 100
max_hp = 150
"HP: {{hp}}/{{max_hp}}"`);
      expect(result).toBe('HP: 100/150');
    });

    it('should handle missing variable in interpolation', async () => {
      const result = await evaluate('"Value: {{missing}}"');
      expect(result).toBe('Value: {{missing}}');
    });

    it('should interpolate in announce', async () => {
      const lexer = new Lexer('damage = 10\nannounce("Dealt {{damage}} damage")');
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const evaluator = new Evaluator();
      await evaluator.eval(ast);
      expect(evaluator.getAnnounceMessages()).toEqual(['Dealt 10 damage']);
    });
  });

  describe('Member Access', async () => {
    it('should access object property', async () => {
      const result = await evaluate(`obj = [1, 2, 3]
obj.length`);
      expect(result).toBe(3);
    });
  });

  describe('Subscribe Calls', async () => {
    it('should evaluate subscribe arguments', async () => {
      const result = await evaluate('subscribe("HP", "Level")');
      expect(result).toEqual(['HP', 'Level']);
    });

    it('should handle variable references in subscribe', async () => {
      const result = await evaluate(`attr = "Constitution"
subscribe(attr, "Level")`);
      expect(result).toEqual(['Constitution', 'Level']);
    });
  });

  describe('Real Script Examples', async () => {
    it('should evaluate D&D modifier calculation', async () => {
      const result = await evaluate(`calculateModifier(score):
    return floor((score - 10) / 2)

calculateModifier(16)`);
      expect(result).toBe(3);
    });

    it('should evaluate attribute script', async () => {
      const result = await evaluate(`base = 10
con = 14
level = 5
con_bonus = con * 2
level_bonus = level * 5

return base + con_bonus + level_bonus`);
      expect(result).toBe(10 + 28 + 25);
    });

    it('should evaluate conditional damage calculation', async () => {
      const result = await evaluate(`attack_roll = 20
if attack_roll == 20:
    damage = 16
else:
    damage = 8
damage`);
      expect(result).toBe(16);
    });

    it('should evaluate loop accumulation', async () => {
      const result = await evaluate(`total = 0
for i in 10:
    total = total + i
total`);
      expect(result).toBe(45);
    });

    it('should evaluate nested control flow', async () => {
      const result = await evaluate(`checkStatus(hp):
    if hp > 50:
        return "Healthy"
    else if hp > 0:
        return "Injured"
    else:
        return "Dead"

checkStatus(75)`);
      expect(result).toBe('Healthy');
    });

    it('should evaluate recursive function', async () => {
      const result = await evaluate(`factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

factorial(5)`);
      expect(result).toBe(120);
    });

    it('should evaluate complex script with multiple features', async () => {
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
      const result = await evaluator.eval(ast);

      expect(result).toBe(21); // 8 + 10 + 3
      expect(evaluator.getAnnounceMessages()).toEqual(['Critical damage!']);
    });
  });

  describe('Error Handling', async () => {
    it('should throw error on undefined variable', async () => {
      await expect(evaluate('x')).rejects.toThrow(RuntimeError);
      await expect(evaluate('x')).rejects.toThrow('Undefined variable');
    });

    it('should throw error on calling non-function', async () => {
      await expect(
        evaluate(`x = 42
x()`),
      ).rejects.toThrow('is not a function');
    });

    it('should throw error on invalid array access', async () => {
      await expect(
        evaluate(`arr = [1, 2, 3]
arr[10]`),
      ).rejects.toThrow('Array index out of bounds');
    });

    it('should handle member access on primitives', async () => {
      // JavaScript allows member access on primitives (auto-boxing)
      const result = await evaluate('x = [1, 2, 3]\nx.length');
      expect(result).toBe(3);
    });
  });

  describe('Edge Cases', async () => {
    it('should handle empty program', async () => {
      expect(await evaluate('')).toBeNull();
    });

    it('should handle program with only comments', async () => {
      expect(await evaluate('// comment')).toBeNull();
    });

    it('should return last expression value', async () => {
      expect(await evaluate('1\n2\n3')).toBe(3);
    });

    it('should handle assignment as expression', async () => {
      expect(await evaluate('x = 42')).toBe(42);
    });
  });
});
