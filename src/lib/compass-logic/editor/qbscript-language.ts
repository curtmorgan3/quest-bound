/**
 * QBScript language definition for CodeMirror 6
 * Syntax highlighting via StreamLanguage.
 */

import { HighlightStyle, StreamLanguage, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

interface QBScriptState {
  indentUnit: number;
}

const qbscriptParser = StreamLanguage.define<QBScriptState>({
  name: 'qbscript',
  startState() {
    return { indentUnit: 4 };
  },
  token(stream) {
    // Comments - single line
    if (stream.match(/\/\/.*/)) {
      return 'comment';
    }
    // Comments - block
    if (stream.match(/\/\*/)) {
      while (!stream.eol()) {
        if (stream.match(/\*\//)) break;
        stream.next();
      }
      return 'comment';
    }

    // Whitespace
    if (stream.eatSpace()) return null;

    // Keywords
    if (stream.match(/\b(if|else|elif|for|in|return|subscribe)\b/)) {
      return 'keyword';
    }
    // Booleans
    if (stream.match(/\b(true|false)\b/)) {
      return 'atom';
    }

    // Built-in functions (when not in call position; call position is handled below)
    if (stream.match(/\b(roll|floor|ceil|round|announce|log)\b/)) {
      stream.eatSpace();
      if (stream.peek() === '(') return 'function';
      return 'builtin';
    }
    // console.log
    if (stream.match(/\bconsole\b/)) {
      return 'variableName';
    }
    if (stream.match(/\.log\b/)) {
      return 'builtin';
    }

    // Accessors (Owner, Target, Ruleset - only when not followed by ()
    if (stream.match(/\b(Owner|Target|Ruleset)\b/)) {
      stream.eatSpace();
      if (stream.peek() === '(') return 'function';
      return 'variable-2';
    }

    // Function call or definition: identifier followed by ( (per parser/lexer specs)
    if (stream.match(/\w+/)) {
      stream.eatSpace();
      if (stream.peek() === '(') return 'function';
      return 'variableName';
    }

    // Numbers
    if (stream.match(/\d+(\.\d+)?/)) {
      return 'number';
    }

    // Double-quoted strings
    if (stream.match(/"/)) {
      let escaped = false;
      while (!stream.eol()) {
        const ch = stream.next();
        if (escaped) {
          escaped = false;
          continue;
        }
        if (ch === '\\') escaped = true;
        else if (ch === '"') break;
      }
      return 'string';
    }
    // Single-quoted strings
    if (stream.match(/'/)) {
      let escaped = false;
      while (!stream.eol()) {
        const ch = stream.next();
        if (escaped) {
          escaped = false;
          continue;
        }
        if (ch === '\\') escaped = true;
        else if (ch === "'") break;
      }
      return 'string';
    }

    // Operators
    if (
      stream.match(/[+\-*\/%<>=!&|]/) ||
      stream.match(/\*\*/) ||
      stream.match(/==|!=|>=|<=|&&|\|\|/)
    ) {
      return 'operator';
    }

    // Punctuation
    if (stream.match(/[()\[\]{},.:]/)) {
      return null;
    }

    // Identifiers and remaining words
    if (stream.match(/\w+/)) {
      return 'variableName';
    }

    stream.next();
    return null;
  },
  copyState(state: QBScriptState) {
    return { indentUnit: state.indentUnit };
  },
  tokenTable: {
    function: tags.function(tags.variableName),
  },
});

// One Dark Pro theme colors
const qbscriptHighlightStyle = HighlightStyle.define([
  { tag: tags.variableName, color: '#e06c75' },
  { tag: tags.string, color: '#98c379' },
  { tag: tags.keyword, color: '#c678dd' },
  { tag: tags.controlKeyword, color: '#c678dd' },
  { tag: tags.atom, color: '#56b6c2' },
  { tag: tags.number, color: '#d19a66' },
  { tag: tags.comment, color: '#5c6370', fontStyle: 'italic' },
  { tag: tags.operator, color: '#56b6c2' },
  { tag: tags.definition(tags.variableName), color: '#61afef' },
  { tag: tags.special(tags.variableName), color: '#e5c07b' },
  { tag: tags.function(tags.variableName), color: '#61afef' },
  { tag: tags.invalid, color: '#e06c75' },
]);

export const qbscriptLanguage = qbscriptParser;
export const qbscriptHighlight = syntaxHighlighting(qbscriptHighlightStyle);

export function qbscript() {
  return [qbscriptLanguage, qbscriptHighlight];
}
