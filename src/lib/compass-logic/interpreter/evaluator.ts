import type { PromptFn, RollFn, RollSplitFn, SelectCharacterFn, SelectCharactersFn } from '@/types';
import { parseDiceExpression, rollDie } from '@/utils/dice-utils';
import { blockStatementsToSource } from './ast-to-source';
import { prepareForStructuredClone } from '../runtime/structured-clone-safe';
import type { ASTNode } from './ast';
import { isBuiltInArrayMethod, registerArrayMethod } from './built-ins';

export interface EvaluatorOptions {
  /** When set, used as the script built-in roll() instead of the default local roll. */
  roll?: RollFn;
  /** When set, used as the script built-in rollSplit() instead of the default local roll. */
  rollSplit?: RollSplitFn;
  /** When set, used as the script built-in prompt(msg, choices). Required for prompt() to work (e.g. in worker via bridge). */
  prompt?: PromptFn;
  /** When set, used as the script built-in selectCharacter(title?, description?). */
  selectCharacter?: SelectCharacterFn;
  /** When set, used as the script built-in selectCharacters(title?, description?). */
  selectCharacters?: SelectCharactersFn;
  /** When set, called after roll/rollSplit with an auto-generated log message (e.g. for game log). */
  onRollComplete?: (message: string) => Promise<void>;
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

  /** True only if this scope (not parent) has the variable. Used for assignment so we create locals instead of updating parent. */
  hasInCurrentScope(name: string): boolean {
    return this.variables.has(name);
  }
}

export class Evaluator {
  public globalEnv: Environment;
  private currentEnv: Environment;
  private announceMessages: string[];
  private logMessages: any[][];
  private isWorkerContext: boolean;
  private rollFn: RollFn | undefined;
  private rollSplitFn: RollSplitFn | undefined;
  private promptFn: PromptFn | undefined;
  private selectCharacterFn: SelectCharacterFn | undefined;
  private selectCharactersFn: SelectCharactersFn | undefined;
  private onRollComplete: ((message: string) => Promise<void>) | undefined;

  constructor(options?: EvaluatorOptions) {
    this.globalEnv = new Environment(null);
    this.currentEnv = this.globalEnv;
    this.announceMessages = [];
    this.logMessages = [];
    this.rollFn = options?.roll;
    this.rollSplitFn = options?.rollSplit;
    this.promptFn = options?.prompt;
    this.selectCharacterFn = options?.selectCharacter;
    this.selectCharactersFn = options?.selectCharacters;
    this.onRollComplete = options?.onRollComplete;
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

      case 'WhileLoop':
        return this.evalWhileLoop(node);

      case 'ReturnStatement':
        return this.evalReturnStatement(node);

      case 'SubscribeCall':
        return this.evalSubscribeCall(node);

      case 'InTurnsCall':
        return this.evalInTurnsCall(node);

      case 'OnTurnAdvanceCall':
        return this.evalOnTurnAdvanceCall(node);

      case 'AtStartOfNextTurnCall':
        return this.evalAtStartOfNextTurnCall(node);

      case 'AtEndOfNextTurnCall':
        return this.evalAtEndOfNextTurnCall(node);

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

    // If variable exists in current scope only, update it.
    // If it exists in a parent scope (e.g. loop body assigning to outer "result"), update there.
    // Otherwise define in current scope so assignment creates a local (e.g. "damage" inside apply_turn_damage).
    if (this.currentEnv.hasInCurrentScope(node.name)) {
      this.currentEnv.set(node.name, value);
    } else if (this.currentEnv.has(node.name)) {
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

    // Array-like (e.g. Owner.Items('Arrow')): support .count(), .first(), .last() so
    // plain arrays remain structured-cloneable when sent via postMessage from the worker.
    const isArrayLike = Array.isArray(object) || (object && typeof object.length === 'number');
    if (isArrayLike && node.method === 'sort') {
      const args = await Promise.all(node.arguments.map((arg: ASTNode) => this.eval(arg)));
      const compareFnVal = args[0];

      // Case A – no comparator or undefined/null: use native JS sort semantics
      if (compareFnVal === undefined || compareFnVal === null) {
        (object as any[]).sort();
        return object;
      }

      // Case B – comparator is a native JS function
      if (typeof compareFnVal === 'function') {
        (object as any[]).sort(compareFnVal as (a: unknown, b: unknown) => number);
        return object;
      }

      // Case C – comparator is a QBScript function value
      if (compareFnVal && typeof compareFnVal === 'object' && (compareFnVal as any).type === 'function') {
        const funcObj = compareFnVal as {
          type: 'function';
          params: string[];
          body: ASTNode[];
          closure: Environment;
        };

        const callComparator = async (a: any, b: any): Promise<number> => {
          const newEnv = new Environment(funcObj.closure);
          const params = funcObj.params ?? [];
          const values = [a, b];

          for (let i = 0; i < params.length; i++) {
            newEnv.define(params[i]!, i < values.length ? values[i] : undefined);
          }

          const prevEnv = this.currentEnv;
          this.currentEnv = newEnv;

          try {
            let result: any = null;
            for (const stmt of funcObj.body) {
              result = await this.eval(stmt);
            }
            this.currentEnv = prevEnv;
            if (typeof result !== 'number') {
              throw new RuntimeError('sort comparator must return a number');
            }
            return result;
          } catch (e) {
            this.currentEnv = prevEnv;
            if (e instanceof ReturnValue) {
              const value = e.value;
              if (typeof value !== 'number') {
                throw new RuntimeError('sort comparator must return a number');
              }
              return value;
            }
            throw e;
          }
        };

        const arr = object as any[];
        const n = arr.length ?? 0;

        // Simple in-place O(n^2) sort to allow async comparator invocations.
        for (let i = 0; i < n - 1; i++) {
          for (let j = i + 1; j < n; j++) {
            const cmp = await callComparator(arr[i], arr[j]);
            if (cmp > 0) {
              const tmp = arr[i];
              arr[i] = arr[j];
              arr[j] = tmp;
            }
          }
        }

        return arr;
      }

      // Case D – invalid comparator
      throw new RuntimeError('sort comparator must be a function');
    }
    if (isArrayLike && isBuiltInArrayMethod(node.method)) {
      return registerArrayMethod(node.method, object);
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
    const parentEnv = this.currentEnv;

    // Run each iteration in a child scope so the loop variable is in scope for the body.
    // Also define the loop variable in the parent after each iteration so code that runs
    // after the loop (e.g. mis-indented or serialized) can still resolve it.
    const runIteration = async (value: any) => {
      const loopEnv = new Environment(parentEnv);
      loopEnv.define(node.variable, value);
      parentEnv.define(node.variable, value);
      const prevEnv = this.currentEnv;
      this.currentEnv = loopEnv;
      try {
        return await this.evalBlock(node.body);
      } finally {
        this.currentEnv = prevEnv;
      }
    };

    // For-in range (e.g., for i in 10)
    if (typeof iterable === 'number') {
      for (let i = 0; i < iterable; i++) {
        result = await runIteration(i);
      }
    }
    // For-in array
    else if (Array.isArray(iterable)) {
      for (const item of iterable) {
        result = await runIteration(item);
      }
    } else {
      throw new RuntimeError(`Cannot iterate over ${typeof iterable}`);
    }

    return result;
  }

  /** Maximum iterations allowed in a while loop to prevent infinite loops. */
  private static readonly MAX_WHILE_ITERATIONS = 100_000;

  private async evalWhileLoop(node: any): Promise<any> {
    let result = null;
    let iterations = 0;

    while (this.isTruthy(await this.eval(node.condition))) {
      if (iterations >= Evaluator.MAX_WHILE_ITERATIONS) {
        throw new RuntimeError(
          `While loop exceeded maximum iterations (${Evaluator.MAX_WHILE_ITERATIONS})`,
        );
      }
      iterations++;

      result = await this.evalBlock(node.body);
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

  private async evalInTurnsCall(node: any): Promise<void> {
    if (!this.globalEnv.has('Scene')) return;
    const Scene = this.globalEnv.get('Scene');
    const n = await this.eval(node.argument);
    const blockSource = blockStatementsToSource(node.block);
    const Owner = this.globalEnv.has('Owner') ? this.globalEnv.get('Owner') : null;
    const ownerId = Owner?.id ?? null;
    const scriptId = this.globalEnv.has('__scriptId') ? this.globalEnv.get('__scriptId') : '';
    const { capturedCharacterIds, capturedValues } = this.captureClosureSnapshot(node.block);
    if (typeof Scene?.registerInTurns === 'function') {
      await Scene.registerInTurns(n, blockSource, ownerId, scriptId, capturedCharacterIds, capturedValues);
    }
  }

  private async evalOnTurnAdvanceCall(node: any): Promise<void> {
    if (!this.globalEnv.has('Scene')) return;
    const Scene = this.globalEnv.get('Scene');
    const blockSource = blockStatementsToSource(node.block);
    const Owner = this.globalEnv.has('Owner') ? this.globalEnv.get('Owner') : null;
    const ownerId = Owner?.id ?? null;
    const scriptId = this.globalEnv.has('__scriptId') ? this.globalEnv.get('__scriptId') : '';
    const { capturedCharacterIds, capturedValues } = this.captureClosureSnapshot(node.block);
    if (typeof Scene?.registerOnTurnAdvance === 'function') {
      await Scene.registerOnTurnAdvance(blockSource, ownerId, scriptId, capturedCharacterIds, capturedValues);
    }
  }

  private async evalAtStartOfNextTurnCall(node: any): Promise<void> {
    if (!this.globalEnv.has('Scene')) return;
    const Scene = this.globalEnv.get('Scene');
    const character = await this.eval(node.object);
    const characterId =
      character && typeof character.characterId === 'string' ? character.characterId : null;
    if (!characterId) return;
    const blockSource = blockStatementsToSource(node.block);
    const Owner = this.globalEnv.has('Owner') ? this.globalEnv.get('Owner') : null;
    const ownerId = Owner?.id ?? null;
    const scriptId = this.globalEnv.has('__scriptId') ? this.globalEnv.get('__scriptId') : '';
    const { capturedCharacterIds, capturedValues } = this.captureClosureSnapshot(node.block);
    if (typeof Scene?.registerCharacterTurnCallback === 'function') {
      await Scene.registerCharacterTurnCallback(
        characterId,
        'turn_start',
        blockSource,
        ownerId,
        scriptId,
        capturedCharacterIds,
        capturedValues,
      );
    }
  }

  private async evalAtEndOfNextTurnCall(node: any): Promise<void> {
    if (!this.globalEnv.has('Scene')) return;
    const Scene = this.globalEnv.get('Scene');
    const character = await this.eval(node.object);
    const characterId =
      character && typeof character.characterId === 'string' ? character.characterId : null;
    if (!characterId) return;
    const blockSource = blockStatementsToSource(node.block);
    const Owner = this.globalEnv.has('Owner') ? this.globalEnv.get('Owner') : null;
    const ownerId = Owner?.id ?? null;
    const scriptId = this.globalEnv.has('__scriptId') ? this.globalEnv.get('__scriptId') : '';
    const { capturedCharacterIds, capturedValues } = this.captureClosureSnapshot(node.block);
    if (typeof Scene?.registerCharacterTurnCallback === 'function') {
      await Scene.registerCharacterTurnCallback(
        characterId,
        'turn_end',
        blockSource,
        ownerId,
        scriptId,
        capturedCharacterIds,
        capturedValues,
      );
    }
  }

  /**
   * Walk the block AST and snapshot all outer-scope variables referenced inside it.
   * - Character accessors (have a non-empty string `.id`) → capturedCharacterIds (re-fetched at execution time).
   * - Primitives (string, number, boolean, null) → capturedValues (injected directly at execution time).
   * Built-in globals (Scene, Owner, Ruleset, __scriptId) are excluded; they are re-injected by the executor.
   */
  private captureClosureSnapshot(statements: ASTNode[]): {
    capturedCharacterIds: Record<string, string>;
    capturedValues: Record<string, string | number | boolean | null>;
  } {
    const BUILT_IN_GLOBALS = new Set(['Scene', 'Owner', 'Ruleset', '__scriptId']);
    const names = new Set<string>();

    const TEMPLATE_VAR_RE = /\{\{([^}]+)\}\}/g;

    const visit = (node: ASTNode): void => {
      if (!node || typeof node !== 'object') return;
      if ((node as any).type === 'Identifier') {
        names.add((node as any).name);
        return;
      }
      // Extract {{varName}} template references from string literals — these are resolved
      // at runtime by interpolateString() and never appear as Identifier AST nodes.
      if ((node as any).type === 'StringLiteral') {
        const raw: string = (node as any).value ?? '';
        let m: RegExpExecArray | null;
        TEMPLATE_VAR_RE.lastIndex = 0;
        while ((m = TEMPLATE_VAR_RE.exec(raw)) !== null) {
          names.add(m[1].trim());
        }
        return;
      }
      for (const value of Object.values(node as Record<string, unknown>)) {
        if (Array.isArray(value)) {
          for (const item of value) {
            if (item && typeof item === 'object' && 'type' in (item as object))
              visit(item as ASTNode);
          }
        } else if (value && typeof value === 'object' && 'type' in (value as object)) {
          visit(value as ASTNode);
        }
      }
    };

    for (const stmt of statements) visit(stmt);

    const capturedCharacterIds: Record<string, string> = {};
    const capturedValues: Record<string, string | number | boolean | null> = {};

    for (const name of names) {
      if (BUILT_IN_GLOBALS.has(name)) continue;
      if (!this.currentEnv.has(name)) continue;
      const value = this.currentEnv.get(name);
      if (value && typeof value === 'object' && typeof value.id === 'string' && value.id) {
        capturedCharacterIds[name] = value.id;
      } else if (
        value === null ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        capturedValues[name] = value;
      }
    }

    return { capturedCharacterIds, capturedValues };
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

  /**
   * Run a block of statements (e.g. for turn callbacks). Public API for executing parsed blocks.
   */
  async runBlock(statements: ASTNode[]): Promise<any> {
    return this.evalBlock(statements);
  }

  /**
   * Run a block in a child scope so variable assignments cannot overwrite globals (Scene, Owner, Ruleset).
   * Use this for turn callbacks so e.g. "test = 10" does not shadow or overwrite built-in bindings.
   */
  async runBlockInNewScope(statements: ASTNode[]): Promise<any> {
    const prevEnv = this.currentEnv;
    this.currentEnv = new Environment(this.currentEnv);
    try {
      return await this.runBlock(statements);
    } finally {
      this.currentEnv = prevEnv;
    }
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

  /** Local roll implementation: no UI, no injected rollFn. Used by roll() fallback and always by rollQuiet(). */
  private defaultLocalRoll(expression: string): number {
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
  }

  /** Local rollSplit: returns array of each die value in dice syntax order (no modifiers). */
  private defaultLocalRollSplit(expression: string): number[] {
    const segments = parseDiceExpression(expression);
    const values: number[] = [];
    for (const segment of segments) {
      for (const token of segment) {
        if (token.type === 'dice') {
          for (let i = 0; i < token.count; i++) {
            values.push(rollDie(token.sides));
          }
        }
      }
    }
    return values;
  }

  /** Persist an auto-generated log for roll/rollSplit when onRollComplete is set. */
  private async persistRollLog(total: number): Promise<void> {
    if (!this.onRollComplete) return;
    try {
      const owner = this.currentEnv.get('Owner');
      const ownerName = owner?.name ?? 'Someone';
      const message = `${ownerName} rolled a ${total}`;
      await this.onRollComplete(message);
    } catch {
      // Owner not in env or other error; skip persisting
    }
  }

  private registerBuiltins(): void {
    // Dice rolling: use injected roll when provided, otherwise default local implementation
    this.globalEnv.define(
      'roll',
      async (expression: string, rerollMessage?: string): Promise<number> => {
        if (this.rollFn) {
          const result = await this.rollFn(expression, rerollMessage);
          await this.persistRollLog(result);
          return result;
        }
        return this.defaultLocalRoll(expression);
      },
    );

    // Like roll but returns array of each die value in dice syntax order
    this.globalEnv.define(
      'rollSplit',
      async (expression: string, rerollMessage?: string): Promise<number[]> => {
        if (this.rollSplitFn) {
          const result = await this.rollSplitFn(expression, rerollMessage);
          const total = result.reduce((a, b) => a + b, 0);
          await this.persistRollLog(total);
          return result;
        }
        return this.defaultLocalRollSplit(expression);
      },
    );

    // Always use default local roll (no UI, no script-runner-registered roll)
    this.globalEnv.define('rollQuiet', (expression: string): number => {
      return this.defaultLocalRoll(expression);
    });

    // Wait: pause execution for the given number of seconds (integer or float)
    this.globalEnv.define(
      'wait',
      (numSeconds: number): Promise<void> =>
        new Promise((resolve) => setTimeout(resolve, Number(numSeconds) * 1000)),
    );

    // Prompt: show modal with message and choices; returns selected choice (requires injected promptFn, e.g. from worker bridge)
    this.globalEnv.define('prompt', async (msg: string, choices: string[]): Promise<string> => {
      if (!this.promptFn) {
        throw new RuntimeError(
          'prompt(msg, choices) is not available in this context (no prompt handler)',
        );
      }
      const normalizedChoices = Array.isArray(choices) ? choices.map(String) : [String(choices)];
      return this.promptFn(msg, normalizedChoices);
    });

    // Character selection: selectCharacter(title?, description?) -> character accessor or null
    this.globalEnv.define(
      'selectCharacter',
      async (title?: string, description?: string): Promise<any | null> => {
        if (!this.selectCharacterFn) {
          throw new RuntimeError(
            'selectCharacter(title?, description?) is not available in this context (no character selection handler)',
          );
        }
        const safeTitle = typeof title === 'string' && title.trim().length > 0 ? title : undefined;
        const safeDescription =
          typeof description === 'string' && description.trim().length > 0
            ? description
            : undefined;
        return this.selectCharacterFn(safeTitle, safeDescription);
      },
    );

    // Character selection: selectCharacters(title?, description?) -> array of character accessors
    this.globalEnv.define(
      'selectCharacters',
      async (title?: string, description?: string): Promise<any[]> => {
        if (!this.selectCharactersFn) {
          throw new RuntimeError(
            'selectCharacters(title?, description?) is not available in this context (no character selection handler)',
          );
        }
        const safeTitle = typeof title === 'string' && title.trim().length > 0 ? title : undefined;
        const safeDescription =
          typeof description === 'string' && description.trim().length > 0
            ? description
            : undefined;
        return this.selectCharactersFn(safeTitle, safeDescription);
      },
    );

    // Math functions
    this.globalEnv.define('floor', Math.floor);
    this.globalEnv.define('ceil', Math.ceil);
    this.globalEnv.define('round', Math.round);
    this.globalEnv.define('abs', Math.abs);
    this.globalEnv.define('min', Math.min);
    this.globalEnv.define('max', Math.max);

    // Type conversion: for strings, strip commas then parse (e.g. "1,000" → 1000, "3.14" → 3.14)
    this.globalEnv.define('number', (value: any): number => {
      if (typeof value === 'string') {
        const stripped = value.replace(/,/g, '');
        return Number(stripped);
      }
      return Number(value);
    });
    this.globalEnv.define('text', (value: any): string => String(value ?? '').trim());

    // Attribute helper: getAttr("HP") -> Owner.Attribute("HP").value
    this.globalEnv.define('getAttr', (name: string): any => {
      // Look up Owner in the current environment so scripts that shadow or omit Owner
      // behave consistently with direct Owner.Attribute(...) usage.
      const owner = this.currentEnv.get('Owner');
      if (!owner || typeof (owner as any).Attribute !== 'function') {
        throw new RuntimeError('Owner.Attribute is not available in this context');
      }
      const attributeProxy = (owner as any).Attribute(name);
      return attributeProxy?.value;
    });

    // Chart helper: getChart("Level Table") -> Ruleset.Chart("Level Table")
    this.globalEnv.define('getChart', (name: string): any => {
      const ruleset = this.currentEnv.get('Ruleset');
      if (!ruleset || typeof (ruleset as any).Chart !== 'function') {
        throw new RuntimeError('Ruleset.Chart is not available in this context');
      }
      return (ruleset as any).Chart(name);
    });

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

      // If in worker context, send signal to main thread (serialize so proxies are cloneable)
      if (this.isWorkerContext) {
        self.postMessage({
          type: 'CONSOLE_LOG',
          payload: { args: prepareForStructuredClone(args) },
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

  /** Append announce messages (e.g. from a turn callback) so they are included in script result. */
  addAnnounceMessages(messages: string[]): void {
    this.announceMessages.push(...messages);
  }

  /** Append log message batches (e.g. from a turn callback) so they are included in script result. */
  addLogMessages(batches: any[][]): void {
    this.logMessages.push(...batches);
  }
}
