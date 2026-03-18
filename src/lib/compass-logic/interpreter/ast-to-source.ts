import type {
  ASTNode,
  ArrayAccess,
  ArrayLiteral,
  Assignment,
  MemberAssignment,
  AtEndOfNextTurnCall,
  AtStartOfNextTurnCall,
  AtStartOfTurnCall,
  AtEndOfTurnCall,
  BinaryOp,
  BooleanLiteral,
  ForLoop,
  FunctionCall,
  FunctionDef,
  Identifier,
  IfStatement,
  InTurnsCall,
  OnTurnAdvanceCall,
  WhileLoop,
  MemberAccess,
  MethodCall,
  NumberLiteral,
  ObjectLiteral,
  Program,
  ReturnStatement,
  StringLiteral,
  SubscribeCall,
  UnaryOp,
} from './ast';

/** Default: script lexer expects indentation in multiples of 4 spaces. */
const DEFAULT_INDENT = '    ';

/**
 * Convert an AST node to executable QBScript source code.
 * Used to reconstruct event handler bodies from parsed AST.
 * @param indentPerLevel - One level of indent (e.g. '\t' or '    '). Default 4 spaces.
 */
export function astToSource(
  node: ASTNode,
  indentLevel = 0,
  indentPerLevel: string = DEFAULT_INDENT,
): string {
  const safeIndent = indentPerLevel?.length ? indentPerLevel : DEFAULT_INDENT;
  const safeLevel =
    typeof indentLevel === 'number' && !Number.isNaN(indentLevel) ? Math.max(0, indentLevel) : 0;
  const prefix = safeIndent.repeat(safeLevel);

  switch (node.type) {
    case 'NumberLiteral':
      return String((node as NumberLiteral).value);
    case 'StringLiteral': {
      const { value } = node as StringLiteral;
      const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      return `"${escaped}"`;
    }
    case 'BooleanLiteral':
      return (node as BooleanLiteral).value ? 'true' : 'false';
    case 'Identifier':
      return (node as Identifier).name;
    case 'BinaryOp': {
      const bin = node as BinaryOp;
      const left = exprToSource(bin.left);
      const right = exprToSource(bin.right);
      return `${left} ${bin.operator} ${right}`;
    }
    case 'UnaryOp': {
      const un = node as UnaryOp;
      const operand = exprToSource(un.operand);
      return `${un.operator}${un.operator === '!' ? operand : ` ${operand}`}`;
    }
    case 'Assignment': {
      const a = node as Assignment;
      return `${prefix}${a.name} = ${exprToSource(a.value)}`;
    }
    case 'MemberAssignment': {
      const m = node as MemberAssignment;
      const lhs = exprToSource(m.target);
      if (m.compoundOperator) {
        return `${prefix}${lhs} ${m.compoundOperator}= ${exprToSource(m.value)}`;
      }
      return `${prefix}${lhs} = ${exprToSource(m.value)}`;
    }
    case 'FunctionCall': {
      const fc = node as FunctionCall;
      const args = fc.arguments.map(exprToSource).join(', ');
      return `${prefix}${fc.name}(${args})`;
    }
    case 'MethodCall': {
      const mc = node as MethodCall;
      const obj = exprToSource(mc.object);
      const args = mc.arguments.map(exprToSource).join(', ');
      return `${prefix}${obj}.${mc.method}(${args})`;
    }
    case 'MemberAccess': {
      const ma = node as MemberAccess;
      return `${exprToSource(ma.object)}.${ma.property}`;
    }
    case 'ArrayAccess': {
      const aa = node as ArrayAccess;
      return `${exprToSource(aa.object)}[${exprToSource(aa.index)}]`;
    }
    case 'ArrayLiteral': {
      const al = node as ArrayLiteral;
      const elements = al.elements.map(exprToSource).join(', ');
      return `[${elements}]`;
    }
    case 'ObjectLiteral': {
      const ol = node as ObjectLiteral;
      const props = ol.properties.map((p) => `${p.key}: ${exprToSource(p.value)}`).join(', ');
      return `{${props}}`;
    }
    case 'SubscribeCall': {
      const sc = node as SubscribeCall;
      const args = sc.arguments.map(exprToSource).join(', ');
      return `Subscribe(${args})`;
    }
    case 'ReturnStatement': {
      const ret = node as ReturnStatement;
      if (ret.value === null) {
        return `${prefix}return`;
      }
      return `${prefix}return ${exprToSource(ret.value)}`;
    }
    case 'IfStatement': {
      const ifNode = node as IfStatement;
      let out = `${prefix}if ${exprToSource(ifNode.condition)}:\n`;
      out += blockToSource(ifNode.thenBlock, safeLevel + 1, safeIndent);
      for (const elseif of ifNode.elseIfBlocks) {
        out += `${prefix}else if ${exprToSource(elseif.condition)}:\n`;
        out += blockToSource(elseif.block, safeLevel + 1, safeIndent);
      }
      if (ifNode.elseBlock !== null && ifNode.elseBlock.length > 0) {
        out += `${prefix}else:\n`;
        out += blockToSource(ifNode.elseBlock, safeLevel + 1, safeIndent);
      }
      return out;
    }
    case 'ForLoop': {
      const forNode = node as ForLoop;
      let out = `${prefix}for ${forNode.variable} in ${exprToSource(forNode.iterable)}:\n`;
      out += blockToSource(forNode.body, safeLevel + 1, safeIndent);
      return out;
    }
    case 'WhileLoop': {
      const whileNode = node as WhileLoop;
      let out = `${prefix}while ${exprToSource(whileNode.condition)}:\n`;
      out += blockToSource(whileNode.body, safeLevel + 1, safeIndent);
      return out;
    }
    case 'FunctionDef': {
      const fn = node as FunctionDef;
      const params = fn.params.join(', ');
      let out = `${prefix}${fn.name}(${params}):\n`;
      out += blockToSource(fn.body, safeLevel + 1, safeIndent);
      return out;
    }
    case 'InTurnsCall': {
      const it = node as InTurnsCall;
      let out = `${prefix}Scene.inTurns(${exprToSource(it.argument)}):\n`;
      out += blockToSource(it.block, safeLevel + 1, safeIndent);
      return out;
    }
    case 'OnTurnAdvanceCall': {
      const ot = node as OnTurnAdvanceCall;
      let out = `${prefix}Scene.onTurnAdvance():\n`;
      out += blockToSource(ot.block, safeLevel + 1, safeIndent);
      return out;
    }
    case 'AtStartOfNextTurnCall': {
      const ast = node as AtStartOfNextTurnCall;
      let out = `${prefix}${exprToSource(ast.object)}.atStartOfNextTurn():\n`;
      out += blockToSource(ast.block, safeLevel + 1, safeIndent);
      return out;
    }
    case 'AtEndOfNextTurnCall': {
      const aet = node as AtEndOfNextTurnCall;
      let out = `${prefix}${exprToSource(aet.object)}.atEndOfNextTurn():\n`;
      out += blockToSource(aet.block, safeLevel + 1, safeIndent);
      return out;
    }
    case 'AtStartOfTurnCall': {
      const ast2 = node as AtStartOfTurnCall;
      let out = `${prefix}${exprToSource(ast2.object)}.atStartOfTurn(${exprToSource(ast2.argument)}):\n`;
      out += blockToSource(ast2.block, safeLevel + 1, safeIndent);
      return out;
    }
    case 'AtEndOfTurnCall': {
      const aet2 = node as AtEndOfTurnCall;
      let out = `${prefix}${exprToSource(aet2.object)}.atEndOfTurn(${exprToSource(aet2.argument)}):\n`;
      out += blockToSource(aet2.block, safeLevel + 1, safeIndent);
      return out;
    }
    case 'Program': {
      const prog = node as Program;
      return blockToSource(prog.statements, safeLevel, safeIndent);
    }
    default:
      // Expression statement (standalone expression)
      return `${prefix}${exprToSource(node)}`;
  }
}

function exprToSource(node: ASTNode): string {
  switch (node.type) {
    case 'NumberLiteral':
      return String((node as NumberLiteral).value);
    case 'StringLiteral': {
      const { value } = node as StringLiteral;
      const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      return `"${escaped}"`;
    }
    case 'BooleanLiteral':
      return (node as BooleanLiteral).value ? 'true' : 'false';
    case 'Identifier':
      return (node as Identifier).name;
    case 'BinaryOp': {
      const bin = node as BinaryOp;
      return `${exprToSource(bin.left)} ${bin.operator} ${exprToSource(bin.right)}`;
    }
    case 'UnaryOp': {
      const un = node as UnaryOp;
      const operand = exprToSource(un.operand);
      return `${un.operator}${un.operator === '!' ? operand : ` ${operand}`}`;
    }
    case 'FunctionCall': {
      const fc = node as FunctionCall;
      const args = fc.arguments.map(exprToSource).join(', ');
      return `${fc.name}(${args})`;
    }
    case 'MethodCall': {
      const mc = node as MethodCall;
      const args = mc.arguments.map(exprToSource).join(', ');
      return `${exprToSource(mc.object)}.${mc.method}(${args})`;
    }
    case 'MemberAccess':
      return `${exprToSource((node as MemberAccess).object)}.${(node as MemberAccess).property}`;
    case 'ArrayAccess': {
      const aa = node as ArrayAccess;
      return `${exprToSource(aa.object)}[${exprToSource(aa.index)}]`;
    }
    case 'ArrayLiteral': {
      const al = node as ArrayLiteral;
      return `[${al.elements.map(exprToSource).join(', ')}]`;
    }
    case 'ObjectLiteral': {
      const ol = node as ObjectLiteral;
      const props = ol.properties.map((p) => `${p.key}: ${exprToSource(p.value)}`).join(', ');
      return `{${props}}`;
    }
    case 'SubscribeCall': {
      const sc = node as SubscribeCall;
      return `Subscribe(${sc.arguments.map(exprToSource).join(', ')})`;
    }
    default:
      return '';
  }
}

function blockToSource(
  statements: ASTNode[],
  indentLevel: number,
  indentPerLevel: string = DEFAULT_INDENT,
): string {
  const safeIndent = indentPerLevel?.length ? indentPerLevel : DEFAULT_INDENT;
  const safeLevel =
    typeof indentLevel === 'number' && !Number.isNaN(indentLevel) ? Math.max(0, indentLevel) : 0;
  if (statements.length === 0) {
    // Parser expects at least one indented line so the lexer emits INDENT
    const prefix = safeIndent.repeat(safeLevel);
    return `${prefix}0\n`;
  }
  return statements.map((stmt) => astToSource(stmt, safeLevel, safeIndent)).join('\n') + '\n';
}

/**
 * Return the body of an event handler as executable source.
 * The body is serialized at top level (indent 0) so the script runner can execute it directly.
 */
export function functionDefToExecutableSource(funcNode: FunctionDef): string {
  return blockToSource(funcNode.body, 0, DEFAULT_INDENT);
}

/**
 * Serialize a block of statements to source (e.g. for turn callback storage).
 * Uses one indent level so the result can be re-parsed as a block.
 */
export function blockStatementsToSource(statements: ASTNode[]): string {
  return blockToSource(statements, 1, DEFAULT_INDENT);
}
