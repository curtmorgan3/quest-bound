# Component Tests - Phase 2 Implementation

## Overview

This document describes the component testing implementation for Quest Bound, focusing on the compass-planes visual editor and composite UI components using Cypress Component Testing.

## Test Structure

### Node Component Tests (`cypress/component/nodes/`)

1. **text-node.test.tsx** - Tests for text display components
   - Plain text rendering
   - Attribute interpolation
   - Dice expression detection and rolling
   - Text styling (font, color, size, alignment)
   - Conditional rendering
   - Edge cases (empty text, missing attributes)

2. **input-node.test.tsx** - Tests for input components
   - Text input rendering and updates
   - Number input with min/max validation
   - Select dropdown with options
   - Multi-select dialogs
   - Disabled states
   - Custom styling
   - Attribute vs component data updates

3. **checkbox-node.test.tsx** - Tests for checkbox components
   - Checked/unchecked states
   - Toggle functionality
   - Custom images for checked/unchecked states
   - Disabled states
   - Custom styling

4. **graph-node.test.tsx** - Tests for progress indicators
   - Horizontal linear progress bars
   - Vertical linear progress bars
   - Circular progress indicators
   - Percentage calculations
   - Min/max value handling
   - Custom colors
   - Edge cases (zero values, division by zero)

5. **image-node.test.tsx** - Tests for image display
   - Image from URL
   - Character image vs component image
   - Sizing and positioning
   - Border radius styling
   - Missing image handling

6. **frame-node.test.tsx** - Tests for iframe containers
   - URL rendering
   - Sizing
   - Border and styling
   - Empty URL handling

7. **inventory-node.test.tsx** - Tests for inventory grid
   - Grid rendering
   - Item positioning
   - Item quantities
   - Different item sizes
   - Empty slots
   - Item filtering by component ID
   - Disabled items (opacity)

### Composite Component Tests (`cypress/component/composites/`)

1. **number-input.test.tsx** - Tests for number input with wheel picker
   - Value rendering and updates
   - Popover with wheel picker
   - Preset buttons
   - Add/Subtract buttons
   - Set button
   - Min/max constraints
   - Disabled state
   - Custom styling

2. **description-editor.test.tsx** - Tests for markdown editor
   - Edit mode rendering
   - Text editing
   - Preview mode with markdown rendering
   - Mode switching
   - Placeholder handling
   - Disabled state
   - Save on Enter

3. **image-upload.test.tsx** - Tests for image upload component
   - Upload button display
   - Image preview
   - Remove button on hover
   - File input (hidden)
   - URL dialog
   - URL validation
   - Error handling

### Panel Component Tests (`cypress/component/panels/`)

1. **dice-panel.test.tsx** - Tests for dice rolling panel
   - Panel rendering
   - Label and value inputs
   - Roll button
   - Save and Roll button
   - Rolling state
   - Result display
   - Saved rolls list
   - Empty state

2. **character-inventory-panel.test.tsx** - Tests for inventory management
   - Panel rendering
   - Type filter (Items/Actions/Attributes)
   - Search/filter by title
   - Item display
   - Total weight calculation
   - Empty states
   - Virtualized list

## Test Fixtures

Test fixtures are located in `cypress/fixtures/` and provide realistic test data:

- `characters/test-character.json` - Sample character data
- `rulesets/test-ruleset.json` - Sample ruleset configuration
- `attributes/basic-attributes.json` - Various attribute types (string, number, boolean, list)
- `components/text-components.json` - Text components with different configurations
- `components/input-components.json` - Input components with various types
- `items/basic-items.json` - Sample inventory items
- `windows/test-window.json` - Window layout configuration

## Running Tests

```bash
# Run all component tests headlessly
npm run test:component

# Open component test UI
npm run test:component:open
```

## Test Utilities

Helper functions are available in `cypress/support/component.tsx`:

- `createMockComponent()` - Creates mock component with default structure
- `createMockCharacterContext()` - Creates mock character context for testing
- `createMockWindowEditorContext()` - Creates mock window editor context

## Best Practices

1. **Use fixtures for complex data** - Keep test files focused on behavior
2. **Test user-visible behavior** - Not implementation details
3. **Use data-testid for selection** - More reliable than CSS selectors (when available)
4. **Test accessibility** - Check for proper labels, ARIA attributes
5. **Mock callbacks** - Use cy.stub() to verify function calls
6. **Keep tests isolated** - Each test should be independent
7. **Test edge cases** - Empty states, missing data, errors
8. **Use descriptive test names** - Explain what's being tested

## Coverage

The component tests cover:
- 7 editor node components (text, input, checkbox, inventory, graph, image, frame)
- 3 composite components (number-input, description-editor, image-upload)
- 2 panel components (dice-panel, character-inventory-panel)

Total: **12 test files** with comprehensive test coverage for the most volatile areas of the codebase.

## Known Issues and Limitations

1. Some tests may need adjustment based on actual component behavior
2. Drag-and-drop testing in inventory is limited to basic rendering tests
3. Some components require mocking of hooks (useAssets, useDiceRolls, etc.)
4. Tests focus on rendering and user interactions, not integration with database

## Next Steps

1. Monitor test results and fix any failing tests
2. Add more edge case tests as needed
3. Consider adding visual regression testing
4. Integrate tests into CI/CD pipeline
5. Add E2E tests for full workflow testing (Phase 3)
