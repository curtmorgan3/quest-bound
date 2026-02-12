import { describe, it, expect } from 'vitest';
import { Lexer } from '@/lib/compass-logic/interpreter/lexer';
import { Parser } from '@/lib/compass-logic/interpreter/parser';
import { Evaluator } from '@/lib/compass-logic/interpreter/evaluator';

function executeScript(source: string): { result: any; duration: number } {
  const start = performance.now();
  
  const lexer = new Lexer(source);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();
  const evaluator = new Evaluator();
  const result = evaluator.eval(ast);
  
  const end = performance.now();
  const duration = end - start;
  
  return { result, duration };
}

describe('Interpreter Performance', () => {
  it('should tokenize simple script in < 10ms', () => {
    const source = `x = 42
y = x * 2
z = y + 10`;
    
    const start = performance.now();
    const lexer = new Lexer(source);
    lexer.tokenize();
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(10);
  });

  it('should parse simple script in < 10ms', () => {
    const source = `x = 42
y = x * 2
z = y + 10`;
    
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    
    const start = performance.now();
    const parser = new Parser(tokens);
    parser.parse();
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(10);
  });

  it('should execute simple arithmetic in < 100ms', () => {
    const source = `x = 2 + 3 * 4
y = x ** 2
z = y / 2`;
    
    const { duration } = executeScript(source);
    expect(duration).toBeLessThan(100);
  });

  it('should execute function definition and call in < 100ms', () => {
    const source = `calculateModifier(score):
    return floor((score - 10) / 2)

result = calculateModifier(16)`;
    
    const { duration } = executeScript(source);
    expect(duration).toBeLessThan(100);
  });

  it('should execute if/else logic in < 100ms', () => {
    const source = `x = 75
if x > 50:
    status = "Healthy"
else if x > 0:
    status = "Injured"
else:
    status = "Dead"`;
    
    const { duration } = executeScript(source);
    expect(duration).toBeLessThan(100);
  });

  it('should execute for loop in < 100ms', () => {
    const source = `total = 0
for i in 100:
    total = total + i`;
    
    const { duration } = executeScript(source);
    expect(duration).toBeLessThan(100);
  });

  it('should execute typical attribute script in < 100ms', () => {
    const source = `subscribe("Constitution", "Level")

base = 10
con = 14
level = 5
con_bonus = con * 2
level_bonus = level * 5

return base + con_bonus + level_bonus`;
    
    const { duration } = executeScript(source);
    expect(duration).toBeLessThan(100);
  });

  it('should execute complex script with multiple features in < 100ms', () => {
    const source = `calculateDamage(base, modifier):
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

total = 0
for i in 10:
    total = total + i

final = damage + total`;
    
    const { duration, result } = executeScript(source);
    expect(duration).toBeLessThan(100);
    expect(result).toBe(66); // 21 + 45
  });

  it('should execute recursive function in < 100ms', () => {
    const source = `factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

result = factorial(10)`;
    
    const { duration, result } = executeScript(source);
    expect(duration).toBeLessThan(100);
    expect(result).toBe(3628800);
  });

  it('should handle nested loops efficiently', () => {
    const source = `count = 0
for i in 10:
    for j in 10:
        count = count + 1`;
    
    const { duration, result } = executeScript(source);
    expect(duration).toBeLessThan(100);
    expect(result).toBe(100);
  });

  it('should execute array operations in < 100ms', () => {
    const source = `arr = [1, 2, 3, 4, 5]
sum = 0
for item in arr:
    sum = sum + item
result = sum * 2`;
    
    const { duration, result } = executeScript(source);
    expect(duration).toBeLessThan(100);
    expect(result).toBe(30);
  });
});
