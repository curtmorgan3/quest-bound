// AST Node Types for QBScript

export type ASTNode =
  | NumberLiteral
  | StringLiteral
  | BooleanLiteral
  | Identifier
  | BinaryOp
  | UnaryOp
  | Assignment
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
  | AtStartOfNextTurnCall
  | AtEndOfNextTurnCall
  | ArrayLiteral
  | ArrayAccess
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

export interface ArrayLiteral {
  type: 'ArrayLiteral';
  elements: ASTNode[];
}

export interface ArrayAccess {
  type: 'ArrayAccess';
  object: ASTNode;
  index: ASTNode;
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
