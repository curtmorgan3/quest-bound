# E2E Test Selector Fixes Summary

## Problem

E2E tests were using incorrect `data-testid` selectors that don't exist in the codebase, causing tests to hang or timeout.

## Root Cause

Tests were using selectors like:
- `[data-testid*="ruleset-card-"]`
- `[data-testid="ruleset-card-title"]`
- `[data-testid="character-card-name"]`
- `[data-testid="open-ruleset-{id}"]`
- `[data-testid="delete-ruleset-{id}"]`

These selectors were never implemented in the actual components.

## Actual Selectors

All preview cards (rulesets, characters, attributes, actions, items, charts, documents, windows) use the **same `PreviewCard` component** with these `data-testid` values:

- `preview-card-title` - Card title
- `preview-card-delete` - Delete button
- `preview-card-delete-confirm` - Confirm delete in alert dialog
- `preview-card-title-input` - Input when editing title
- `preview-card-description-input` - Input when editing description/category

## Files Fixed

### ✅ Fully Fixed and Passing
1. **ruleset-management.cy.ts** - 4/4 tests passing
2. **window-management.cy.ts** - 11/11 tests passing

### ✅ Selectors Fixed (not yet tested)
3. **item-management.cy.ts** - Fixed 11 instances
4. **attribute-management.cy.ts** - Fixed 10 instances
5. **action-management.cy.ts** - Fixed 9 instances
6. **multi-user.cy.ts** - Fixed 10 instances
7. **character-management.cy.ts** - Fixed 10 instances (has additional routing issues)
8. **dice-integration.cy.ts** - Fixed 1 instance

## Changes Made

### Pattern 1: Opening Ruleset Cards

**Before (incorrect):**
```typescript
cy.get('[data-testid*="ruleset-card-"]')
  .first()
  .then(($card) => {
    const cardTestId = $card.attr('data-testid');
    const rulesetId = cardTestId?.replace('ruleset-card-', '');
    cy.get(`[data-testid="open-ruleset-${rulesetId}"]`).click();
  });
```

**After (correct):**
```typescript
cy.contains('button', 'Open').first().click();
```

### Pattern 2: Checking Card Titles

**Before (incorrect):**
```typescript
cy.get('[data-testid="ruleset-card-title"]').should('contain', 'My Ruleset');
cy.get('[data-testid="character-card-name"]').should('contain', 'My Character');
```

**After (correct):**
```typescript
cy.get('[data-testid="preview-card-title"]').should('contain', 'My Ruleset');
cy.get('[data-testid="preview-card-title"]').should('contain', 'My Character');
```

### Pattern 3: Deleting Cards

**Before (incorrect):**
```typescript
cy.get('button').contains('Delete').click();
cy.contains('Window To Delete').should('not.exist');
```

**After (correct):**
```typescript
cy.get('[data-testid="preview-card-delete"]').first().click();
cy.get('[data-testid="preview-card-delete-confirm"]').click();
cy.get('body').should('not.contain', 'Window To Delete');
```

## Verification

Run tests to verify fixes:

```bash
# Test individual files
npx cypress run --e2e --spec "cypress/e2e/ruleset-management.cy.ts"
npx cypress run --e2e --spec "cypress/e2e/window-management.cy.ts"
npx cypress run --e2e --spec "cypress/e2e/item-management.cy.ts"
npx cypress run --e2e --spec "cypress/e2e/attribute-management.cy.ts"
npx cypress run --e2e --spec "cypress/e2e/action-management.cy.ts"

# Test all E2E tests
npm run test:e2e
```

## Reference Documentation

See `cypress/DATA-TESTID-REFERENCE.md` for a complete list of all available `data-testid` values in the application.

## Navigation Items Status

✅ **Navigation items ARE working correctly!**

The `data-testid` attributes for navigation items work as expected:
- `nav-attributes`
- `nav-actions`
- `nav-items`
- `nav-charts`
- `nav-documents`
- `nav-windows`

These are available when viewing a ruleset (after clicking "Open" on a ruleset card).

## Remaining Issues

The `character-management.cy.ts` tests have been updated with correct selectors, but have additional routing/navigation issues that need to be addressed separately. The tests are trying to navigate to `/characters` after creating a ruleset, but the character creation flow may need adjustment.

## Prevention

To prevent this issue in the future:

1. Always check the actual component code for `data-testid` values before writing tests
2. Use the `DATA-TESTID-REFERENCE.md` document as the source of truth
3. When adding new components, document their `data-testid` values immediately
4. Run tests frequently during development to catch selector issues early

**Last Updated:** February 12, 2026
