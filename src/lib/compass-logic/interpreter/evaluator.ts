import type { ASTNode } from './ast';
import { parseDiceExpression, rollDie } from '@/utils/dice-utils';

export class RuntimeError extends Error {
  constructor(
    message: string,
    public line?: number,
    public column?: number,
  ) {
    super(message);
    this.name = 'RuntimeError';
  }
}

class ReturnValue {
  constructor(public value: any) {}
}

export class Environment {
  private variables: Map<string, any>;
  public parent: Environment | null;

  constructor(parent: Environment | null = null) {
    this.variables = new Map();
    this.parent = parent;
  }

  get(name: string): any {
    if (this.variables.has(name)) {
      return this.variables.get(name);
    }

    if (this.parent) {
      return this.parent.get(name);
    }

    throw new RuntimeError(`Undefined variable '${name}'`);
  }

  set(name: string, value: any): void {
    if (this.variables.has(name)) {
      this.variables.set(name, value);
      return;
    }

    if (this.parent) {
      this.parent.set(name, value);
      return;
    }

    throw new RuntimeError(`Undefined variable '${name}'`);
  }

  define(name: string, value: any): void {
    this.variables.set(name, value);
  }

  has(name: string): boolean {
    return this.variables.has(name) || (this.parent ? this.parent.has(name) : false);
  }
}

export class Evaluator {
  public globalEnv: Environment;
  private currentEnv: Environment;
  private announceMessages: string[];
  private logMessages: any[][];

  constructor() {
    this.globalEnv = new Environment(null);
    this.currentEnv = this.globalEnv;
    this.announceMessages = [];
    this.logMessages = [];
    this.registerBuiltins();
  }

  eval(node: ASTNode): any {
    switch (node.type) {
      case 'Program':
        return this.evalProgram(node);

      case 'NumberLiteral':
        return node.value;

      case 'StringLiteral':
        return this.interpolateString(node.value);

      case 'BooleanLiteral':
        return node.value;

      case 'Identifier':
        return this.currentEnv.get(node.name);

      case 'BinaryOp':
        return this.evalBinaryOp(node);

      case 'UnaryOp':
        return this.evalUnaryOp(node);

      case 'Assignment':
        return this.evalAssignment(node);

      case 'FunctionCall':
        return this.evalFunctionCall(node);

      case 'MethodCall':
        return this.evalMethodCall(node);

      case 'FunctionDef':
        return this.evalFunctionDef(node);

      case 'IfStatement':
        return this.evalIfStatement(node);

      case 'ForLoop':
        return this.evalForLoop(node);

      case 'ReturnStatement':
        return this.evalReturnStatement(node);

      case 'SubscribeCall':
        return this.evalSubscribeCall(node);

      case 'ArrayLiteral':
        return this.evalArrayLiteral(node);

      case 'ArrayAccess':
        return this.evalArrayAccess(node);

      case 'MemberAccess':
        return this.evalMemberAccess(node);

      default:
        throw new RuntimeError(`Unknown node type: ${(node as any).type}`);
    }
  }

  private evalProgram(node: any): any {
    let result = null;
    for (const statement of node.statements) {
      try {
        result = this.eval(statement);
      } catch (e) {
        if (e instanceof ReturnValue) {
          return e.value;
        }
        throw e;
      }
    }
    return result;
  }

  private evalBinaryOp(node: any): any {
    const left = this.eval(node.left);
    const right = this.eval(node.right);

    switch (node.operator) {
      case '+':
        return left + right;
      case '-':
        return left - right;
      case '*':
        return left * right;
      case '/':
        if (right === 0) {
          throw new RuntimeError('Division by zero');
        }
        return left / right;
      case '**':
        return Math.pow(left, right);
      case '%':
        if (right === 0) {
          throw new RuntimeError('Modulo by zero');
        }
        return left % right;
      case '==':
        return left === right;
      case '!=':
        return left !== right;
      case '>':
        return left > right;
      case '<':
        return left < right;
      case '>=':
        return left >= right;
      case '<=':
        return left <= right;
      case '&&':
        return this.isTruthy(left) && this.isTruthy(right);
      case '||':
        return this.isTruthy(left) || this.isTruthy(right);
      default:
        throw new RuntimeError(`Unknown binary operator: ${node.operator}`);
    }
  }

  private evalUnaryOp(node: any): any {
    const operand = this.eval(node.operand);

    switch (node.operator) {
      case '-':
        return -operand;
      case '!':
        return !this.isTruthy(operand);
      default:
        throw new RuntimeError(`Unknown unary operator: ${node.operator}`);
    }
  }

  private evalAssignment(node: any): any {
    const value = this.eval(node.value);
    
    // If variable exists in current scope or parent, update it
    // Otherwise, define it in current scope
    if (this.currentEnv.has(node.name)) {
      this.currentEnv.set(node.name, value);
    } else {
      this.currentEnv.define(node.name, value);
    }
    
    return value;
  }

  private evalFunctionCall(node: any): any {
    const func = this.currentEnv.get(node.name);

    // Built-in function (JavaScript function)
    if (typeof func === 'function') {
      const args = node.arguments.map((arg: ASTNode) => this.eval(arg));
      return func(...args);
    }

    // User-defined function
    if (func && typeof func === 'object' && func.type === 'function') {
      const newEnv = new Environment(func.closure);

      // Bind parameters
      for (let i = 0; i < func.params.length; i++) {
        const paramValue = i < node.arguments.length ? this.eval(node.arguments[i]) : undefined;
        newEnv.define(func.params[i], paramValue);
      }

      // Execute function body
      const prevEnv = this.currentEnv;
      this.currentEnv = newEnv;

      try {
        let result = null;
        for (const stmt of func.body) {
          result = this.eval(stmt);
        }
        this.currentEnv = prevEnv;
        return result;
      } catch (e) {
        this.currentEnv = prevEnv;
        if (e instanceof ReturnValue) {
          return e.value;
        }
        throw e;
      }
    }

    throw new RuntimeError(`'${node.name}' is not a function`);
  }

  private evalMethodCall(node: any): any {
    const object = this.eval(node.object);
    
    if (object === null || object === undefined) {
      throw new RuntimeError(`Cannot call method '${node.method}' on ${object}`);
    }

    const method = object[node.method];
    
    if (typeof method !== 'function') {
      throw new RuntimeError(`'${node.method}' is not a method of ${object}`);
    }

    const args = node.arguments.map((arg: ASTNode) => this.eval(arg));
    
    // Call the method with the object as 'this' context
    return method.apply(object, args);
  }

  private evalFunctionDef(node: any): void {
    // Store function in environment
    this.currentEnv.define(node.name, {
      type: 'function',
      params: node.params,
      body: node.body,
      closure: this.currentEnv, // Lexical scope
    });
  }

  private evalIfStatement(node: any): any {
    const condition = this.eval(node.condition);

    if (this.isTruthy(condition)) {
      return this.evalBlock(node.thenBlock);
    }

    // Check else if blocks
    for (const elseIf of node.elseIfBlocks) {
      if (this.isTruthy(this.eval(elseIf.condition))) {
        return this.evalBlock(elseIf.block);
      }
    }

    // Check else block
    if (node.elseBlock) {
      return this.evalBlock(node.elseBlock);
    }

    return null;
  }

  private evalForLoop(node: any): any {
    const iterable = this.eval(node.iterable);
    let result = null;

    // For-in range (e.g., for i in 10)
    if (typeof iterable === 'number') {
      for (let i = 0; i < iterable; i++) {
        this.currentEnv.define(node.variable, i);
        result = this.evalBlock(node.body);
      }
    }
    // For-in array
    else if (Array.isArray(iterable)) {
      for (const item of iterable) {
        this.currentEnv.define(node.variable, item);
        result = this.evalBlock(node.body);
      }
    } else {
      throw new RuntimeError(`Cannot iterate over ${typeof iterable}`);
    }

    return result;
  }

  private evalReturnStatement(node: any): never {
    const value = node.value ? this.eval(node.value) : null;
    throw new ReturnValue(value);
  }

  private evalSubscribeCall(node: any): any {
    // For now, just evaluate arguments (in Phase 4 this will register subscriptions)
    const args = node.arguments.map((arg: ASTNode) => this.eval(arg));
    return args;
  }

  private evalArrayLiteral(node: any): any[] {
    return node.elements.map((element: ASTNode) => this.eval(element));
  }

  private evalArrayAccess(node: any): any {
    const array = this.eval(node.object);
    const index = this.eval(node.index);

    if (!Array.isArray(array)) {
      throw new RuntimeError('Cannot index non-array');
    }

    if (typeof index !== 'number') {
      throw new RuntimeError('Array index must be a number');
    }

    if (index < 0 || index >= array.length) {
      throw new RuntimeError(`Array index out of bounds: ${index}`);
    }

    return array[index];
  }

  private evalMemberAccess(node: any): any {
    const object = this.eval(node.object);
    
    if (object === null || object === undefined) {
      throw new RuntimeError(`Cannot access property '${node.property}' of ${object}`);
    }

    return object[node.property];
  }

  private evalBlock(statements: ASTNode[]): any {
    let result = null;
    for (const stmt of statements) {
      result = this.eval(stmt);
    }
    return result;
  }

  private isTruthy(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.length > 0;
    return true;
  }

  private interpolateString(str: string): string {
    return str.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
      try {
        const value = this.currentEnv.get(varName.trim());
        return value !== undefined && value !== null ? String(value) : match;
      } catch {
        return match;
      }
    });
  }

  private registerBuiltins(): void {
    // Dice rolling
    this.globalEnv.define('roll', (expression: string): number => {
      const segments = parseDiceExpression(expression);
      let total = 0;

      for (const segment of segments) {
        for (const token of segment) {
          if (token.type === 'dice') {
            for (let i = 0; i < token.count; i++) {
              total += rollDie(token.sides);
            }
          } else if (token.type === 'modifier') {
            total += token.value;
          }
        }
      }

      return total;
    });

    // Math functions
    this.globalEnv.define('floor', Math.floor);
    this.globalEnv.define('ceil', Math.ceil);
    this.globalEnv.define('round', Math.round);
    this.globalEnv.define('abs', Math.abs);
    this.globalEnv.define('min', Math.min);
    this.globalEnv.define('max', Math.max);

    // UI functions
    this.globalEnv.define('announce', (...args: any[]): void => {
      const message = args.map((arg) => String(arg)).join(' ');
      this.announceMessages.push(message);
    });

    this.globalEnv.define('log', (...args: any[]): void => {
      this.logMessages.push(args);
    });
  }

  // Getters for messages (useful for testing and Phase 6)
  getAnnounceMessages(): string[] {
    return [...this.announceMessages];
  }

  getLogMessages(): any[][] {
    return [...this.logMessages];
  }

  clearMessages(): void {
    this.announceMessages = [];
    this.logMessages = [];
  }
}
