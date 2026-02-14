import type {
  ASTNode,
  Assignment,
  BinaryOp,
  BooleanLiteral,
  ForLoop,
  FunctionCall,
  FunctionDef,
  IfStatement,
  MemberAccess,
  MethodCall,
  NumberLiteral,
  ReturnStatement,
  StringLiteral,
  SubscribeCall,
  UnaryOp,
  ArrayLiteral,
  ArrayAccess,
  Identifier,
  Program,
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
  const prefix = indentPerLevel.repeat(indentLevel);

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
    case 'FunctionCall': {
      const fc = node as FunctionCall;
      const args = fc.arguments.map(exprToSource).join(', ');
      return `${fc.name}(${args})`;
    }
    case 'MethodCall': {
      const mc = node as MethodCall;
      const obj = exprToSource(mc.object);
      const args = mc.arguments.map(exprToSource).join(', ');
      return `${obj}.${mc.method}(${args})`;
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
      out += blockToSource(ifNode.thenBlock, indentLevel + 1, indentPerLevel);
      for (const elseif of ifNode.elseIfBlocks) {
        out += `${prefix}else if ${exprToSource(elseif.condition)}:\n`;
        out += blockToSource(elseif.block, indentLevel + 1, indentPerLevel);
      }
      if (ifNode.elseBlock !== null && ifNode.elseBlock.length > 0) {
        out += `${prefix}else:\n`;
        out += blockToSource(ifNode.elseBlock, indentLevel + 1, indentPerLevel);
      }
      return out;
    }
    case 'ForLoop': {
      const forNode = node as ForLoop;
      let out = `${prefix}for ${forNode.variable} in ${exprToSource(forNode.iterable)}:\n`;
      out += blockToSource(forNode.body, indentLevel + 1, indentPerLevel);
      return out;
    }
    case 'FunctionDef': {
      const fn = node as FunctionDef;
      const params = fn.params.join(', ');
      let out = `${prefix}${fn.name}(${params}):\n`;
      out += blockToSource(fn.body, indentLevel + 1, indentPerLevel);
      return out;
    }
    case 'Program': {
      const prog = node as Program;
      return blockToSource(prog.statements, indentLevel, indentPerLevel);
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
  if (statements.length === 0) {
    // Parser expects at least one indented line so the lexer emits INDENT
    const prefix = indentPerLevel.repeat(indentLevel);
    return `${prefix}0\n`;
  }
  return (
    statements.map((stmt) => astToSource(stmt, indentLevel, indentPerLevel)).join('\n') + '\n'
  );
}

/**
 * Reconstruct executable source for an event handler function.
 * Returns the full function definition followed by a call, so that
 * running the returned script defines and invokes the handler.
 * @param indentPerLevel - One level of indent (e.g. '\t' or '    ') to match original source.
 */
export function functionDefToExecutableSource(
  funcNode: FunctionDef,
  indentPerLevel: string = DEFAULT_INDENT,
): string {
  const fnSource = astToSource(funcNode, 0, indentPerLevel);
  return `${fnSource}\n${funcNode.name}()`;
}

/**
 * Detect indent style from source: tab or 4 spaces per level.
 * Uses the first line that has leading whitespace.
 */
export function detectIndentFromSource(sourceCode: string): string {
  const lines = sourceCode.split('\n');
  for (const line of lines) {
    const match = line.match(/^(\s+)/);
    if (match) {
      const indent = match[1];
      return indent.includes('\t') ? '\t' : DEFAULT_INDENT;
    }
  }
  return DEFAULT_INDENT;
}
