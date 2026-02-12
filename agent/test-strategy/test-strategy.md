# Quest Bound Testing Strategy

## Overview

This document outlines the testing strategy for Quest Bound, a progressive web app for creating digital tabletop RPGs. The goal is to prevent regressions during active development, particularly in volatile areas like the compass-planes visual editor.

## Current State

### Existing Test Coverage

**E2E Tests (Cypress)** - 6 test files
- ✅ User creation and authentication flows
- ✅ Ruleset management (create, delete, open)
- ✅ Attribute management
- ✅ Action management
- ✅ Item management
- ✅ Window management

**Component Tests (Cypress)** - 1 test file
- ✅ SignIn component basic rendering

### Gaps in Coverage

- ❌ Utility functions (dice rolling, parsing, helpers)
- ❌ Custom React hooks (error handling, notifications)
- ❌ Database layer and hooks
- ❌ Composite UI components
- ❌ Visual editor node components
- ❌ Complex user workflows (character management, inventory, editor operations)
- ❌ Import/export functionality
- ❌ Third-party integrations (dddice)

## Testing Philosophy

### Test Types & Use Cases

1. **E2E Tests (Cypress)**
   - User workflows involving data storage and manipulation
   - Third-party integrations (dddice)
   - Critical user journeys end-to-end
   - Data persistence validation (IndexedDB)

2. **Component Tests (Cypress)**
   - Composite components
   - Panels and larger UI chunks
   - Visual editor node components
   - User interactions and state changes
   - **Exclusions:** Primitive components, Radix UI imports

3. **Unit Tests (Vitest)**
   - Pure TypeScript utilities
   - Data transformation functions
   - Business logic without UI
   - Helper functions

### Test Organization

```
/quest-bound
├── src/                          # Application source code
├── cypress/
│   ├── e2e/                      # E2E tests (existing)
│   ├── component/                # Component tests (new)
│   ├── fixtures/                 # Test data fixtures (existing + expand)
│   └── support/                  # Cypress helpers (existing)
├── tests/
│   └── unit/                     # Unit tests (new)
├── vitest.config.ts              # Vitest configuration (new)
└── package.json                  # Updated with new test scripts
```

## Implementation Phases

### Phase 1: Foundation & Quick Wins ⭐ **START HERE**

**Priority:** Highest  
**Timeline:** Week 1-2  
**Goal:** Establish unit testing infrastructure and cover critical pure functions

#### Tooling Setup
- [ ] Install Vitest and dependencies
- [ ] Configure Vitest with TypeScript support
- [ ] Set up coverage reporting (@vitest/coverage-v8)
- [ ] Create `tests/unit/` directory structure
- [ ] Add test scripts to package.json
- [ ] Configure path aliases for imports

#### Unit Tests to Implement

**Dice Utilities** (`tests/unit/utils/dice-utils.test.ts`)
- `parseDiceExpression()` - Parse dice notation (2d6+4, 1d20-2)
- `rollDie()` - Random number generation within bounds
- `formatSegmentResult()` - Format roll results for display
- `parseTextForDiceRolls()` - Extract dice expressions from text
- Edge cases: invalid input, zero dice, negative modifiers

**Helper Utilities** (`tests/unit/utils/helpers.test.ts`)
- `generateId()` - UUID generation with optional context
- `isRunningLocally()` - Environment detection

**Node Conversion** (`tests/unit/lib/compass-planes/node-conversion.test.ts`)
- Node data transformation functions
- Component to node conversion
- Node to component conversion

**Character Data Injection** (`tests/unit/lib/compass-planes/inject-character-data.test.ts`)
- Template interpolation (`{{attribute_name}}`)
- Special token handling (`{{name}}`)
- Missing attribute handling
- Nested data structures

**Default Value Injection** (`tests/unit/lib/compass-planes/inject-defaults.test.ts`)
- Default value application logic
- Type-specific defaults
- Attribute initialization

#### Success Metrics
- ✅ Vitest running successfully
- ✅ 80%+ code coverage for targeted utilities
- ✅ All dice rolling logic tested
- ✅ Fast test execution (< 5 seconds for all unit tests)

---

### Phase 2: Component Tests for Visual Editor ⭐ **HIGH PRIORITY**

**Priority:** High (most volatile area)  
**Timeline:** Week 3-4  
**Goal:** Prevent regressions in compass-planes editor components

#### Tooling Setup
- [ ] Install @testing-library/react for better assertions
- [ ] Create `cypress/component/` directory structure
- [ ] Set up component test fixtures
- [ ] Create reusable test utilities for editor components

#### Component Tests to Implement

**Editor Node Components** (`cypress/component/nodes/`)

1. **Text Node** (`text-node.test.tsx`)
   - Renders text content correctly
   - Interpolates character data
   - Handles dice expression detection
   - Applies styling (font, color, size)
   - Conditional rendering based on attributes

2. **Input Node** (`input-node.test.tsx`)
   - Renders different input types (text, number, select)
   - Updates attribute values on change
   - Validates min/max for numbers
   - Displays dropdown options correctly
   - Handles disabled state

3. **Checkbox Node** (`checkbox-node.test.tsx`)
   - Toggles boolean attributes
   - Displays checked/unchecked states
   - Applies custom styling

4. **Inventory Node** (`inventory-node.test.tsx`)
   - Renders inventory grid
   - Displays items in correct positions
   - Handles item drag-and-drop
   - Shows item tooltips/context menus
   - Manages item quantities

5. **Graph Node** (`graph-node.test.tsx`)
   - Renders linear progress bars
   - Renders circular progress indicators
   - Calculates percentages correctly
   - Updates dynamically with attribute changes
   - Handles min/max values

6. **Image Node** (`image-node.test.tsx`)
   - Displays uploaded images
   - Handles missing images gracefully
   - Applies sizing and positioning
   - Supports asset references

7. **Frame Node** (`frame-node.test.tsx`)
   - Renders container boundaries
   - Contains child components
   - Applies background styling
   - Handles nested layouts

**Composite Components** (`cypress/component/composites/`)

1. **Number Input** (`number-input.test.tsx`)
   - Increment/decrement buttons work
   - Direct input validation
   - Min/max enforcement
   - Disabled state handling

2. **Description Editor** (`description-editor.test.tsx`)
   - Rich text editing
   - Markdown support
   - Saves changes correctly

3. **Image Upload** (`image-upload.test.tsx`)
   - File selection
   - Preview display
   - Upload validation
   - Error handling

**Panel Components** (`cypress/component/panels/`)

1. **Dice Panel** (`dice-panel.test.tsx`)
   - Displays roll history
   - Shows roll results
   - Formats dice notation
   - Integrates with dice roller

2. **Character Inventory Panel** (`character-inventory-panel.test.tsx`)
   - Displays character items
   - Filters by category
   - Sorts items
   - Shows item details
   - Add/remove items

#### Test Data Fixtures
Create `cypress/fixtures/` files:
- `test-character.json` - Sample character with attributes
- `test-ruleset.json` - Sample ruleset configuration
- `test-components.json` - Sample component definitions
- `test-inventory.json` - Sample inventory items
- `test-windows.json` - Sample window layouts

#### Success Metrics
- ✅ All editor node components have component tests
- ✅ 60%+ coverage for composite components
- ✅ Tests use fixture data consistently
- ✅ Component tests run in < 30 seconds

---

### Phase 3: E2E Workflows Expansion

**Priority:** Medium  
**Timeline:** Week 5-6  
**Goal:** Cover critical user journeys and data persistence

#### E2E Tests to Implement

**Character Management** (`cypress/e2e/character-management.cy.ts`)
- Create new character
- Edit character attributes
- Delete character
- Switch between characters
- Character data persists after sign out/in

**Inventory Management** (`cypress/e2e/inventory-management.cy.ts`)
- Add items to character inventory
- Remove items from inventory
- Drag-and-drop items between slots
- Update item quantities
- Equip/unequip items
- Use consumable items
- Inventory persists correctly

**Editor Workflows** (`cypress/e2e/editor-workflows.cy.ts`)
- Create new window
- Add components to window
- Position and resize components
- Link components to attributes
- Link components to actions
- Delete components
- Save window layout
- Window persists after reload

**Chart Management** (`cypress/e2e/chart-management.cy.ts`)
- Create new chart
- Add rows and columns
- Edit chart data
- Delete chart
- Reference chart in attributes (dropdown options)

**Document Management** (`cypress/e2e/document-management.cy.ts`)
- Upload document
- Upload PDF
- View document
- Delete document
- Documents persist correctly

**Import/Export** (`cypress/e2e/import-export.cy.ts`)
- Export ruleset to file
- Import ruleset from file
- Verify all data imported correctly
- Handle import errors gracefully
- Duplicate ruleset

**Dice Integration** (`cypress/e2e/dice-integration.cy.ts`)
- Roll dice from text component
- Roll dice from dice panel
- View roll history
- dddice integration (if applicable)
- Roll results logged correctly

**Multi-User Scenarios** (`cypress/e2e/multi-user.cy.ts`)
- Create multiple users
- Each user has isolated data
- Switch between users
- User data doesn't leak between accounts

#### Success Metrics
- ✅ All critical user workflows covered
- ✅ Data persistence validated for all entities
- ✅ Third-party integrations tested
- ✅ E2E tests run in < 5 minutes

---

### Phase 4: Integration Tests (Future)

**Priority:** Lower  
**Timeline:** Week 7+  
**Goal:** Test hooks and database interactions

#### Areas to Cover (Later)
- Database hooks with mocked Dexie
- Custom React hooks (error handler, notifications)
- API hooks (character, ruleset, import/export)
- State management stores (Zustand)
- Middleware (asset injection, chart options)

**Note:** Deferred until patterns stabilize and higher-priority testing is complete.

---

## Test Data Strategy

### Fixtures Approach
All tests should use fixture data for consistency and maintainability.

**Fixture Files** (`cypress/fixtures/`)
```
fixtures/
├── users/
│   ├── test-user.json
│   └── multiple-users.json
├── rulesets/
│   ├── basic-ruleset.json
│   ├── complete-ruleset.json
│   └── minimal-ruleset.json
├── characters/
│   ├── test-character.json
│   ├── character-with-inventory.json
│   └── high-level-character.json
├── components/
│   ├── text-components.json
│   ├── input-components.json
│   └── all-node-types.json
├── attributes/
│   ├── basic-attributes.json
│   └── complex-attributes.json
├── items/
│   ├── basic-items.json
│   └── equipment-set.json
└── windows/
    ├── character-sheet-window.json
    └── inventory-window.json
```

### Fixture Usage Pattern
```typescript
// In tests
cy.fixture('characters/test-character.json').then((character) => {
  // Use character data in test
});
```

### Programmatic Test Data
For unit tests, generate simple test data inline:
```typescript
const mockCharacter = {
  id: 'test-char-1',
  name: 'Test Character',
  attributes: { strength: 10, dexterity: 12 }
};
```

---

## Tooling & Configuration

### New Dependencies

```json
{
  "devDependencies": {
    "vitest": "^2.0.0",
    "@vitest/coverage-v8": "^2.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.0.0"
  }
}
```

### New NPM Scripts

```json
{
  "scripts": {
    "test": "npm run test:unit && npm run test:component && npm run test:e2e",
    "test:unit": "vitest run",
    "test:unit:watch": "vitest",
    "test:unit:coverage": "vitest run --coverage",
    "test:component": "cypress run --component",
    "test:component:open": "cypress open --component",
    "test:e2e": "start-server-and-test dev http://localhost:5173 cypress:run:e2e",
    "test:e2e:open": "cypress open --e2e",
    "test:all": "npm run test:unit && npm run test:component && npm run test:e2e",
    "test:coverage": "npm run test:unit:coverage"
  }
}
```

### Vitest Configuration (`vitest.config.ts`)

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.ts',
        '**/*.test.tsx',
        'cypress/',
        'dist/',
        '**/*.config.ts',
        '**/types/',
        'src/components/ui/**', // Exclude Radix primitives
      ],
    },
  },
});
```

### Coverage Reporting

**Informational Only** (no blocking thresholds)
- Generate HTML reports for local viewing
- Track coverage trends over time
- Use to identify untested areas

**View Coverage:**
```bash
npm run test:unit:coverage
open coverage/index.html
```

---

## Best Practices

### General Guidelines

1. **Test Behavior, Not Implementation**
   - Focus on what users see and do
   - Avoid testing internal state directly
   - Test public APIs and interfaces

2. **Use Descriptive Test Names**
   ```typescript
   it('should parse dice expression "2d6+4" into correct tokens', () => {
     // test
   });
   ```

3. **Arrange-Act-Assert Pattern**
   ```typescript
   it('should roll die within valid range', () => {
     // Arrange
     const sides = 6;
     
     // Act
     const result = rollDie(sides);
     
     // Assert
     expect(result).toBeGreaterThanOrEqual(1);
     expect(result).toBeLessThanOrEqual(6);
   });
   ```

4. **Keep Tests Independent**
   - Each test should run in isolation
   - Use beforeEach/afterEach for setup/cleanup
   - Don't rely on test execution order

5. **Use Fixtures for Complex Data**
   - Keep test files focused on logic
   - Reuse fixture data across tests
   - Version control fixture files

### Cypress-Specific

1. **Use Custom Commands**
   - Leverage existing commands (createUserAndSignIn, setupRuleset)
   - Create new commands for common operations
   - Keep tests DRY

2. **Use data-testid Attributes**
   - Add to components for reliable selection
   - Prefer over CSS selectors
   - Format: `data-testid="component-name-action"`

3. **Clean Up Between Tests**
   - Use `cy.clearUserData()` in afterEach
   - Reset IndexedDB state
   - Clear localStorage

### Vitest-Specific

1. **Mock External Dependencies**
   - Mock IndexedDB for database tests
   - Mock fetch for API calls
   - Use vi.mock() for module mocking

2. **Test Edge Cases**
   - Null/undefined inputs
   - Empty arrays/objects
   - Boundary values (min/max)
   - Invalid input types

3. **Keep Unit Tests Fast**
   - No async operations if possible
   - No DOM manipulation
   - Pure function testing

---

## Success Criteria

### Phase 1 Complete
- [ ] Vitest configured and running
- [ ] 5+ utility files have unit tests
- [ ] 80%+ coverage for dice utilities
- [ ] Coverage reporting functional
- [ ] Tests run in CI (if applicable)

### Phase 2 Complete
- [ ] All editor node components tested
- [ ] 3+ composite components tested
- [ ] 2+ panel components tested
- [ ] Fixture data structure established
- [ ] 60%+ coverage for tested components

### Phase 3 Complete
- [ ] 8+ new E2E test files
- [ ] All critical workflows covered
- [ ] Import/export tested
- [ ] Multi-user scenarios validated
- [ ] Data persistence verified

### Overall Success
- [ ] No major regressions in releases
- [ ] Confidence to refactor volatile code
- [ ] New features include tests
- [ ] Test suite runs reliably in CI
- [ ] Team adopts testing practices

---

## Maintenance & Evolution

### Adding New Tests

**When adding a new feature:**
1. Write E2E test for user workflow (if applicable)
2. Write component test for new UI components
3. Write unit tests for new utilities
4. Update fixtures if needed

**When fixing a bug:**
1. Write a failing test that reproduces the bug
2. Fix the bug
3. Verify test passes
4. Commit test with fix

### Reviewing Test Coverage

**Monthly Review:**
- Run coverage report
- Identify untested critical paths
- Prioritize new tests for gaps
- Remove obsolete tests

**Before Major Releases:**
- Run full test suite
- Review any skipped tests
- Update fixtures for new data models
- Verify E2E tests cover new workflows

### Evolving the Strategy

This strategy should evolve as the project grows:
- Add new test types as needed
- Adjust coverage goals based on experience
- Introduce new tools if beneficial
- Refine based on what works/doesn't work

---

## Next Steps

1. **Review and approve this strategy**
2. **Begin Phase 1 implementation:**
   - Set up Vitest
   - Create test directory structure
   - Write first unit tests for dice utilities
   - Establish patterns for future tests
3. **Create initial fixture files**
4. **Document testing patterns for team**

---

## Appendix: File Inventory

### Files Requiring Tests (Phase 1)
- `src/utils/dice-utils.ts` ⭐
- `src/utils/helpers.ts` ⭐
- `src/lib/compass-planes/utils/node-conversion.ts` ⭐
- `src/lib/compass-planes/utils/inject-character-data.ts` ⭐
- `src/lib/compass-planes/utils/inject-defaults.ts` ⭐

### Files Requiring Tests (Phase 2)
- `src/lib/compass-planes/nodes/components/text/text-node.tsx` ⭐
- `src/lib/compass-planes/nodes/components/input/input-node.tsx` ⭐
- `src/lib/compass-planes/nodes/components/checkbox/checkbox-node.tsx` ⭐
- `src/lib/compass-planes/nodes/components/inventory/inventory-node.tsx` ⭐
- `src/lib/compass-planes/nodes/components/graph/graph-node.tsx` ⭐
- `src/lib/compass-planes/nodes/components/image/image-node.tsx`
- `src/lib/compass-planes/nodes/components/frame/frame-node.tsx`
- `src/components/composites/number-input.tsx`
- `src/components/composites/description-editor.tsx`
- `src/components/composites/image-upload.tsx`
- `src/pages/dice/dice-panel.tsx`
- `src/pages/characters/character-inventory-panel/character-inventory-panel.tsx`

### Files Requiring Tests (Phase 3)
- New E2E test files for workflows listed above

### Files Explicitly Excluded
- `src/components/ui/**` - Radix UI primitives
- Third-party library code
- Generated files
- Configuration files

---

**Document Version:** 1.0  
**Last Updated:** February 12, 2026  
**Status:** Awaiting Approval
