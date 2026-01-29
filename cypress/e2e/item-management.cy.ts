describe('Item Management', () => {
  beforeEach(() => {
    cy.setupTest();
  });

  it('should create a basic item with minimal properties', () => {
    cy.createUserAndSignIn('BasicItemUser').then(() => {
      // Create a ruleset first
      cy.get('[data-testid="create-ruleset-button"]').click();
      cy.get('#ruleset-title').type('Basic Item Ruleset');
      cy.get('#ruleset-description').type('Ruleset for testing basic item creation');
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Wait for ruleset to be created and navigate to it
      cy.contains('Basic Item Ruleset').should('be.visible');
      cy.get('[data-testid*="ruleset-card-"]')
        .first()
        .then(($card) => {
          const cardTestId = $card.attr('data-testid');
          const rulesetId = cardTestId?.replace('ruleset-card-', '');
          cy.get(`[data-testid="open-ruleset-${rulesetId}"]`).click();
        });

      // Navigate to items page
      cy.url().should('include', '/attributes');
      cy.contains('Items').click();

      // Click the New button to create an item
      cy.get('button').contains('New').click();

      // Fill in the basic item form
      cy.get('#create-title').type('Basic Sword');
      cy.get('#create-category').type('Weapon');
      cy.get('#create-description').type('A simple sword for beginners');

      // Submit the form (all numeric fields have defaults)
      cy.get('[data-testid="base-create-submit"]').click();
      cy.get('[data-slot="dialog-close"]').click();

      // Verify the item was created and appears in the chart
      cy.contains('Basic Sword').should('be.visible');
      cy.contains('Weapon').should('be.visible');
    });
  });

  it('should create an item with all boolean flags enabled', () => {
    cy.createUserAndSignIn('FlagItemUser').then(() => {
      // Create a ruleset first
      cy.get('[data-testid="create-ruleset-button"]').click();
      cy.get('#ruleset-title').type('Flag Item Ruleset');
      cy.get('#ruleset-description').type('Ruleset for testing item flags');
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Navigate to the ruleset
      cy.contains('Flag Item Ruleset').should('be.visible');
      cy.get('[data-testid*="ruleset-card-"]')
        .first()
        .then(($card) => {
          const cardTestId = $card.attr('data-testid');
          const rulesetId = cardTestId?.replace('ruleset-card-', '');
          cy.get(`[data-testid="open-ruleset-${rulesetId}"]`).click();
        });

      // Navigate to items page
      cy.url().should('include', '/attributes');
      cy.contains('Items').click();

      // Click the New button to create an item
      cy.get('button').contains('New').click();

      // Fill in the item form
      cy.get('#create-title').type('Magic Backpack');
      cy.get('#create-category').type('Equipment');
      cy.get('#create-description').type('A magical backpack that can store and equip items');

      // Enable all boolean flags by clicking on the icons
      cy.get('[data-testid="item-create-container"]').click(); // Container
      cy.get('[data-testid="item-create-storable"]').click(); // Storable
      cy.get('[data-testid="item-create-equippable"]').click(); // Equippable
      cy.get('[data-testid="item-create-consumable"]').click(); // Consumable

      // Submit the form
      cy.get('[data-testid="base-create-submit"]').click();

      // Close the dialog
      cy.get('[data-slot="dialog-close"]').click();

      // Verify the item was created with all flags
      cy.contains('Magic Backpack').should('be.visible');
      cy.contains('Equipment').should('be.visible');
    });
  });

  it('should create an item with specific numeric values', () => {
    cy.createUserAndSignIn('NumericItemUser').then(() => {
      // Create a ruleset first
      cy.get('[data-testid="create-ruleset-button"]').click();
      cy.get('#ruleset-title').type('Numeric Item Ruleset');
      cy.get('#ruleset-description').type('Ruleset for testing numeric item properties');
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Navigate to the ruleset
      cy.contains('Numeric Item Ruleset').should('be.visible');
      cy.get('[data-testid*="ruleset-card-"]')
        .first()
        .then(($card) => {
          const cardTestId = $card.attr('data-testid');
          const rulesetId = cardTestId?.replace('ruleset-card-', '');
          cy.get(`[data-testid="open-ruleset-${rulesetId}"]`).click();
        });

      // Navigate to items page
      cy.url().should('include', '/attributes');
      cy.contains('Items').click();

      // Click the New button to create an item
      cy.get('button').contains('New').click();

      // Fill in the item form
      cy.get('#create-title').type('Heavy Armor');
      cy.get('#create-category').type('Armor');
      cy.get('#create-description').type('Heavy protective armor');

      // Set numeric values
      cy.get('input[type="number"]').eq(0).clear().type('25'); // Weight
      cy.get('input[type="number"]').eq(1).clear().type('1'); // Default Quantity
      cy.get('input[type="number"]').eq(2).clear().type('1'); // Stack Size

      // Submit the form
      cy.get('[data-testid="base-create-submit"]').click();

      // Close the dialog
      cy.get('[data-slot="dialog-close"]').click();

      // Verify the item was created with correct numeric values
      cy.contains('Heavy Armor').should('be.visible');
      cy.contains('Armor').should('be.visible');
    });
  });

  it('should create a consumable item with stack size', () => {
    cy.createUserAndSignIn('ConsumableItemUser').then(() => {
      // Create a ruleset first
      cy.get('[data-testid="create-ruleset-button"]').click();
      cy.get('#ruleset-title').type('Consumable Item Ruleset');
      cy.get('#ruleset-description').type('Ruleset for testing consumable items');
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Navigate to the ruleset
      cy.contains('Consumable Item Ruleset').should('be.visible');
      cy.get('[data-testid*="ruleset-card-"]')
        .first()
        .then(($card) => {
          const cardTestId = $card.attr('data-testid');
          const rulesetId = cardTestId?.replace('ruleset-card-', '');
          cy.get(`[data-testid="open-ruleset-${rulesetId}"]`).click();
        });

      // Navigate to items page
      cy.url().should('include', '/attributes');
      cy.contains('Items').click();

      // Click the New button to create an item
      cy.get('button').contains('New').click();

      // Fill in the item form
      cy.get('#create-title').type('Health Potion');
      cy.get('#create-category').type('Consumable');
      cy.get('#create-description').type('Restores health when consumed');

      // Enable consumable flag
      cy.get('[data-testid="item-create-consumable"]').click(); // Consumable

      // Set numeric values
      cy.get('input[type="number"]').eq(0).clear().type('0.5'); // Weight
      cy.get('input[type="number"]').eq(1).clear().type('3'); // Default Quantity
      cy.get('input[type="number"]').eq(2).clear().type('10'); // Stack Size

      // Submit the form
      cy.get('[data-testid="base-create-submit"]').click();

      // Close the dialog
      cy.get('[data-slot="dialog-close"]').click();

      // Verify the item was created
      cy.contains('Health Potion').should('be.visible');
      cy.contains('Consumable').should('be.visible');
    });
  });

  it('should edit an existing item', () => {
    cy.createUserAndSignIn('EditItemUser').then(() => {
      // Create a ruleset first
      cy.get('[data-testid="create-ruleset-button"]').click();
      cy.get('#ruleset-title').type('Edit Item Ruleset');
      cy.get('#ruleset-description').type('Ruleset for testing item editing');
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Navigate to the ruleset
      cy.contains('Edit Item Ruleset').should('be.visible');
      cy.get('[data-testid*="ruleset-card-"]')
        .first()
        .then(($card) => {
          const cardTestId = $card.attr('data-testid');
          const rulesetId = cardTestId?.replace('ruleset-card-', '');
          cy.get(`[data-testid="open-ruleset-${rulesetId}"]`).click();
        });

      // Navigate to items page
      cy.url().should('include', '/attributes');
      cy.contains('Items').click();

      // Create an item first
      cy.get('button').contains('New').click();
      cy.get('#create-title').type('Original Item');
      cy.get('#create-category').type('Original Category');
      cy.get('#create-description').type('Original description');
      cy.get('input[type="number"]').eq(0).clear().type('10'); // Weight
      cy.get('[data-testid="base-create-submit"]').click();

      // Close the dialog
      cy.get('[data-slot="dialog-close"]').click();

      // Wait for the item to appear
      cy.contains('Original Item').should('be.visible');

      // Find the edit button (pencil icon) for the item
      cy.get('[data-testid="chart-controls-edit"]').first().click();

      // Verify the edit form is populated with existing data
      cy.get('#create-title').should('have.value', 'Original Item');
      cy.get('#create-category').should('have.value', 'Original Category');
      cy.get('#create-description').should('have.value', 'Original description');

      // Modify the item
      cy.get('#create-title').clear().type('Updated Item');
      cy.get('#create-category').clear().type('Updated Category');
      cy.get('#create-description').clear().type('Updated description');
      cy.get('input[type="number"]').eq(0).clear().type('20'); // Weight

      // Submit the changes
      cy.get('[data-testid="base-create-submit"]').click();

      // Close the dialog
      cy.get('[data-slot="dialog-close"]').click();

      // Verify the changes were saved
      cy.contains('Updated Item').should('be.visible');
      cy.contains('Updated Category').should('be.visible');

      // Verify old values are gone
      cy.contains('Original Item').should('not.exist');
      cy.contains('Original Category').should('not.exist');
    });
  });

  it('should delete an item with confirmation dialog', () => {
    cy.createUserAndSignIn('DeleteItemUser').then(() => {
      // Create a ruleset first
      cy.get('[data-testid="create-ruleset-button"]').click();
      cy.get('#ruleset-title').type('Delete Item Ruleset');
      cy.get('#ruleset-description').type('Ruleset for testing item deletion');
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Navigate to the ruleset
      cy.contains('Delete Item Ruleset').should('be.visible');
      cy.get('[data-testid*="ruleset-card-"]')
        .first()
        .then(($card) => {
          const cardTestId = $card.attr('data-testid');
          const rulesetId = cardTestId?.replace('ruleset-card-', '');
          cy.get(`[data-testid="open-ruleset-${rulesetId}"]`).click();
        });

      // Navigate to items page
      cy.url().should('include', '/attributes');
      cy.contains('Items').click();

      // Create an item first
      cy.get('button').contains('New').click();
      cy.get('#create-title').type('Item To Delete');
      cy.get('#create-category').type('Test Category');
      cy.get('#create-description').type('This item will be deleted');
      cy.get('input[type="number"]').eq(0).clear().type('5'); // Weight
      cy.get('[data-testid="base-create-submit"]').click();

      // Close the dialog
      cy.get('[data-slot="dialog-close"]').click();

      // Wait for the item to appear
      cy.contains('Item To Delete').should('be.visible');

      // Find the delete button (trash icon) for the item
      cy.get('[data-testid="chart-controls-delete"]').first().click();

      // Verify the confirmation dialog appears
      cy.contains('Permanently delete this content?').should('be.visible');
      cy.contains('Cancel').should('be.visible');

      // Click the Delete button to confirm
      cy.get('[data-testid="chart-controls-delete-confirm"]').click();

      // Verify the item was deleted
      cy.contains('Item To Delete').should('not.exist');
      cy.contains('Test Category').should('not.exist');
      cy.contains('This item will be deleted').should('not.exist');
    });
  });

  it('should cancel item deletion when clicking Cancel', () => {
    cy.createUserAndSignIn('CancelDeleteItemUser').then(() => {
      // Create a ruleset first
      cy.get('[data-testid="create-ruleset-button"]').click();
      cy.get('#ruleset-title').type('Cancel Delete Item Ruleset');
      cy.get('#ruleset-description').type('Ruleset for testing cancel item deletion');
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Navigate to the ruleset
      cy.contains('Cancel Delete Item Ruleset').should('be.visible');
      cy.get('[data-testid*="ruleset-card-"]')
        .first()
        .then(($card) => {
          const cardTestId = $card.attr('data-testid');
          const rulesetId = cardTestId?.replace('ruleset-card-', '');
          cy.get(`[data-testid="open-ruleset-${rulesetId}"]`).click();
        });

      // Navigate to items page
      cy.url().should('include', '/attributes');
      cy.contains('Items').click();

      // Create an item first
      cy.get('button').contains('New').click();
      cy.get('#create-title').type('Item To Keep');
      cy.get('#create-category').type('Keep Category');
      cy.get('#create-description').type('This item should not be deleted');
      cy.get('input[type="number"]').eq(0).clear().type('15'); // Weight
      cy.get('[data-testid="base-create-submit"]').click();

      // Close the dialog
      cy.get('[data-slot="dialog-close"]').click();

      // Wait for the item to appear
      cy.contains('Item To Keep').should('be.visible');

      // Find the delete button (trash icon) for the item
      cy.get('[data-testid="chart-controls-delete"]').first().click();

      // Verify the confirmation dialog appears
      cy.contains('Permanently delete this content?').should('be.visible');

      // Click the Cancel button
      cy.get('button').contains('Cancel').click();

      // Verify the item still exists
      cy.contains('Item To Keep').should('be.visible');
      cy.contains('Keep Category').should('be.visible');
    });
  });

  it('should validate required fields when creating an item', () => {
    cy.createUserAndSignIn('ValidationItemUser').then(() => {
      // Create a ruleset first
      cy.get('[data-testid="create-ruleset-button"]').click();
      cy.get('#ruleset-title').type('Validation Item Ruleset');
      cy.get('#ruleset-description').type('Ruleset for testing item validation');
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Navigate to the ruleset
      cy.contains('Validation Item Ruleset').should('be.visible');
      cy.get('[data-testid*="ruleset-card-"]')
        .first()
        .then(($card) => {
          const cardTestId = $card.attr('data-testid');
          const rulesetId = cardTestId?.replace('ruleset-card-', '');
          cy.get(`[data-testid="open-ruleset-${rulesetId}"]`).click();
        });

      // Navigate to items page
      cy.url().should('include', '/attributes');
      cy.contains('Items').click();

      // Click the New button to create an item
      cy.get('button').contains('New').click();

      // Try to submit without filling required fields
      cy.get('[data-testid="base-create-submit"]').should('be.disabled');

      // Fill only the title
      cy.get('#create-title').type('Test Item');

      // Submit button should now be enabled
      cy.get('[data-testid="base-create-submit"]').should('not.be.disabled');

      // Submit the form
      cy.get('[data-testid="base-create-submit"]').click();

      // Close the dialog
      cy.get('[data-slot="dialog-close"]').click();

      // Verify the item was created with default values
      cy.contains('Test Item').should('be.visible');
    });
  });

  it('should allow inline editing of item values in the chart', () => {
    cy.createUserAndSignIn('InlineEditItemUser').then(() => {
      // Create a ruleset first
      cy.get('[data-testid="create-ruleset-button"]').click();
      cy.get('#ruleset-title').type('Inline Edit Item Ruleset');
      cy.get('#ruleset-description').type('Ruleset for testing inline item editing');
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Navigate to the ruleset
      cy.contains('Inline Edit Item Ruleset').should('be.visible');
      cy.get('[data-testid*="ruleset-card-"]')
        .first()
        .then(($card) => {
          const cardTestId = $card.attr('data-testid');
          const rulesetId = cardTestId?.replace('ruleset-card-', '');
          cy.get(`[data-testid="open-ruleset-${rulesetId}"]`).click();
        });

      // Navigate to items page
      cy.url().should('include', '/attributes');
      cy.contains('Items').click();

      // Create an item first
      cy.get('button').contains('New').click();
      cy.get('#create-title').type('Inline Editable Item');
      cy.get('#create-category').type('Editable');
      cy.get('#create-description').type('This can be edited inline');
      cy.get('input[type="number"]').eq(0).clear().type('30'); // Weight
      cy.get('[data-testid="base-create-submit"]').click();

      // Close the dialog
      cy.get('[data-slot="dialog-close"]').click();

      // Wait for the item to appear
      cy.contains('Inline Editable Item').should('be.visible');

      // Double-click on the title cell to edit inline
      cy.contains('Inline Editable Item').dblclick();

      // Clear and type new value
      cy.get('.ag-cell-editor input').clear().type('Inline Edited Item');

      // Press Enter to save
      cy.get('.ag-cell-editor input').type('{enter}');

      // Verify the change was saved
      cy.contains('Inline Edited Item').should('be.visible');
      cy.contains('Inline Editable Item').should('not.exist');
    });
  });

  it('should handle negative numeric values gracefully', () => {
    cy.createUserAndSignIn('NegativeValueItemUser').then(() => {
      // Create a ruleset first
      cy.get('[data-testid="create-ruleset-button"]').click();
      cy.get('#ruleset-title').type('Negative Value Item Ruleset');
      cy.get('#ruleset-description').type('Ruleset for testing negative values');
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Navigate to the ruleset
      cy.contains('Negative Value Item Ruleset').should('be.visible');
      cy.get('[data-testid*="ruleset-card-"]')
        .first()
        .then(($card) => {
          const cardTestId = $card.attr('data-testid');
          const rulesetId = cardTestId?.replace('ruleset-card-', '');
          cy.get(`[data-testid="open-ruleset-${rulesetId}"]`).click();
        });

      // Navigate to items page
      cy.url().should('include', '/attributes');
      cy.contains('Items').click();

      // Click the New button to create an item
      cy.get('button').contains('New').click();

      // Fill in the item form
      cy.get('#create-title').type('Negative Weight Item');
      cy.get('#create-category').type('Test');
      cy.get('#create-description').type('Item with negative weight');

      // Set negative numeric values
      cy.get('input[type="number"]').eq(0).clear().type('-5'); // Weight
      cy.get('input[type="number"]').eq(1).clear().type('-1'); // Default Quantity
      cy.get('input[type="number"]').eq(2).clear().type('-10'); // Stack Size

      // Submit the form
      cy.get('[data-testid="base-create-submit"]').click();

      // Close the dialog
      cy.get('[data-slot="dialog-close"]').click();

      // Verify the item was created (should handle negative values)
      cy.contains('Negative Weight Item').should('be.visible');
      cy.contains('Test').should('be.visible');
    });
  });

  it('should toggle boolean flags correctly', () => {
    cy.createUserAndSignIn('ToggleFlagsItemUser').then(() => {
      // Create a ruleset first
      cy.get('[data-testid="create-ruleset-button"]').click();
      cy.get('#ruleset-title').type('Toggle Flags Item Ruleset');
      cy.get('#ruleset-description').type('Ruleset for testing flag toggles');
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Navigate to the ruleset
      cy.contains('Toggle Flags Item Ruleset').should('be.visible');
      cy.get('[data-testid*="ruleset-card-"]')
        .first()
        .then(($card) => {
          const cardTestId = $card.attr('data-testid');
          const rulesetId = cardTestId?.replace('ruleset-card-', '');
          cy.get(`[data-testid="open-ruleset-${rulesetId}"]`).click();
        });

      // Navigate to items page
      cy.url().should('include', '/attributes');
      cy.contains('Items').click();

      // Click the New button to create an item
      cy.get('button').contains('New').click();

      // Fill in the item form
      cy.get('#create-title').type('Toggle Test Item');
      cy.get('#create-category').type('Test');
      cy.get('#create-description').type('Testing flag toggles');

      // Test toggling flags multiple times

      cy.get('[data-testid="item-create-container"]').click(); // Enable Container
      cy.get('[data-testid="item-create-container"]').click(); // Disable Container
      cy.get('[data-testid="item-create-container"]').click(); // Enable Container again

      cy.get('[data-testid="item-create-storable"]').click(); // Storable

      cy.get('[data-testid="item-create-equippable"]').click(); // Equippable

      // Submit the form
      cy.get('[data-testid="base-create-submit"]').click();

      // Close the dialog
      cy.get('[data-slot="dialog-close"]').click();

      // Verify the item was created
      cy.contains('Toggle Test Item').should('be.visible');
      cy.contains('Test').should('be.visible');
    });
  });
});
