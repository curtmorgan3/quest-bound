# Phase 3: E2E Workflow Tests Implementation Prompt

## Context

You are implementing Phase 3 of the Quest Bound testing strategy. This phase focuses on expanding end-to-end test coverage for critical user workflows, data persistence, and third-party integrations using Cypress E2E testing.

This phase builds on the existing E2E tests and ensures that complete user journeys work correctly, including data storage in IndexedDB and integration with external services.

## Objective

Write comprehensive E2E tests for:
1. Character management workflows
2. Inventory management (add, remove, drag-drop items)
3. Visual editor workflows (create windows, add/edit components)
4. Chart creation and data entry
5. Document upload and viewing
6. Import/export rulesets
7. Dice rolling integration with dddice
8. Multi-user scenarios and data isolation

These tests will ensure critical user journeys work end-to-end and that data persists correctly across sessions.

## Prerequisites

Read these files first:
- `agents/test-strategy.md` - Overall testing strategy
- `cypress.config.ts` - Cypress configuration
- `cypress/support/commands.ts` - Existing custom commands
- `cypress/e2e/*.cy.ts` - Existing E2E tests for patterns
- `src/stores/db/db.ts` - Database schema and structure
- `src/types/data-model-types.ts` - Data model definitions

## Tasks

### 1. Review Existing E2E Tests

Study the existing E2E tests to understand:
- Test structure and patterns
- Custom command usage
- Data cleanup strategies
- Assertion patterns
- Navigation patterns

Existing tests:
- `cypress/e2e/user-creation.cy.ts`
- `cypress/e2e/ruleset-management.cy.ts`
- `cypress/e2e/attribute-management.cy.ts`
- `cypress/e2e/action-management.cy.ts`
- `cypress/e2e/item-management.cy.ts`
- `cypress/e2e/window-management.cy.ts`

### 2. Create Additional Fixtures

Create fixture files for E2E workflows:

#### `cypress/fixtures/characters/character-with-attributes.json`
Complete character with:
- Basic info (name, image)
- Multiple attributes (strength, dexterity, HP, etc.)
- Character pages
- Character windows

#### `cypress/fixtures/inventory/test-inventory.json`
Inventory with:
- Various item types
- Different quantities
- Equipped items
- Items in different slots

#### `cypress/fixtures/windows/character-sheet-layout.json`
Complete window layout with:
- Multiple components
- Different component types
- Positioned and styled components

#### `cypress/fixtures/rulesets/complete-ruleset.json`
Full ruleset with:
- Attributes
- Actions
- Items
- Charts
- Documents
- Windows

### 3. Add Custom Commands (if needed)

Add new custom commands to `cypress/support/commands.ts` for common operations:

```typescript
// Create a character with attributes
Cypress.Commands.add('createCharacter', (name: string, rulesetId: string) => {
  // Implementation
});

// Add item to inventory
Cypress.Commands.add('addItemToInventory', (characterId: string, itemId: string) => {
  // Implementation
});

// Create a window with components
Cypress.Commands.add('createWindow', (title: string, rulesetId: string) => {
  // Implementation
});

// Navigate to editor
Cypress.Commands.add('openEditor', (windowId: string) => {
  // Implementation
});
```

Update the TypeScript declarations at the bottom of the file.

### 4. Write E2E Tests

Create comprehensive E2E tests for each workflow:

#### A. Character Management (`cypress/e2e/character-management.cy.ts`)

```typescript
describe('Character Management', () => {
  beforeEach(() => {
    cy.setupTest();
  });

  afterEach(() => {
    cy.clearUserData();
  });

  it('should create a new character', () => {
    // 1. Create user and ruleset
    // 2. Navigate to characters
    // 3. Click create character button
    // 4. Fill in character form (name, etc.)
    // 5. Submit form
    // 6. Verify character appears in list
  });

  it('should edit character attributes', () => {
    // 1. Create user, ruleset, and character
    // 2. Open character sheet
    // 3. Edit attribute values
    // 4. Verify changes are saved
    // 5. Reload page
    // 6. Verify changes persisted
  });

  it('should delete a character', () => {
    // 1. Create user, ruleset, and character
    // 2. Navigate to characters
    // 3. Delete character
    // 4. Verify character is removed
    // 5. Verify data is removed from IndexedDB
  });

  it('should switch between characters', () => {
    // 1. Create user and ruleset
    // 2. Create multiple characters
    // 3. Switch between them
    // 4. Verify correct character data loads
  });

  it('should persist character data after sign out/in', () => {
    // 1. Create user, ruleset, and character
    // 2. Add attributes to character
    // 3. Sign out
    // 4. Sign back in
    // 5. Verify character and attributes still exist
  });
});
```

**Key things to test:**
- Character CRUD operations
- Attribute value updates
- Data persistence (IndexedDB)
- Character switching
- Sign out/in persistence

#### B. Inventory Management (`cypress/e2e/inventory-management.cy.ts`)

```typescript
describe('Inventory Management', () => {
  beforeEach(() => {
    cy.setupTest();
  });

  afterEach(() => {
    cy.clearUserData();
  });

  it('should add items to character inventory', () => {
    // 1. Create user, ruleset, character, and items
    // 2. Open character inventory
    // 3. Add item to inventory
    // 4. Verify item appears
    // 5. Verify quantity is correct
  });

  it('should remove items from inventory', () => {
    // 1. Create character with inventory items
    // 2. Open inventory
    // 3. Remove item
    // 4. Verify item is removed
    // 5. Verify database is updated
  });

  it('should update item quantities', () => {
    // 1. Create character with inventory items
    // 2. Open inventory
    // 3. Increase/decrease quantity
    // 4. Verify quantity updates
    // 5. Verify persistence
  });

  it('should drag and drop items between slots', () => {
    // 1. Create character with inventory items
    // 2. Open inventory
    // 3. Drag item to new slot
    // 4. Verify item moved
    // 5. Verify position saved
  });

  it('should equip and unequip items', () => {
    // 1. Create character with equippable items
    // 2. Equip item
    // 3. Verify equipped state
    // 4. Unequip item
    // 5. Verify unequipped state
  });

  it('should use consumable items', () => {
    // 1. Create character with consumable items
    // 2. Use consumable
    // 3. Verify quantity decreases
    // 4. Verify item removed when quantity reaches 0
  });

  it('should persist inventory after reload', () => {
    // 1. Create character with inventory
    // 2. Add/modify items
    // 3. Reload page
    // 4. Verify inventory state persisted
  });
});
```

**Key things to test:**
- Add/remove items
- Quantity management
- Drag-and-drop functionality
- Equip/unequip mechanics
- Consumable item usage
- Data persistence

#### C. Editor Workflows (`cypress/e2e/editor-workflows.cy.ts`)

```typescript
describe('Visual Editor Workflows', () => {
  beforeEach(() => {
    cy.setupTest();
  });

  afterEach(() => {
    cy.clearUserData();
  });

  it('should create a new window', () => {
    // 1. Create user and ruleset
    // 2. Navigate to windows
    // 3. Create new window
    // 4. Verify window appears
  });

  it('should add text component to window', () => {
    // 1. Create user, ruleset, and window
    // 2. Open editor
    // 3. Add text component
    // 4. Set text content
    // 5. Verify component appears
  });

  it('should add input component linked to attribute', () => {
    // 1. Create user, ruleset, attribute, and window
    // 2. Open editor
    // 3. Add input component
    // 4. Link to attribute
    // 5. Verify component shows attribute value
  });

  it('should position and resize components', () => {
    // 1. Create window with components
    // 2. Open editor
    // 3. Move component
    // 4. Resize component
    // 5. Verify position/size saved
  });

  it('should delete components', () => {
    // 1. Create window with components
    // 2. Open editor
    // 3. Delete component
    // 4. Verify component removed
    // 5. Verify database updated
  });

  it('should save window layout and persist', () => {
    // 1. Create window with multiple components
    // 2. Arrange components
    // 3. Save layout
    // 4. Reload page
    // 5. Verify layout persisted
  });

  it('should link component to action', () => {
    // 1. Create user, ruleset, action, and window
    // 2. Add component
    // 3. Link to action
    // 4. Verify link works
  });

  it('should apply conditional rendering to component', () => {
    // 1. Create window with components and attributes
    // 2. Set conditional rendering on component
    // 3. Change attribute value
    // 4. Verify component shows/hides
  });
});
```

**Key things to test:**
- Window creation
- Component addition (all types)
- Component positioning/resizing
- Attribute/action linking
- Component deletion
- Layout persistence
- Conditional rendering

#### D. Chart Management (`cypress/e2e/chart-management.cy.ts`)

```typescript
describe('Chart Management', () => {
  beforeEach(() => {
    cy.setupTest();
  });

  afterEach(() => {
    cy.clearUserData();
  });

  it('should create a new chart', () => {
    // 1. Create user and ruleset
    // 2. Navigate to charts
    // 3. Create new chart
    // 4. Add columns
    // 5. Verify chart created
  });

  it('should add rows to chart', () => {
    // 1. Create chart
    // 2. Add rows with data
    // 3. Verify rows appear
  });

  it('should edit chart data', () => {
    // 1. Create chart with data
    // 2. Edit cell values
    // 3. Verify changes saved
  });

  it('should delete chart', () => {
    // 1. Create chart
    // 2. Delete chart
    // 3. Verify chart removed
  });

  it('should reference chart in attribute options', () => {
    // 1. Create chart with data
    // 2. Create attribute
    // 3. Link attribute options to chart
    // 4. Verify dropdown shows chart data
  });

  it('should persist chart data after reload', () => {
    // 1. Create chart with data
    // 2. Reload page
    // 3. Verify chart data persisted
  });
});
```

**Key things to test:**
- Chart CRUD operations
- Row/column management
- Data entry and editing
- Chart references in attributes
- Data persistence

#### E. Document Management (`cypress/e2e/document-management.cy.ts`)

```typescript
describe('Document Management', () => {
  beforeEach(() => {
    cy.setupTest();
  });

  afterEach(() => {
    cy.clearUserData();
  });

  it('should upload a document', () => {
    // 1. Create user and ruleset
    // 2. Navigate to documents
    // 3. Upload document file
    // 4. Verify document appears
  });

  it('should upload a PDF', () => {
    // 1. Create user and ruleset
    // 2. Upload PDF file
    // 3. Verify PDF appears
  });

  it('should view document', () => {
    // 1. Create document
    // 2. Open document viewer
    // 3. Verify document displays
  });

  it('should view PDF', () => {
    // 1. Create PDF document
    // 2. Open PDF viewer
    // 3. Verify PDF renders
  });

  it('should delete document', () => {
    // 1. Create document
    // 2. Delete document
    // 3. Verify document removed
  });

  it('should persist documents after reload', () => {
    // 1. Upload documents
    // 2. Reload page
    // 3. Verify documents still exist
  });
});
```

**Key things to test:**
- Document upload
- PDF upload
- Document viewing
- PDF rendering
- Document deletion
- Data persistence

#### F. Import/Export (`cypress/e2e/import-export.cy.ts`)

```typescript
describe('Import/Export Workflows', () => {
  beforeEach(() => {
    cy.setupTest();
  });

  afterEach(() => {
    cy.clearUserData();
  });

  it('should export ruleset to file', () => {
    // 1. Create user and complete ruleset
    // 2. Navigate to export
    // 3. Export ruleset
    // 4. Verify download initiated
  });

  it('should import ruleset from file', () => {
    // 1. Create user
    // 2. Navigate to import
    // 3. Import ruleset file
    // 4. Verify ruleset created
    // 5. Verify all data imported (attributes, actions, items, etc.)
  });

  it('should handle import errors gracefully', () => {
    // 1. Create user
    // 2. Try to import invalid file
    // 3. Verify error message shown
    // 4. Verify no partial data created
  });

  it('should duplicate ruleset', () => {
    // 1. Create ruleset
    // 2. Duplicate ruleset
    // 3. Verify new ruleset created
    // 4. Verify all data copied
    // 5. Verify rulesets are independent
  });

  it('should export and re-import ruleset successfully', () => {
    // 1. Create complete ruleset
    // 2. Export ruleset
    // 3. Delete original ruleset
    // 4. Import exported file
    // 5. Verify all data matches original
  });
});
```

**Key things to test:**
- Export functionality
- Import functionality
- Data integrity during import/export
- Error handling
- Ruleset duplication
- Round-trip export/import

#### G. Dice Integration (`cypress/e2e/dice-integration.cy.ts`)

```typescript
describe('Dice Rolling Integration', () => {
  beforeEach(() => {
    cy.setupTest();
  });

  afterEach(() => {
    cy.clearUserData();
  });

  it('should roll dice from text component', () => {
    // 1. Create character with text component containing dice expression
    // 2. Open character sheet
    // 3. Click dice expression
    // 4. Verify roll executes
    // 5. Verify result displayed
  });

  it('should roll dice from dice panel', () => {
    // 1. Create user and ruleset
    // 2. Open dice panel
    // 3. Enter dice expression
    // 4. Roll dice
    // 5. Verify result shown
  });

  it('should display roll history', () => {
    // 1. Make multiple dice rolls
    // 2. Open dice panel
    // 3. Verify history shows all rolls
  });

  it('should log dice rolls to database', () => {
    // 1. Make dice roll
    // 2. Verify roll logged in IndexedDB
    // 3. Reload page
    // 4. Verify roll history persisted
  });

  it('should integrate with dddice (if configured)', () => {
    // 1. Configure dddice integration
    // 2. Roll dice
    // 3. Verify 3D dice animation
    // 4. Verify result matches
    // Note: May need to mock dddice API
  });

  it('should parse complex dice expressions', () => {
    // Test: 2d6+4, 1d20-2, 3d8+1d4+5, etc.
  });
});
```

**Key things to test:**
- Dice rolling from various sources
- Roll history
- Roll persistence
- dddice integration (if applicable)
- Complex dice expressions

#### H. Multi-User Scenarios (`cypress/e2e/multi-user.cy.ts`)

```typescript
describe('Multi-User Scenarios', () => {
  beforeEach(() => {
    cy.setupTest();
  });

  afterEach(() => {
    cy.clearUserData();
  });

  it('should isolate data between users', () => {
    // 1. Create User A with ruleset
    // 2. Sign out
    // 3. Create User B with different ruleset
    // 4. Sign out
    // 5. Sign in as User A
    // 6. Verify only User A's data visible
    // 7. Sign in as User B
    // 8. Verify only User B's data visible
  });

  it('should not leak character data between users', () => {
    // 1. Create User A with character
    // 2. Sign out
    // 3. Create User B
    // 4. Verify User B doesn't see User A's character
  });

  it('should maintain separate inventories per user', () => {
    // 1. Create User A with character and inventory
    // 2. Sign out
    // 3. Create User B with character and inventory
    // 4. Verify inventories are separate
  });

  it('should handle rapid user switching', () => {
    // 1. Create multiple users
    // 2. Rapidly switch between them
    // 3. Verify correct data loads each time
    // 4. Verify no data corruption
  });
});
```

**Key things to test:**
- Data isolation between users
- User switching
- No data leakage
- Database integrity with multiple users

### 5. Update Test Scripts

Ensure `package.json` has all necessary scripts:

```json
{
  "scripts": {
    "test:e2e": "start-server-and-test dev http://localhost:5173 cypress:run:e2e",
    "test:e2e:open": "cypress open --e2e",
    "cypress:run:e2e": "cypress run --e2e"
  }
}
```

### 6. Verify Setup

Run the following commands:

```bash
# Run all E2E tests headlessly
npm run test:e2e

# Open E2E test UI
npm run test:e2e:open
```

## Test Writing Guidelines

### E2E Test Structure

```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    cy.setupTest(); // Set up test environment
  });

  afterEach(() => {
    cy.clearUserData(); // Clean up between tests
  });

  it('should complete user workflow', () => {
    // 1. Setup - Create necessary data
    cy.createUserAndSignIn().then((username) => {
      cy.setupRuleset('Test Ruleset');
      
      // 2. Navigate - Go to the feature
      cy.get('[data-testid="nav-link"]').click();
      
      // 3. Interact - Perform user actions
      cy.get('[data-testid="create-button"]').click();
      cy.get('#name-input').type('Test Name');
      cy.get('[data-testid="submit"]').click();
      
      // 4. Assert - Verify expected outcomes
      cy.get('[data-testid="item-name"]').should('contain', 'Test Name');
      
      // 5. Verify persistence (if applicable)
      cy.reload();
      cy.get('[data-testid="item-name"]').should('contain', 'Test Name');
    });
  });
});
```

### Best Practices

1. **Use custom commands** - Leverage existing commands for common operations
2. **Test complete workflows** - Not just individual actions
3. **Verify data persistence** - Reload page and check data still exists
4. **Clean up between tests** - Use `cy.clearUserData()` in afterEach
5. **Use data-testid** - More reliable than CSS selectors
6. **Wait for async operations** - Use Cypress's built-in retry-ability
7. **Test error scenarios** - Not just happy paths
8. **Keep tests independent** - Each test should work in isolation

### Handling Async Operations

```typescript
// Wait for element to appear
cy.get('[data-testid="element"]', { timeout: 10000 }).should('be.visible');

// Wait for navigation
cy.url().should('include', '/expected-path');

// Wait for database operation
cy.window().then((win) => {
  // Check IndexedDB
});
```

### Testing IndexedDB Persistence

```typescript
it('should persist data in IndexedDB', () => {
  // Create data
  cy.createUserAndSignIn();
  cy.setupRuleset('Test Ruleset');
  
  // Verify data in IndexedDB
  cy.window().then(async (win) => {
    const db = win.indexedDB.open('qbdb');
    // Query and verify data
  });
  
  // Reload and verify data still exists
  cy.reload();
  cy.get('[data-testid="ruleset-card-title"]').should('contain', 'Test Ruleset');
});
```

### Testing File Upload

```typescript
it('should upload file', () => {
  cy.get('input[type="file"]').selectFile('cypress/fixtures/test-file.pdf');
  cy.get('[data-testid="upload-success"]').should('be.visible');
});
```

### Testing Drag and Drop

```typescript
it('should drag and drop item', () => {
  cy.get('[data-testid="item-1"]')
    .drag('[data-testid="slot-5"]');
  
  cy.get('[data-testid="slot-5"]')
    .should('contain', 'Item 1');
});
```

## Success Criteria

Phase 3 is complete when:
- ✅ All 8 new E2E test files are created
- ✅ All critical user workflows are covered
- ✅ Data persistence is validated for all entities
- ✅ Import/export functionality is tested
- ✅ Multi-user scenarios are validated
- ✅ Third-party integrations are tested (dddice)
- ✅ All tests pass consistently
- ✅ E2E tests run in < 5 minutes
- ✅ Tests are reliable (no flaky tests)

## Deliverables

1. **Test Files:**
   - `cypress/e2e/character-management.cy.ts`
   - `cypress/e2e/inventory-management.cy.ts`
   - `cypress/e2e/editor-workflows.cy.ts`
   - `cypress/e2e/chart-management.cy.ts`
   - `cypress/e2e/document-management.cy.ts`
   - `cypress/e2e/import-export.cy.ts`
   - `cypress/e2e/dice-integration.cy.ts`
   - `cypress/e2e/multi-user.cy.ts`

2. **Fixture Files:**
   - `cypress/fixtures/characters/character-with-attributes.json`
   - `cypress/fixtures/inventory/test-inventory.json`
   - `cypress/fixtures/windows/character-sheet-layout.json`
   - `cypress/fixtures/rulesets/complete-ruleset.json`

3. **Custom Commands** (if new ones added):
   - Updated `cypress/support/commands.ts`
   - Updated TypeScript declarations

4. **Documentation:**
   - Update `agents/test-strategy.md` with any learnings
   - Document any new patterns or utilities

## Notes

- **Focus on user workflows** - Not individual functions
- **Test data persistence** - Verify IndexedDB storage
- **Test error scenarios** - Not just happy paths
- **Keep tests maintainable** - Use custom commands and fixtures
- **Avoid flaky tests** - Use proper waits and assertions

## Common Challenges & Solutions

### Challenge: Tests are flaky
**Solution:** Use Cypress's built-in retry-ability, add proper waits, avoid hard-coded timeouts

### Challenge: IndexedDB operations are async
**Solution:** Use `cy.window().then()` and async/await patterns

### Challenge: File upload testing
**Solution:** Use `cy.selectFile()` with fixture files

### Challenge: Drag-and-drop testing
**Solution:** Use Cypress drag plugin or simulate drag events

### Challenge: Third-party API integration
**Solution:** Mock external APIs or use test API keys

### Challenge: Tests take too long
**Solution:** Parallelize tests, optimize setup, use `cy.session()` for authentication

## After Completion

Once Phase 3 is complete:
1. Review E2E test coverage
2. Identify any remaining critical workflows
3. Document test patterns and best practices
4. Consider adding E2E tests to CI/CD pipeline
5. Monitor test reliability and fix any flaky tests
6. Evaluate if Phase 4 (Integration Tests) is needed
