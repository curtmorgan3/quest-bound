# Phase 1: Unit Tests Implementation Prompt

## Context

You are implementing Phase 1 of the Quest Bound testing strategy. This phase focuses on establishing unit testing infrastructure and covering critical pure functions with Vitest.

## Objective

Set up Vitest for unit testing and write comprehensive unit tests for pure TypeScript utility functions. These are the highest priority tests because they:
- Cover critical game logic (dice rolling)
- Are pure functions (easy to test, no dependencies)
- Provide immediate value and quick wins
- Establish patterns for future unit tests

## Prerequisites

Read these files first to understand the codebase:
- `agents/test-strategy.md` - Overall testing strategy
- `src/utils/dice-utils.ts` - Dice rolling utilities to test
- `src/utils/helpers.ts` - Helper utilities to test
- `src/lib/compass-planes/utils/node-conversion.ts` - Node conversion utilities
- `src/lib/compass-planes/utils/inject-character-data.ts` - Data injection utilities
- `src/lib/compass-planes/utils/inject-defaults.ts` - Default value utilities
- `package.json` - Current dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `vite.config.ts` - Vite configuration

## Tasks

### 1. Install Dependencies

Install Vitest and related testing dependencies:

```bash
npm install -D vitest @vitest/coverage-v8 @testing-library/jest-dom
```

### 2. Create Vitest Configuration

Create `vitest.config.ts` in the project root with:
- React plugin support
- TypeScript path aliases (use vite-tsconfig-paths)
- jsdom environment
- Coverage configuration excluding:
  - node_modules/
  - tests/
  - cypress/
  - dist/
  - **/*.test.ts
  - **/*.test.tsx
  - **/*.config.ts
  - **/types/
  - src/components/ui/** (Radix primitives)
- Setup file reference
- Global test utilities

### 3. Create Test Setup File

Create `tests/setup.ts` with:
- Import @testing-library/jest-dom for extended matchers
- Any global test utilities
- Mock configurations if needed

### 4. Create Directory Structure

Create the following directory structure:
```
tests/
└── unit/
    ├── utils/
    ├── lib/
    │   └── compass-planes/
    │       └── utils/
    └── setup.ts
```

### 5. Write Unit Tests

Create comprehensive unit tests for each utility file:

#### A. Dice Utilities (`tests/unit/utils/dice-utils.test.ts`)

Test the following functions from `src/utils/dice-utils.ts`:

**`parseDiceExpression(roll: string): DiceToken[][]`**
- Test cases:
  - Simple dice: "2d6" → tokens with count=2, sides=6
  - Dice with modifier: "1d20+5" → dice token + modifier token
  - Dice with negative modifier: "3d8-2"
  - Multiple dice: "2d6+1d4+3"
  - Multiple segments (comma-separated): "2d6, 1d20+5"
  - Edge cases: "0d6", "2d0", invalid strings, empty string
  - Whitespace handling: "2 d 6 + 4"

**`rollDie(sides: number): number`**
- Test cases:
  - Returns value between 1 and sides (inclusive)
  - Test with various side counts: d4, d6, d8, d10, d12, d20, d100
  - Edge cases: d1 (always returns 1)
  - Run multiple times to verify range (use loops)

**`formatSegmentResult(s: SegmentResult): string`**
- Test cases:
  - Format with rolls and no modifier
  - Format with rolls and positive modifier
  - Format with rolls and negative modifier
  - Format with no rolls (modifier only)
  - Verify output format matches expected pattern

**`parseTextForDiceRolls(text?: string): string[]`**
- Test cases:
  - Text with single dice expression: "Restores 1d6 HP" → ["1d6"]
  - Text with multiple dice: "Deals 2d6+4 damage and 1d4 fire" → ["2d6+4", "1d4"]
  - Text with no dice expressions → []
  - undefined/null input → []
  - Complex text with mixed content
  - Whitespace in dice expressions should be removed

#### B. Helper Utilities (`tests/unit/utils/helpers.test.ts`)

Test the following functions from `src/utils/helpers.ts`:

**`generateId(context?: string): string`**
- Test cases:
  - Without context: returns valid UUID format
  - With context: returns "context-uuid" format
  - Multiple calls return different IDs
  - UUID format validation (regex check)

**`isRunningLocally(): boolean`**
- Test cases:
  - Mock window.location.href with "localhost" → returns true
  - Mock window.location.href without "localhost" → returns false
  - Various URL patterns (http://localhost:5173, https://app.questbound.com)

#### C. Node Conversion Utilities (`tests/unit/lib/compass-planes/utils/node-conversion.test.ts`)

Read `src/lib/compass-planes/utils/node-conversion.ts` and test all exported functions:
- Component to node conversion
- Node to component conversion
- Data transformation logic
- Edge cases and null handling

**Note:** Examine the file first to understand the functions and their signatures before writing tests.

#### D. Character Data Injection (`tests/unit/lib/compass-planes/utils/inject-character-data.test.ts`)

Read `src/lib/compass-planes/utils/inject-character-data.ts` and test the data injection logic:
- Template interpolation: "{{attribute_name}}" replacement
- Special tokens: "{{name}}" for character name
- Missing attributes: should handle gracefully
- Nested data structures
- Multiple interpolations in single string
- Edge cases: empty strings, no templates, malformed templates

#### E. Default Value Injection (`tests/unit/lib/compass-planes/utils/inject-defaults.test.ts`)

Read `src/lib/compass-planes/utils/inject-defaults.ts` and test the default value logic:
- Default value application for different attribute types
- Type-specific defaults (string, number, boolean, list)
- Attribute initialization
- Edge cases and null handling

### 6. Update package.json Scripts

Add the following scripts to `package.json`:

```json
{
  "scripts": {
    "test:unit": "vitest run",
    "test:unit:watch": "vitest",
    "test:unit:coverage": "vitest run --coverage",
    "test:coverage": "npm run test:unit:coverage"
  }
}
```

### 7. Verify Setup

Run the following commands to verify everything works:

```bash
# Run unit tests
npm run test:unit

# Run with coverage
npm run test:unit:coverage

# Run in watch mode (then exit)
npm run test:unit:watch
```

## Test Writing Guidelines

### Structure
Use the Arrange-Act-Assert pattern:
```typescript
import { describe, it, expect } from 'vitest';

describe('functionName', () => {
  it('should do something specific', () => {
    // Arrange - Set up test data
    const input = 'test';
    
    // Act - Execute the function
    const result = functionName(input);
    
    // Assert - Verify the result
    expect(result).toBe('expected');
  });
});
```

### Naming
- Use descriptive test names that explain the behavior
- Format: "should [expected behavior] when [condition]"
- Group related tests in describe blocks

### Coverage
- Test happy paths (normal usage)
- Test edge cases (empty, null, undefined, boundary values)
- Test error conditions (invalid input)
- Test all code branches

### Best Practices
- Keep tests independent (no shared state)
- Use beforeEach/afterEach for setup/cleanup
- Mock external dependencies (window, localStorage, etc.)
- Test behavior, not implementation details
- Keep tests simple and readable

## Success Criteria

Phase 1 is complete when:
- ✅ Vitest is configured and running successfully
- ✅ All 5 utility files have comprehensive unit tests
- ✅ Tests cover happy paths, edge cases, and error conditions
- ✅ 80%+ code coverage for tested utility files
- ✅ All tests pass consistently
- ✅ Tests run in < 5 seconds
- ✅ Coverage report generates successfully
- ✅ npm scripts work correctly

## Deliverables

1. `vitest.config.ts` - Vitest configuration
2. `tests/setup.ts` - Test setup file
3. `tests/unit/utils/dice-utils.test.ts` - Dice utility tests
4. `tests/unit/utils/helpers.test.ts` - Helper utility tests
5. `tests/unit/lib/compass-planes/utils/node-conversion.test.ts` - Node conversion tests
6. `tests/unit/lib/compass-planes/utils/inject-character-data.test.ts` - Data injection tests
7. `tests/unit/lib/compass-planes/utils/inject-defaults.test.ts` - Default value tests
8. Updated `package.json` with new scripts
9. Coverage report (HTML) showing 80%+ coverage for utilities

## Notes

- Focus on pure functions only in this phase
- No React component testing yet (that's Phase 2)
- No database mocking needed (that's Phase 4)
- Keep tests fast and focused
- Establish patterns that can be replicated for future unit tests

## After Completion

Once Phase 1 is complete:
1. Review test coverage report
2. Document any patterns or utilities created
3. Prepare for Phase 2 (Component Tests)
4. Consider adding unit tests to CI/CD pipeline
