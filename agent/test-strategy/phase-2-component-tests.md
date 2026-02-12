# Phase 2: Component Tests Implementation Prompt

## Context

You are implementing Phase 2 of the Quest Bound testing strategy. This phase focuses on component testing for the compass-planes visual editor and composite UI components using Cypress Component Testing.

This is a **HIGH PRIORITY** phase because the compass-planes editor is the most volatile area of the codebase and requires protection against regressions.

## Objective

Write comprehensive component tests for:
1. Visual editor node components (text, input, checkbox, inventory, graph, image, frame)
2. Composite UI components (number-input, description-editor, image-upload)
3. Panel components (dice-panel, character-inventory-panel)

These tests will prevent regressions in the visual editor and ensure UI components behave correctly in isolation.

## Prerequisites

Read these files first:
- `agents/test-strategy.md` - Overall testing strategy
- `cypress.config.ts` - Existing Cypress configuration
- `cypress/support/component.tsx` - Cypress component test support file
- `src/lib/compass-planes/nodes/components/` - All node component files
- `src/components/composites/` - Composite component files
- `src/pages/dice/dice-panel.tsx` - Dice panel component
- `src/pages/characters/character-inventory-panel/` - Inventory panel components
- `src/types/` - Type definitions for understanding data structures

## Tasks

### 1. Install Additional Dependencies

Install @testing-library/react for better component assertions:

```bash
npm install -D @testing-library/react @testing-library/user-event
```

### 2. Create Directory Structure

Create the following directory structure:
```
cypress/
├── component/
│   ├── nodes/
│   ├── composites/
│   └── panels/
└── fixtures/
    ├── characters/
    ├── rulesets/
    ├── components/
    ├── attributes/
    ├── items/
    └── windows/
```

### 3. Create Test Fixtures

Create fixture files with realistic test data:

#### `cypress/fixtures/characters/test-character.json`
```json
{
  "id": "test-char-1",
  "name": "Test Character",
  "rulesetId": "test-ruleset-1",
  "userId": "test-user-1",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```

#### `cypress/fixtures/attributes/basic-attributes.json`
Include various attribute types:
- String attribute
- Number attribute (with min/max)
- Boolean attribute
- List attribute (single-select)
- List attribute (multi-select)

#### `cypress/fixtures/components/text-components.json`
Include text components with:
- Plain text
- Text with attribute interpolation ({{attribute_name}})
- Text with dice expressions (2d6+4)
- Text with conditional rendering

#### `cypress/fixtures/components/input-components.json`
Include input components with:
- Text input
- Number input (with min/max)
- Select/dropdown input

#### `cypress/fixtures/items/basic-items.json`
Include various item types:
- Basic item
- Equippable item
- Consumable item
- Container item

#### `cypress/fixtures/rulesets/test-ruleset.json`
Basic ruleset configuration

#### `cypress/fixtures/windows/test-window.json`
Window layout configuration

### 4. Update Cypress Component Support

Update `cypress/support/component.tsx` if needed to:
- Import @testing-library/react utilities
- Add custom mount function that wraps components with necessary providers
- Add any global component test utilities

### 5. Write Node Component Tests

Create comprehensive component tests for each editor node type:

#### A. Text Node (`cypress/component/nodes/text-node.test.tsx`)

Test `src/lib/compass-planes/nodes/components/text/text-node.tsx`:

```typescript
import { TextNode } from '@/lib/compass-planes/nodes/components/text/text-node';

describe('TextNode Component', () => {
  beforeEach(() => {
    cy.fixture('components/text-components.json').as('textComponents');
  });

  it('should render plain text content', () => {
    // Test basic text rendering
  });

  it('should interpolate character attribute values', () => {
    // Test {{attribute_name}} replacement
  });

  it('should detect and highlight dice expressions', () => {
    // Test dice notation detection (2d6+4)
  });

  it('should apply text styling (font, color, size)', () => {
    // Test style application
  });

  it('should handle conditional rendering based on attribute', () => {
    // Test conditionalRenderAttributeId
  });

  it('should handle missing attributes gracefully', () => {
    // Test when referenced attribute doesn't exist
  });

  it('should support special {{name}} token', () => {
    // Test character name interpolation
  });
});
```

**Key things to test:**
- Text rendering
- Attribute interpolation
- Dice expression detection
- Styling (font family, size, color, alignment)
- Conditional rendering
- Edge cases (empty text, missing attributes)

#### B. Input Node (`cypress/component/nodes/input-node.test.tsx`)

Test `src/lib/compass-planes/nodes/components/input/input-node.tsx`:

```typescript
describe('InputNode Component', () => {
  it('should render text input and update attribute', () => {
    // Test text input type
  });

  it('should render number input with min/max validation', () => {
    // Test number input with boundaries
  });

  it('should render select dropdown with options', () => {
    // Test dropdown with attribute options
  });

  it('should display current attribute value', () => {
    // Test value display
  });

  it('should handle disabled state', () => {
    // Test disabled input
  });

  it('should validate number input boundaries', () => {
    // Test min/max enforcement
  });

  it('should update character attribute on change', () => {
    // Test attribute update
  });
});
```

**Key things to test:**
- Different input types (text, number, select)
- Value display and updates
- Min/max validation for numbers
- Dropdown options from attributes
- Disabled state
- Attribute updates

#### C. Checkbox Node (`cypress/component/nodes/checkbox-node.test.tsx`)

Test `src/lib/compass-planes/nodes/components/checkbox/checkbox-node.tsx`:

```typescript
describe('CheckboxNode Component', () => {
  it('should render checked state for true attribute', () => {});
  
  it('should render unchecked state for false attribute', () => {});
  
  it('should toggle attribute value on click', () => {});
  
  it('should apply custom styling', () => {});
  
  it('should handle disabled state', () => {});
});
```

#### D. Inventory Node (`cypress/component/nodes/inventory-node.test.tsx`)

Test `src/lib/compass-planes/nodes/components/inventory/inventory-node.tsx`:

```typescript
describe('InventoryNode Component', () => {
  it('should render inventory grid', () => {});
  
  it('should display items in correct positions', () => {});
  
  it('should show item tooltips on hover', () => {});
  
  it('should handle drag-and-drop (if applicable in component test)', () => {});
  
  it('should display item quantities', () => {});
  
  it('should show empty slots', () => {});
  
  it('should handle items with different sizes', () => {});
});
```

**Note:** Drag-and-drop may be better tested in E2E. Focus on rendering and display in component tests.

#### E. Graph Node (`cypress/component/nodes/graph-node.test.tsx`)

Test `src/lib/compass-planes/nodes/components/graph/graph-node.tsx`:

```typescript
describe('GraphNode Component', () => {
  it('should render linear progress bar', () => {});
  
  it('should render circular progress indicator', () => {});
  
  it('should calculate percentage correctly', () => {});
  
  it('should handle min/max values', () => {});
  
  it('should update when attribute changes', () => {});
  
  it('should handle zero/negative values', () => {});
  
  it('should apply custom colors', () => {});
});
```

#### F. Image Node (`cypress/component/nodes/image-node.test.tsx`)

Test `src/lib/compass-planes/nodes/components/image/image-node.tsx`:

```typescript
describe('ImageNode Component', () => {
  it('should display image from asset', () => {});
  
  it('should handle missing image gracefully', () => {});
  
  it('should apply sizing (width, height)', () => {});
  
  it('should apply positioning', () => {});
  
  it('should handle asset URL references', () => {});
});
```

#### G. Frame Node (`cypress/component/nodes/frame-node.test.tsx`)

Test `src/lib/compass-planes/nodes/components/frame/frame-node.tsx`:

```typescript
describe('FrameNode Component', () => {
  it('should render container boundaries', () => {});
  
  it('should contain child components', () => {});
  
  it('should apply background styling', () => {});
  
  it('should handle nested layouts', () => {});
  
  it('should apply border styling', () => {});
});
```

### 6. Write Composite Component Tests

#### A. Number Input (`cypress/component/composites/number-input.test.tsx`)

Test `src/components/composites/number-input.tsx`:

```typescript
describe('NumberInput Component', () => {
  it('should increment value on up button click', () => {});
  
  it('should decrement value on down button click', () => {});
  
  it('should accept direct input', () => {});
  
  it('should enforce min value', () => {});
  
  it('should enforce max value', () => {});
  
  it('should handle disabled state', () => {});
  
  it('should call onChange with new value', () => {});
});
```

#### B. Description Editor (`cypress/component/composites/description-editor.test.tsx`)

Test `src/components/composites/description-editor.tsx`:

```typescript
describe('DescriptionEditor Component', () => {
  it('should render initial content', () => {});
  
  it('should allow text editing', () => {});
  
  it('should support markdown (if applicable)', () => {});
  
  it('should call onChange with updated content', () => {});
  
  it('should handle empty content', () => {});
});
```

#### C. Image Upload (`cypress/component/composites/image-upload.test.tsx`)

Test `src/components/composites/image-upload.tsx`:

```typescript
describe('ImageUpload Component', () => {
  it('should show upload button when no image', () => {});
  
  it('should display preview after upload', () => {});
  
  it('should validate file type', () => {});
  
  it('should show error for invalid files', () => {});
  
  it('should allow removing uploaded image', () => {});
  
  it('should call onUpload with file data', () => {});
});
```

### 7. Write Panel Component Tests

#### A. Dice Panel (`cypress/component/panels/dice-panel.test.tsx`)

Test `src/pages/dice/dice-panel.tsx`:

```typescript
describe('DicePanel Component', () => {
  it('should display roll history', () => {});
  
  it('should show roll results with notation', () => {});
  
  it('should format dice expressions correctly', () => {});
  
  it('should display individual die results', () => {});
  
  it('should show total for each roll', () => {});
  
  it('should handle empty history', () => {});
});
```

#### B. Character Inventory Panel (`cypress/component/panels/character-inventory-panel.test.tsx`)

Test `src/pages/characters/character-inventory-panel/character-inventory-panel.tsx`:

```typescript
describe('CharacterInventoryPanel Component', () => {
  it('should display character items', () => {});
  
  it('should filter items by category', () => {});
  
  it('should sort items', () => {});
  
  it('should show item details on selection', () => {});
  
  it('should display item quantities', () => {});
  
  it('should handle empty inventory', () => {});
  
  it('should show equipped items indicator', () => {});
});
```

### 8. Update package.json Scripts

Ensure these scripts exist in `package.json`:

```json
{
  "scripts": {
    "test:component": "cypress run --component",
    "test:component:open": "cypress open --component"
  }
}
```

### 9. Verify Setup

Run the following commands to verify everything works:

```bash
# Run component tests headlessly
npm run test:component

# Open component test UI
npm run test:component:open
```

## Test Writing Guidelines

### Component Test Structure

```typescript
import { ComponentName } from '@/path/to/component';

describe('ComponentName', () => {
  beforeEach(() => {
    // Load fixtures
    cy.fixture('path/to/fixture.json').as('fixtureData');
  });

  it('should render with default props', () => {
    cy.mount(<ComponentName prop="value" />);
    
    // Assertions
    cy.get('[data-testid="element"]').should('be.visible');
  });

  it('should handle user interaction', () => {
    const onChangeSpy = cy.spy().as('onChangeSpy');
    
    cy.mount(<ComponentName onChange={onChangeSpy} />);
    
    cy.get('[data-testid="button"]').click();
    
    cy.get('@onChangeSpy').should('have.been.calledOnce');
  });
});
```

### Best Practices

1. **Use fixtures for complex data** - Keep test files focused on behavior
2. **Test user-visible behavior** - Not implementation details
3. **Use data-testid for selection** - More reliable than CSS selectors
4. **Test accessibility** - Check for proper labels, ARIA attributes
5. **Mock callbacks** - Use cy.spy() to verify function calls
6. **Keep tests isolated** - Each test should be independent
7. **Test edge cases** - Empty states, missing data, errors
8. **Use descriptive test names** - Explain what's being tested

### Mocking Context/Providers

If components need context providers, create a wrapper:

```typescript
const mountWithProviders = (component: React.ReactElement) => {
  return cy.mount(
    <SomeProvider value={mockValue}>
      {component}
    </SomeProvider>
  );
};
```

### Testing Attribute Updates

For components that update character attributes:

```typescript
it('should update attribute value', () => {
  const mockCharacter = { /* ... */ };
  const mockAttribute = { /* ... */ };
  const onUpdateSpy = cy.spy().as('onUpdateSpy');
  
  cy.mount(
    <InputNode 
      character={mockCharacter}
      attribute={mockAttribute}
      onUpdate={onUpdateSpy}
    />
  );
  
  cy.get('input').type('new value');
  cy.get('@onUpdateSpy').should('have.been.called');
});
```

## Success Criteria

Phase 2 is complete when:
- ✅ All 7 editor node components have comprehensive tests
- ✅ All 3 composite components have tests
- ✅ Both panel components have tests
- ✅ Fixture data structure is established and documented
- ✅ 60%+ code coverage for tested components
- ✅ All tests pass consistently
- ✅ Tests run in < 30 seconds
- ✅ Component tests can be run in isolation
- ✅ Test patterns are documented for future components

## Deliverables

1. **Test Files:**
   - `cypress/component/nodes/text-node.test.tsx`
   - `cypress/component/nodes/input-node.test.tsx`
   - `cypress/component/nodes/checkbox-node.test.tsx`
   - `cypress/component/nodes/inventory-node.test.tsx`
   - `cypress/component/nodes/graph-node.test.tsx`
   - `cypress/component/nodes/image-node.test.tsx`
   - `cypress/component/nodes/frame-node.test.tsx`
   - `cypress/component/composites/number-input.test.tsx`
   - `cypress/component/composites/description-editor.test.tsx`
   - `cypress/component/composites/image-upload.test.tsx`
   - `cypress/component/panels/dice-panel.test.tsx`
   - `cypress/component/panels/character-inventory-panel.test.tsx`

2. **Fixture Files:**
   - `cypress/fixtures/characters/test-character.json`
   - `cypress/fixtures/rulesets/test-ruleset.json`
   - `cypress/fixtures/components/text-components.json`
   - `cypress/fixtures/components/input-components.json`
   - `cypress/fixtures/attributes/basic-attributes.json`
   - `cypress/fixtures/items/basic-items.json`
   - `cypress/fixtures/windows/test-window.json`

3. **Documentation:**
   - Update `agents/test-strategy.md` with any learnings
   - Document fixture structure and usage patterns
   - Note any component testing utilities created

## Notes

- **Focus on the compass-planes editor first** - It's the most volatile
- **Don't test Radix UI primitives** - Only test your custom components
- **Component tests should be fast** - If they're slow, consider mocking
- **Test isolation is critical** - Each test should work independently
- **Fixtures should be realistic** - Use data that mirrors production

## Common Challenges & Solutions

### Challenge: Component needs database access
**Solution:** Mock the database hooks or pass data via props

### Challenge: Component uses React Context
**Solution:** Create a test wrapper with context providers

### Challenge: Component has complex state
**Solution:** Test state changes through user interactions, not direct state access

### Challenge: Drag-and-drop testing
**Solution:** May be better suited for E2E tests; focus on rendering in component tests

### Challenge: Async operations
**Solution:** Use Cypress's built-in retry-ability and assertions

## After Completion

Once Phase 2 is complete:
1. Review component test coverage
2. Document any reusable test utilities created
3. Identify patterns for testing similar components
4. Prepare for Phase 3 (E2E Workflow Tests)
5. Consider adding component tests to CI/CD pipeline
