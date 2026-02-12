#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { Evaluator, RuntimeError } from './evaluator';
import { Lexer } from './lexer';
import { Parser } from './parser';

function printHelp() {
  console.log(`
QBScript Interpreter CLI

Usage:
  qbs <file.qbs>              Run a QBScript file
  qbs --help                  Show this help message
  qbs --version               Show version

Options:
  --verbose, -v                    Show detailed execution information
  --tokens                         Show tokenized output
  --ast                            Show abstract syntax tree
  --no-result                      Don't print the final result

Examples:
  qbs script.qbs              Run script.qbs
  qbs -v script.qbs           Run with verbose output
  qbs --tokens script.qbs     Show tokens before execution
  `);
}

function printVersion() {
  console.log('QBScript Interpreter v1.0.0');
}

interface CliOptions {
  file?: string;
  verbose: boolean;
  showTokens: boolean;
  showAst: boolean;
  noResult: boolean;
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    verbose: false,
    showTokens: false,
    showAst: false,
    noResult: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (arg === '--version') {
      printVersion();
      process.exit(0);
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--tokens') {
      options.showTokens = true;
    } else if (arg === '--ast') {
      options.showAst = true;
    } else if (arg === '--no-result') {
      options.noResult = true;
    } else if (!arg.startsWith('-')) {
      options.file = arg;
    } else {
      console.error(`Unknown option: ${arg}`);
      process.exit(1);
    }
  }

  return options;
}

function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return String(value);
  }
  if (typeof value === 'string') {
    return `"${value}"`;
  }
  if (Array.isArray(value)) {
    return `[${value.map(formatValue).join(', ')}]`;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

function runScript(filePath: string, options: CliOptions) {
  // Read file
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const source = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);

  if (options.verbose) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running: ${fileName}`);
    console.log(`${'='.repeat(60)}\n`);
  }

  try {
    // Lexer
    const lexerStart = performance.now();
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const lexerTime = performance.now() - lexerStart;

    if (options.showTokens) {
      console.log('\n--- TOKENS ---');
      tokens.forEach((token, i) => {
        if (token.type !== 'EOF') {
          console.log(
            `${i.toString().padStart(3)}: ${token.type.padEnd(15)} ${
              token.value !== null ? formatValue(token.value) : ''
            } (${token.line}:${token.column})`,
          );
        }
      });
      console.log('');
    }

    // Parser
    const parserStart = performance.now();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const parserTime = performance.now() - parserStart;

    if (options.showAst) {
      console.log('\n--- AST ---');
      console.log(JSON.stringify(ast, null, 2));
      console.log('');
    }

    // Evaluator
    const evalStart = performance.now();
    const evaluator = new Evaluator();
    const result = evaluator.eval(ast);
    const evalTime = performance.now() - evalStart;

    // Print announce messages
    const announceMessages = evaluator.getAnnounceMessages();
    if (announceMessages.length > 0) {
      console.log('\n--- ANNOUNCEMENTS ---');
      announceMessages.forEach((msg) => {
        console.log(`📢 ${msg}`);
      });
    }

    // Print log messages
    const logMessages = evaluator.getLogMessages();
    if (logMessages.length > 0) {
      console.log('\n--- LOGS ---');
      logMessages.forEach((args) => {
        console.log(`🔍 ${args.map((arg) => formatValue(arg)).join(' ')}`);
      });
    }

    // Print result
    if (!options.noResult && result !== null && result !== undefined) {
      console.log('\n--- RESULT ---');
      console.log(formatValue(result));
    }

    // Print timing info
    if (options.verbose) {
      const totalTime = lexerTime + parserTime + evalTime;
      console.log('\n--- PERFORMANCE ---');
      console.log(`Lexer:     ${lexerTime.toFixed(2)}ms`);
      console.log(`Parser:    ${parserTime.toFixed(2)}ms`);
      console.log(`Evaluator: ${evalTime.toFixed(2)}ms`);
      console.log(`Total:     ${totalTime.toFixed(2)}ms`);
      console.log('');
    }
  } catch (error: any) {
    console.error('\n❌ ERROR');

    if (error instanceof RuntimeError) {
      console.error(`Runtime Error: ${error.message}`);
      if (error.line !== undefined && error.column !== undefined) {
        console.error(`  at line ${error.line}, column ${error.column}`);
      }
    } else if (error.name === 'ParseError') {
      console.error(`Parse Error: ${error.message}`);
    } else {
      console.error(error.message);
      if (options.verbose && error.stack) {
        console.error('\nStack trace:');
        console.error(error.stack);
      }
    }

    process.exit(1);
  }
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Error: No file specified');
    console.error('Run "qbscript --help" for usage information');
    process.exit(1);
  }

  const options = parseArgs(args);

  if (!options.file) {
    console.error('Error: No file specified');
    process.exit(1);
  }

  runScript(options.file, options);
}

// Run main if this is the entry point
main();

export { parseArgs, runScript };
