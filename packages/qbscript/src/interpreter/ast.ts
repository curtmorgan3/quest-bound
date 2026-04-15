// AST Node Types for QBScript

export type ASTNode =
  | NumberLiteral
  | StringLiteral
  | BooleanLiteral
  | Identifier
  | BinaryOp
  | UnaryOp
  | Assignment
  | MemberAssignment
  | FunctionCall
  | MethodCall
  | FunctionDef
  | IfStatement
  | ForLoop
  | WhileLoop
  | ReturnStatement
  | SubscribeCall
  | InTurnsCall
  | OnTurnAdvanceCall
  | OnCustomEventCall
  | AtStartOfNextTurnCall
  | AtEndOfNextTurnCall
  | AtStartOfTurnCall
  | AtEndOfTurnCall
  | ArrayLiteral
  | ArrayAccess
  | ObjectLiteral
  | MemberAccess
  | Program;

export interface NumberLiteral {
  type: 'NumberLiteral';
  value: number;
}

export interface StringLiteral {
  type: 'StringLiteral';
  value: string;
}

export interface BooleanLiteral {
  type: 'BooleanLiteral';
  value: boolean;
}

export interface Identifier {
  type: 'Identifier';
  name: string;
}

export interface BinaryOp {
  type: 'BinaryOp';
  operator:
    | '+'
    | '-'
    | '*'
    | '/'
    | '**'
    | '%'
    | '=='
    | '!='
    | '>'
    | '<'
    | '>='
    | '<='
    | '&&'
    | '||';
  left: ASTNode;
  right: ASTNode;
}

export interface UnaryOp {
  type: 'UnaryOp';
  operator: '-' | '!';
  operand: ASTNode;
}

export interface Assignment {
  type: 'Assignment';
  name: string;
  value: ASTNode;
}

/** Assignment to a property, e.g. `obj.prop = v` or `a.b.c += 1`. */
export interface MemberAssignment {
  type: 'MemberAssignment';
  target: MemberAccess;
  value: ASTNode;
  /** If set, new value is `old <op> rhs` (e.g. `+=`). */
  compoundOperator?: BinaryOp['operator'];
}

export interface FunctionCall {
  type: 'FunctionCall';
  name: string;
  arguments: ASTNode[];
}

export interface MethodCall {
  type: 'MethodCall';
  object: ASTNode;
  method: string;
  arguments: ASTNode[];
}

export interface FunctionDef {
  type: 'FunctionDef';
  name: string;
  params: string[];
  body: ASTNode[];
}

export interface IfStatement {
  type: 'IfStatement';
  condition: ASTNode;
  thenBlock: ASTNode[];
  elseIfBlocks: { condition: ASTNode; block: ASTNode[] }[];
  elseBlock: ASTNode[] | null;
}

export interface ForLoop {
  type: 'ForLoop';
  variable: string;
  iterable: ASTNode;
  body: ASTNode[];
}

export interface WhileLoop {
  type: 'WhileLoop';
  condition: ASTNode;
  body: ASTNode[];
}

export interface ReturnStatement {
  type: 'ReturnStatement';
  value: ASTNode | null;
}

export interface SubscribeCall {
  type: 'SubscribeCall';
  arguments: ASTNode[];
}

/** Scene.inTurns(n): block — register callback to run in n cycles. */
export interface InTurnsCall {
  type: 'InTurnsCall';
  argument: ASTNode;
  block: ASTNode[];
}

/** Scene.onTurnAdvance(): block — register callback to run on every advance. */
export interface OnTurnAdvanceCall {
  type: 'OnTurnAdvanceCall';
  block: ASTNode[];
}

/** on(expr): block — register custom event listener; `payload` is injected when the handler runs. */
export interface OnCustomEventCall {
  type: 'OnCustomEventCall';
  eventExpr: ASTNode;
  block: ASTNode[];
}

/** character.atStartOfNextTurn(): block — register a one-shot callback for the start of that character's next turn. */
export interface AtStartOfNextTurnCall {
  type: 'AtStartOfNextTurnCall';
  /** The character expression (e.g. identifier `targ`, `Owner`, etc.). */
  object: ASTNode;
  block: ASTNode[];
}

/** character.atEndOfNextTurn(): block — register a one-shot callback for the end of that character's next turn. */
export interface AtEndOfNextTurnCall {
  type: 'AtEndOfNextTurnCall';
  /** The character expression (e.g. identifier `targ`, `Owner`, etc.). */
  object: ASTNode;
  block: ASTNode[];
}

/** character.atStartOfTurn(n): block — register a one-shot callback for the start of that character's nth turn from now. */
export interface AtStartOfTurnCall {
  type: 'AtStartOfTurnCall';
  object: ASTNode;
  /** Expression evaluating to the number of turns to wait (n=1 is equivalent to atStartOfNextTurn). */
  argument: ASTNode;
  block: ASTNode[];
}

/** character.atEndOfTurn(n): block — register a one-shot callback for the end of that character's nth turn from now. */
export interface AtEndOfTurnCall {
  type: 'AtEndOfTurnCall';
  object: ASTNode;
  /** Expression evaluating to the number of turns to wait (n=1 is equivalent to atEndOfNextTurn). */
  argument: ASTNode;
  block: ASTNode[];
}

export interface ArrayLiteral {
  type: 'ArrayLiteral';
  elements: ASTNode[];
}

export interface ArrayAccess {
  type: 'ArrayAccess';
  object: ASTNode;
  index: ASTNode;
}

export interface ObjectProperty {
  key: string;
  value: ASTNode;
}

export interface ObjectLiteral {
  type: 'ObjectLiteral';
  properties: ObjectProperty[];
}

export interface MemberAccess {
  type: 'MemberAccess';
  object: ASTNode;
  property: string;
}

export interface Program {
  type: 'Program';
  statements: ASTNode[];
}
