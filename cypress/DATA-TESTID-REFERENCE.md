# Data TestID Reference

This document lists all `data-testid` attributes used in the application for testing purposes.

## User Authentication

- `user-select` - User selection dropdown
- `username-input` - Username input field
- `submit-button` - Submit button for sign in/up
- `user-menu` - User menu trigger
- `sign-out` - Sign out button

## Rulesets

- `create-ruleset-button` - Create new ruleset button
- `create-ruleset-submit` - Submit button in create ruleset dialog
- `preview-card-title` - Ruleset card title (used for all preview cards)
- `preview-card-delete` - Delete button on preview card
- `preview-card-delete-confirm` - Confirm delete in alert dialog
- `preview-card-title-input` - Input when editing card title

## Characters

- `nav-characters` - Navigation link to characters section
- `create-character-button` - Create new character button
- `create-character-submit` - Submit button in create character dialog
- `character-archetype-select` - Archetype selector in create character dialog
- `character-card-name` - Character card name display
- `character-card` - Character card container
- `delete-character` - Delete character button
- `confirm-delete` - Confirm deletion button
- `nav-character-archetypes` - Archetypes panel button in sidebar
- `character-archetypes-panel` - Character archetypes sheet panel
- `character-archetypes-list` - List of archetypes on character
- `add-archetype-select` - Add archetype dropdown in Archetypes panel
- `add-archetype-button` - Add first available archetype button
- `remove-archetype-btn` - Remove archetype from character button
- `character-archetype-row-{id}` - Row for archetype on character

## Archetypes

- `archetype-switcher` - Archetype switcher in sidebar (ruleset context)
- `archetypes-new-button` - New archetype button
- `archetypes-list` - List of archetypes in ruleset
- `archetype-item-{id}` - Archetype card in management list
- `archetype-delete-btn` - Delete archetype button
- `archetype-delete-confirm` - Confirm archetype deletion in dialog

## Dice Rolling

- `dice-panel-trigger` - Button to open dice panel
- `roll-dice-button` - Button to roll dice
- `save-and-roll-button` - Button to save and roll dice
- `dice-result` - Dice roll result display
- `dice-result-total` - Total value of dice roll
- `dice-history` - Dice roll history container
- `dice-roll-item` - Individual dice roll in history

## Navigation

- `nav-characters` - Characters navigation link
- `nav-attributes` - Attributes navigation link
- `nav-actions` - Actions navigation link
- `nav-items` - Items navigation link
- `nav-charts` - Charts navigation link
- `nav-documents` - Documents navigation link
- `nav-windows` - Windows navigation link

## Common Patterns

### Preview Cards

All preview cards (rulesets, attributes, actions, items, charts, documents, windows) use the same data-testid pattern:

- `preview-card-title` - Card title
- `preview-card-delete` - Delete button
- `preview-card-delete-confirm` - Confirm delete button

To interact with a specific card:

```typescript
// Find card by title
cy.get('[data-testid="preview-card-title"]').contains('Specific Title').click();

// Click Open button on first card
cy.contains('button', 'Open').first().click();

// Delete first card
cy.get('[data-testid="preview-card-delete"]').first().click();
cy.get('[data-testid="preview-card-delete-confirm"]').click();
```

### Form Inputs

Most forms use ID selectors rather than data-testid:

```typescript
cy.get('#ruleset-title').type('Title');
cy.get('#ruleset-description').type('Description');
cy.get('#character-name').type('Character Name');
cy.get('#label').type('Label');
cy.get('#value').type('Value');
```

## Best Practices

1. **Use data-testid for interactive elements** - Buttons, links, cards
2. **Use ID for form inputs** - More semantic and accessible
3. **Use contains() for text-based selection** - When data-testid not available
4. **Avoid CSS class selectors** - They change frequently
5. **Avoid nth-child selectors** - Brittle and hard to maintain

## Adding New TestIDs

When adding new components that need testing:

1. Add `data-testid` to interactive elements
2. Use descriptive, kebab-case names
3. Document the testid in this file
4. Use consistent naming patterns

Example:

```tsx
<Button data-testid="create-item-button">
  Create Item
</Button>
```

## Common Issues

### Element Not Found

If `cy.get('[data-testid="element"]')` times out:

1. Check the data-testid actually exists in the component
2. Check if element is rendered conditionally
3. Add a timeout: `cy.get('[data-testid="element"]', { timeout: 10000 })`
4. Check if element is hidden by CSS

### Wrong Selector

If tests are hanging or failing on selectors:

1. Inspect the actual HTML in the browser
2. Check this reference document for correct testids
3. Use Cypress Test Runner to debug selector issues
4. Consider using `cy.contains()` as a fallback

**Common mistake**: Using `[data-testid*="ruleset-card-"]` or similar patterns that don't exist. Always check the actual component code for the correct data-testid values.

## Updating This Document

When adding new data-testid attributes:

1. Add them to the appropriate section
2. Include example usage
3. Keep the list alphabetically sorted within sections
4. Update the date below

**Last Updated**: February 19, 2026
