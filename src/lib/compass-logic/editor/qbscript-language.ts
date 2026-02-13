/**
 * QBScript language definition for CodeMirror 6
 * Syntax highlighting via StreamLanguage.
 */

import {
  HighlightStyle,
  StreamLanguage,
  syntaxHighlighting,
} from '@codemirror/language';
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

    // Built-in functions
    if (
      stream.match(
        /\b(roll|floor|ceil|round|announce|log)\b/,
      )
    ) {
      return 'builtin';
    }
    // console.log
    if (stream.match(/\bconsole\b/)) {
      return 'variableName';
    }
    if (stream.match(/\.log\b/)) {
      return 'builtin';
    }

    // Accessors
    if (stream.match(/\b(Owner|Target|Ruleset)\b/)) {
      return 'variable-2';
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
});

const qbscriptHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: '#708' },
  { tag: tags.controlKeyword, color: '#708' },
  { tag: tags.atom, color: '#219' },
  { tag: tags.number, color: '#164' },
  { tag: tags.string, color: '#a11' },
  { tag: tags.comment, color: '#940', fontStyle: 'italic' },
  { tag: tags.operator, color: '#708' },
  { tag: tags.variableName, color: '#30a' },
  { tag: tags.definition(tags.variableName), color: '#00f' },
  { tag: tags.invalid, color: '#f00' },
]);

export const qbscriptLanguage = qbscriptParser;
export const qbscriptHighlight = syntaxHighlighting(qbscriptHighlightStyle);

export function qbscript() {
  return [qbscriptLanguage, qbscriptHighlight];
}
