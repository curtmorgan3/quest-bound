# Component Testing Guide

This directory contains Cypress component tests for Quest Bound. Component tests allow us to test React components in isolation without needing a full application context.

## Directory Structure

```
cypress/component/
├── nodes/          # Tests for compass-planes editor node components
├── composites/     # Tests for reusable composite UI components  
├── panels/         # Tests for panel components
└── README.md       # This file
```

## Running Tests

```bash
# Run all component tests headlessly
npm run test:component

# Open Cypress component test UI
npm run test:component:open
```

## Writing Component Tests

### Basic Test Structure

```typescript
import { ComponentName } from '@/path/to/component';

describe('ComponentName', () => {
  it('should render with default props', () => {
    cy.mount(<ComponentName prop="value" />);
    
    cy.get('[data-testid="element"]').should('be.visible');
  });

  it('should handle user interaction', () => {
    const onChangeSpy = cy.spy().as('onChangeSpy');
    
    cy.mount(<ComponentName onChange={onChangeSpy} />);
    
    cy.get('input').type('test');
    
    cy.get('@onChangeSpy').should('have.been.called');
  });
});
```

### Best Practices

1. **Test User-Visible Behavior** - Focus on what users see and interact with, not implementation details
2. **Use Spies for Callbacks** - Use `cy.spy()` to verify function calls
3. **Keep Tests Simple** - Each test should verify one specific behavior
4. **Use Fixtures** - Load test data from `cypress/fixtures/` for complex scenarios
5. **Test Edge Cases** - Include tests for empty states, errors, and boundary conditions
6. **Avoid Over-Mocking** - Only mock what's necessary (external APIs, context providers)

### Testing Components with Context

For components that require React Context, wrap them in providers:

```typescript
import { SomeProvider } from '@/stores';

it('should work with context', () => {
  const mockValue = { /* mock context value */ };
  
  cy.mount(
    <SomeProvider value={mockValue}>
      <ComponentName />
    </SomeProvider>
  );
  
  // assertions...
});
```

### Using Fixtures

Load test data from fixture files:

```typescript
beforeEach(() => {
  cy.fixture('components/text-components.json').as('textComponents');
});

it('should render with fixture data', function() {
  const component = this.textComponents[0];
  
  cy.mount(<TextNode component={component} />);
  
  // assertions...
});
```

## Current Test Coverage

### Composite Components
- ✅ **NumberInput** - 7 tests covering rendering, value changes, min/max, disabled state
- ✅ **DescriptionEditor** - 5 tests covering rendering and content display

### Node Components
- ⏳ **TextNode** - Pending (requires context mocking)
- ⏳ **InputNode** - Pending (requires context mocking)
- ⏳ **CheckboxNode** - Pending (requires context mocking)
- ⏳ **InventoryNode** - Pending (requires context mocking)
- ⏳ **GraphNode** - Pending (requires context mocking)
- ⏳ **ImageNode** - Pending (requires context mocking)
- ⏳ **FrameNode** - Pending (requires context mocking)

### Panel Components
- ⏳ **DicePanel** - Pending (requires context mocking)
- ⏳ **CharacterInventoryPanel** - Pending (requires context mocking)

## Challenges & Solutions

### Challenge: Component Requires Context
**Solution:** Create a wrapper component or use `cy.mountWithProviders()` helper

### Challenge: Component Has Complex State
**Solution:** Test state changes through user interactions, not direct state access

### Challenge: Testing Async Operations
**Solution:** Use Cypress's built-in retry-ability and `should()` assertions

### Challenge: Component Uses External APIs
**Solution:** Mock the API calls using `cy.intercept()` or mock the hooks

## Future Improvements

1. Add tests for editor node components (text, input, checkbox, etc.)
2. Add tests for panel components (dice-panel, inventory-panel)
3. Create reusable test utilities for common patterns
4. Add visual regression testing
5. Increase coverage to 60%+ for tested components

## Resources

- [Cypress Component Testing Docs](https://docs.cypress.io/guides/component-testing/overview)
- [Testing Library Best Practices](https://testing-library.com/docs/guiding-principles/)
- [Quest Bound Test Strategy](../../agent/test-strategy/test-strategy.md)
