# Testing Guide for Quest Bound

This document provides an overview of the testing infrastructure and how to run tests.

## Test Types

Quest Bound uses three types of tests:

1. **Unit Tests** - Test individual functions and utilities
2. **Component Tests** - Test React components in isolation
3. **E2E Tests** - Test complete user workflows

## Running Tests

### Unit Tests (Vitest)

```bash
# Run all unit tests
npm run test:unit

# Run unit tests in watch mode
npm run test:unit:watch

# Run unit tests with coverage
npm run test:unit:coverage
```

**Location**: `tests/unit/`
**Framework**: Vitest
**Coverage Target**: 80%+ for tested utilities

### Component Tests (Cypress)

```bash
# Run component tests headlessly
npm run test:component

# Open component test UI
npm run test:component:open
```

**Location**: `cypress/component/`
**Framework**: Cypress Component Testing
**Coverage**: Composite UI components

### E2E Tests (Cypress)

```bash
# Run E2E tests (starts dev server automatically)
npm run test:e2e

# Open E2E test UI
npm run test:e2e:open

# Run E2E tests with clean cache (if you encounter Vite errors)
npm run test:e2e:clean
```

**Location**: `cypress/e2e/`
**Framework**: Cypress E2E Testing
**Coverage**: Complete user workflows

## Troubleshooting

### Vite Cache Issues (ERR_ABORTED 504)

If you see errors like `net::ERR_ABORTED 504 (Outdated Optimize Dep)` when running E2E tests:

**Solution 1: Clear Vite cache**
```bash
rm -rf node_modules/.vite
npm run dev
```

**Solution 2: Use the clean script**
```bash
npm run test:e2e:clean
```

**Why this happens**: Vite caches dependencies for faster builds. When dependencies change, the cache can become outdated.

### Port Already in Use

If port 5173 is already in use:

```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9

# Or let Vite use a different port (update cypress.config.ts baseUrl)
```

### Tests Are Flaky

- Ensure dev server is running on port 5173
- Clear browser cache and Vite cache
- Check for timing issues (add proper waits)
- Verify data cleanup in `afterEach` hooks

### Component Tests Fail

- Ensure all dependencies are installed
- Check that components don't require unavailable context
- Verify mocks are properly configured in `cypress/support/component.tsx`

## Test Structure

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { functionToTest } from '@/utils/helpers';

describe('functionToTest', () => {
  it('should do something', () => {
    const result = functionToTest('input');
    expect(result).toBe('expected');
  });
});
```

### Component Tests

```typescript
import { ComponentName } from '@/components/ComponentName';

describe('ComponentName', () => {
  it('should render', () => {
    cy.mount(<ComponentName prop="value" />);
    cy.get('[data-testid="element"]').should('be.visible');
  });
});
```

### E2E Tests

```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    cy.setupTest();
  });

  afterEach(() => {
    cy.clearUserData();
  });

  it('should complete workflow', () => {
    cy.createUserAndSignIn();
    cy.setupRuleset('Test Ruleset');
    // ... test steps
  });
});
```

## Test Coverage

### Current Coverage

- **Unit Tests**: 103 tests, 100% coverage for tested utilities
- **Component Tests**: 12 tests, covering NumberInput and DescriptionEditor
- **E2E Tests**: 9 test files covering all critical workflows

### Coverage Reports

```bash
# Generate unit test coverage report
npm run test:unit:coverage

# View coverage report
open coverage/index.html
```

## Custom Commands

### E2E Custom Commands

Available in all E2E tests (defined in `cypress/support/commands.ts`):

- `cy.createUserAndSignIn(username?)` - Create and sign in user
- `cy.signInWithExistingUser(username)` - Sign in existing user
- `cy.signOut()` - Sign out current user
- `cy.clearUserData()` - Clear all user data
- `cy.setupTest()` - Set up test environment
- `cy.setupRuleset(title, description)` - Create ruleset

### Component Custom Commands

- `cy.mount(component)` - Mount component with router
- `cy.mountWithProviders(component, providers, options)` - Mount with context providers

## Best Practices

### General

1. **Keep tests independent** - Each test should work in isolation
2. **Clean up after tests** - Use `afterEach` to clean up data
3. **Use data-testid** - More reliable than CSS selectors
4. **Test user behavior** - Not implementation details
5. **Avoid hard-coded waits** - Use Cypress's built-in retry-ability

### Unit Tests

1. **Test pure functions** - Focus on utilities without dependencies
2. **Use AAA pattern** - Arrange, Act, Assert
3. **Test edge cases** - Empty, null, undefined, boundary values
4. **Keep tests fast** - Unit tests should run in < 5 seconds

### Component Tests

1. **Test in isolation** - Mock external dependencies
2. **Test user interactions** - Clicks, typing, form submission
3. **Verify visual output** - Check what users see
4. **Use spies for callbacks** - Verify function calls

### E2E Tests

1. **Test complete workflows** - Not individual actions
2. **Verify persistence** - Reload and check data exists
3. **Test multi-user scenarios** - Ensure data isolation
4. **Handle async operations** - Use proper timeouts

## CI/CD Integration

Tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Unit Tests
  run: npm run test:unit

- name: Run Component Tests
  run: npm run test:component

- name: Run E2E Tests
  run: npm run test:e2e
```

## Documentation

- **Unit Tests**: `tests/unit/` - See individual test files
- **Component Tests**: `cypress/component/README.md`
- **E2E Tests**: `cypress/e2e/README.md`
- **Test Strategy**: `agent/test-strategy/test-strategy.md`

## Getting Help

If you encounter issues:

1. Check this guide for troubleshooting steps
2. Review test-specific README files
3. Check Cypress documentation: https://docs.cypress.io/
4. Check Vitest documentation: https://vitest.dev/

## Contributing

When adding new tests:

1. Follow existing patterns and structure
2. Add data-testid attributes to components
3. Update relevant README files
4. Ensure tests pass before committing
5. Keep test coverage high
