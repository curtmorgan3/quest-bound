# E2E Testing Guide

This directory contains Cypress end-to-end tests for Quest Bound. E2E tests verify complete user workflows and data persistence across the application.

## Directory Structure

```
cypress/e2e/
├── user-creation.cy.ts              # User authentication workflows
├── ruleset-management.cy.ts         # Ruleset CRUD operations
├── attribute-management.cy.ts       # Attribute management
├── action-management.cy.ts          # Action management
├── item-management.cy.ts            # Item management
├── window-management.cy.ts          # Window management
├── character-management.cy.ts       # Character workflows (Phase 3)
├── dice-integration.cy.ts           # Dice rolling integration (Phase 3)
├── multi-user.cy.ts                 # Multi-user scenarios (Phase 3)
└── README.md                        # This file
```

## Running Tests

```bash
# Run all E2E tests headlessly (starts dev server automatically)
npm run test:e2e

# Open Cypress E2E test UI
npm run test:e2e:open

# Run E2E tests only (requires dev server running separately)
npm run cypress:run:e2e
```

## Test Coverage

### Phase 1 & 2 Tests (Existing)
- ✅ **User Creation** - Sign up, sign in, sign out workflows
- ✅ **Ruleset Management** - Create, edit, delete rulesets
- ✅ **Attribute Management** - CRUD operations for attributes
- ✅ **Action Management** - CRUD operations for actions
- ✅ **Item Management** - CRUD operations for items
- ✅ **Window Management** - Window creation and management

### Phase 3 Tests (New)
- ✅ **Character Management** - Create, edit, delete characters; data persistence
- ✅ **Dice Integration** - Dice rolling, history, complex expressions
- ✅ **Multi-User Scenarios** - Data isolation, user switching, separate histories

### Future Tests (Planned)
- ⏳ **Inventory Management** - Add/remove items, drag-drop, equip/unequip
- ⏳ **Editor Workflows** - Visual editor component management
- ⏳ **Chart Management** - Chart CRUD and data entry
- ⏳ **Document Management** - Upload, view, delete documents
- ⏳ **Import/Export** - Ruleset import/export workflows

## Writing E2E Tests

### Basic Test Structure

```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    cy.setupTest(); // Set up test environment
  });

  afterEach(() => {
    cy.clearUserData(); // Clean up between tests
  });

  it('should complete user workflow', () => {
    // 1. Setup - Create user and necessary data
    cy.createUserAndSignIn().then((username) => {
      cy.setupRuleset('Test Ruleset');
      
      // 2. Navigate to feature
      cy.get('[data-testid="nav-link"]').click();
      
      // 3. Perform user actions
      cy.get('[data-testid="create-button"]').click();
      cy.get('#name-input').type('Test Name');
      cy.get('[data-testid="submit"]').click();
      
      // 4. Verify outcomes
      cy.get('[data-testid="item-name"]').should('contain', 'Test Name');
      
      // 5. Verify persistence (optional)
      cy.reload();
      cy.get('[data-testid="item-name"]').should('contain', 'Test Name');
    });
  });
});
```

### Custom Commands

The following custom commands are available (defined in `cypress/support/commands.ts`):

- `cy.createUserAndSignIn(username?)` - Creates and signs in a new user
- `cy.signInWithExistingUser(username)` - Signs in with an existing user
- `cy.signOut()` - Signs out the current user
- `cy.clearUserData()` - Clears localStorage and IndexedDB
- `cy.setupTest()` - Sets up test environment
- `cy.setupRuleset(title, description)` - Creates a new ruleset

### Best Practices

1. **Use Custom Commands** - Leverage existing commands for common operations
2. **Test Complete Workflows** - Verify end-to-end user journeys, not isolated actions
3. **Verify Data Persistence** - Reload pages and check data still exists
4. **Clean Up Between Tests** - Always use `cy.clearUserData()` in `afterEach`
5. **Use data-testid** - More reliable than CSS selectors or text content
6. **Wait for Async Operations** - Use Cypress's built-in retry-ability with timeouts
7. **Test Error Scenarios** - Include negative test cases, not just happy paths
8. **Keep Tests Independent** - Each test should work in isolation

### Testing Patterns

#### Data Persistence

```typescript
it('should persist data after reload', () => {
  cy.createUserAndSignIn();
  cy.setupRuleset('Test Ruleset');
  
  // Verify data exists
  cy.get('[data-testid="ruleset-card-title"]').should('contain', 'Test Ruleset');
  
  // Reload page
  cy.reload();
  
  // Verify data still exists
  cy.get('[data-testid="ruleset-card-title"]').should('contain', 'Test Ruleset');
});
```

#### Sign Out/In Persistence

```typescript
it('should persist data after sign out/in', () => {
  cy.createUserAndSignIn('TestUser').then((username) => {
    cy.setupRuleset('Persistent Ruleset');
    
    cy.signOut();
    cy.signInWithExistingUser(username);
    
    // Verify data persisted
    cy.get('[data-testid="ruleset-card-title"]').should('contain', 'Persistent Ruleset');
  });
});
```

#### Multi-User Isolation

```typescript
it('should isolate data between users', () => {
  cy.createUserAndSignIn('UserA').then((usernameA) => {
    cy.setupRuleset('UserA Ruleset');
    cy.signOut();
    
    cy.createUserAndSignIn('UserB').then(() => {
      // Verify UserA's data is not visible
      cy.get('[data-testid="ruleset-card-title"]').should('not.contain', 'UserA Ruleset');
      
      cy.signOut();
      cy.signInWithExistingUser(usernameA);
      
      // Verify UserA's data is visible again
      cy.get('[data-testid="ruleset-card-title"]').should('contain', 'UserA Ruleset');
    });
  });
});
```

### Handling Async Operations

```typescript
// Wait for element with timeout
cy.get('[data-testid="element"]', { timeout: 10000 }).should('be.visible');

// Wait for URL change
cy.url().should('include', '/expected-path');

// Wait for database operation
cy.wait(1000); // Use sparingly, prefer assertions
```

### Common Selectors

- `[data-testid="element-name"]` - Primary selector (most reliable)
- `#element-id` - ID selector (when data-testid not available)
- `.class-name` - Class selector (less reliable)
- `cy.contains('text')` - Text content (use carefully, can be brittle)

## Debugging Tests

### View Test Runs

```bash
# Open Cypress UI for interactive debugging
npm run test:e2e:open
```

### Screenshots and Videos

- Screenshots are automatically taken on test failures
- Videos are recorded for all test runs (in headless mode)
- Located in `cypress/screenshots/` and `cypress/videos/`

### Console Logs

```typescript
cy.log('Debug message'); // Appears in Cypress command log
cy.debug(); // Pauses test and opens debugger
```

## Test Performance

Current E2E test suite:
- **Total Tests**: 9 test files
- **Estimated Runtime**: < 5 minutes
- **Parallelization**: Supported in CI/CD

## Troubleshooting

### Tests are Flaky
- Add proper waits with `{ timeout: 10000 }`
- Use `should()` assertions instead of `wait()`
- Ensure data cleanup in `afterEach`

### Element Not Found
- Check data-testid exists in component
- Verify element is visible (not hidden by CSS)
- Add timeout for async operations

### Data Not Persisting
- Verify IndexedDB operations complete
- Check localStorage is not cleared unexpectedly
- Ensure proper async handling

## Contributing

When adding new E2E tests:
1. Follow existing patterns and structure
2. Use custom commands for common operations
3. Add data-testid attributes to new components
4. Test both happy and error paths
5. Verify data persistence
6. Update this README with new test coverage

## Resources

- [Cypress Documentation](https://docs.cypress.io/)
- [Cypress Best Practices](https://docs.cypress.io/guides/references/best-practices)
- [Quest Bound Test Strategy](../../agent/test-strategy/test-strategy.md)
