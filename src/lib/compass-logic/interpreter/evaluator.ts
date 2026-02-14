import { parseDiceExpression, rollDie } from '@/utils/dice-utils';
import type { ASTNode } from './ast';

/** Roll function usable in scripts: takes dice expression (e.g. "2d6+3"), returns total (sync or async). */
export type RollFn = (expression: string) => number | Promise<number>;

export interface EvaluatorOptions {
  /** When set, used as the script built-in roll() instead of the default local roll. */
  roll?: RollFn;
}

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
  private isWorkerContext: boolean;
  private rollFn: RollFn | undefined;

  constructor(options?: EvaluatorOptions) {
    this.globalEnv = new Environment(null);
    this.currentEnv = this.globalEnv;
    this.announceMessages = [];
    this.logMessages = [];
    this.rollFn = options?.roll;
    // Detect if we're running in a worker context
    this.isWorkerContext =
      typeof self !== 'undefined' &&
      typeof (self as any).WorkerGlobalScope !== 'undefined' &&
      self instanceof (self as any).WorkerGlobalScope;
    this.registerBuiltins();
  }

  async eval(node: ASTNode): Promise<any> {
    switch (node.type) {
      case 'Program':
        return this.evalProgram(node);

      case 'NumberLiteral':
        return node.value;

      case 'StringLiteral':
        return node.value;

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

  private async evalProgram(node: any): Promise<any> {
    let result = null;
    for (const statement of node.statements) {
      try {
        result = await this.eval(statement);
      } catch (e) {
        if (e instanceof ReturnValue) {
          return e.value;
        }
        throw e;
      }
    }
    return result;
  }

  private async evalBinaryOp(node: any): Promise<any> {
    const left = await this.eval(node.left);
    const right = await this.eval(node.right);

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

  private async evalUnaryOp(node: any): Promise<any> {
    const operand = await this.eval(node.operand);

    switch (node.operator) {
      case '-':
        return -operand;
      case '!':
        return !this.isTruthy(operand);
      default:
        throw new RuntimeError(`Unknown unary operator: ${node.operator}`);
    }
  }

  private async evalAssignment(node: any): Promise<any> {
    const value = await this.eval(node.value);

    // If variable exists in current scope or parent, update it
    // Otherwise, define it in current scope
    if (this.currentEnv.has(node.name)) {
      this.currentEnv.set(node.name, value);
    } else {
      this.currentEnv.define(node.name, value);
    }

    return value;
  }

  private async evalFunctionCall(node: any): Promise<any> {
    const func = this.currentEnv.get(node.name);

    // Built-in function (JavaScript function); may return Promise (e.g. injected roll)
    if (typeof func === 'function') {
      const args = await Promise.all(node.arguments.map((arg: ASTNode) => this.eval(arg)));
      const result = func(...args);
      return Promise.resolve(result);
    }

    // User-defined function
    if (func && typeof func === 'object' && func.type === 'function') {
      const newEnv = new Environment(func.closure);

      // Bind parameters
      for (let i = 0; i < func.params.length; i++) {
        const paramValue =
          i < node.arguments.length ? await this.eval(node.arguments[i]) : undefined;
        newEnv.define(func.params[i], paramValue);
      }

      // Execute function body
      const prevEnv = this.currentEnv;
      this.currentEnv = newEnv;

      try {
        let result = null;
        for (const stmt of func.body) {
          result = await this.eval(stmt);
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

  private async evalMethodCall(node: any): Promise<any> {
    const object = await this.eval(node.object);

    if (object === null || object === undefined) {
      throw new RuntimeError(`Cannot call method '${node.method}' on ${object}`);
    }

    const method = object[node.method];

    if (typeof method !== 'function') {
      throw new RuntimeError(`'${node.method}' is not a method of ${object}`);
    }

    const args = await Promise.all(node.arguments.map((arg: ASTNode) => this.eval(arg)));

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

  private async evalIfStatement(node: any): Promise<any> {
    const condition = await this.eval(node.condition);

    if (this.isTruthy(condition)) {
      return this.evalBlock(node.thenBlock);
    }

    // Check else if blocks
    for (const elseIf of node.elseIfBlocks) {
      if (this.isTruthy(await this.eval(elseIf.condition))) {
        return this.evalBlock(elseIf.block);
      }
    }

    // Check else block
    if (node.elseBlock) {
      return this.evalBlock(node.elseBlock);
    }

    return null;
  }

  private async evalForLoop(node: any): Promise<any> {
    const iterable = await this.eval(node.iterable);
    let result = null;

    // For-in range (e.g., for i in 10)
    if (typeof iterable === 'number') {
      for (let i = 0; i < iterable; i++) {
        this.currentEnv.define(node.variable, i);
        result = await this.evalBlock(node.body);
      }
    }
    // For-in array
    else if (Array.isArray(iterable)) {
      for (const item of iterable) {
        this.currentEnv.define(node.variable, item);
        result = await this.evalBlock(node.body);
      }
    } else {
      throw new RuntimeError(`Cannot iterate over ${typeof iterable}`);
    }

    return result;
  }

  private async evalReturnStatement(node: any): Promise<never> {
    const value = node.value ? await this.eval(node.value) : null;
    throw new ReturnValue(value);
  }

  private async evalSubscribeCall(node: any): Promise<any> {
    // For now, just evaluate arguments (in Phase 4 this will register subscriptions)
    const args = await Promise.all(node.arguments.map((arg: ASTNode) => this.eval(arg)));
    return args;
  }

  private async evalArrayLiteral(node: any): Promise<any[]> {
    return Promise.all(node.elements.map((element: ASTNode) => this.eval(element)));
  }

  private async evalArrayAccess(node: any): Promise<any> {
    const array = await this.eval(node.object);
    const index = await this.eval(node.index);

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

  private async evalMemberAccess(node: any): Promise<any> {
    const object = await this.eval(node.object);

    if (object === null || object === undefined) {
      throw new RuntimeError(`Cannot access property '${node.property}' of ${object}`);
    }

    return object[node.property];
  }

  private async evalBlock(statements: ASTNode[]): Promise<any> {
    let result = null;
    for (const stmt of statements) {
      result = await this.eval(stmt);
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
    // Dice rolling: use injected roll when provided, otherwise default local implementation
    this.globalEnv.define('roll', async (expression: string): Promise<number> => {
      if (this.rollFn) {
        const result = await this.rollFn(expression);
        return result;
      }
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

      // If in worker context, send signal to main thread
      if (this.isWorkerContext) {
        self.postMessage({
          type: 'ANNOUNCE',
          payload: { message },
        });
      }
    });

    this.globalEnv.define('log', (...args: any[]): void => {
      this.logMessages.push(args);

      // If in worker context, send signal to main thread
      if (this.isWorkerContext) {
        self.postMessage({
          type: 'CONSOLE_LOG',
          payload: { args },
        });
      }
    });

    // Reactive system function
    // Note: subscribe() is mainly used for static analysis
    // The actual subscription registration happens via DependencyGraph
    this.globalEnv.define('subscribe', (...attributeNames: any[]): void => {
      // In runtime, this is a no-op since subscriptions are handled by static analysis
      // But we define it so scripts can call it without errors
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
