describe('Action Management', () => {
  beforeEach(() => {
    // Clear any existing data before each test
    cy.clearUserData();
  });

  it('should create a basic action', () => {
    cy.createUserAndSignIn('ActionTestUser').then(() => {
      // Create a ruleset first
      cy.get('[data-testid="create-ruleset-button"]').click();
      cy.get('#ruleset-title').type('Test Ruleset for Actions');
      cy.get('#ruleset-description').type('Ruleset for testing action management');
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Wait for ruleset to be created and navigate to it
      cy.contains('Test Ruleset for Actions').should('be.visible');
      cy.get('[data-testid*="ruleset-card-"]')
        .first()
        .then(($card) => {
          const cardTestId = $card.attr('data-testid');
          const rulesetId = cardTestId?.replace('ruleset-card-', '');
          cy.get(`[data-testid="open-ruleset-${rulesetId}"]`).click();
        });

      // Navigate to actions page
      cy.get('[data-testid="nav-actions"]').click();
      cy.url().should('include', '/actions');

      // Click the New button to create an action
      cy.get('button').contains('New').click();

      // Fill in the action form
      cy.get('#create-title').type('Attack');
      cy.get('#create-category').type('Combat');
      cy.get('#create-description').type('Basic attack action');

      // Submit the form
      cy.get('[data-testid="base-create-submit"]').click();
      cy.get('[data-slot="dialog-close"]').click(); // Close creation dialog if still open

      // Verify the action was created and appears in the chart
      cy.contains('Attack').should('be.visible');
      cy.contains('Combat').should('be.visible');
      cy.contains('Basic attack action').should('be.visible');
    });
  });

  it('should create an action with different category', () => {
    cy.createUserAndSignIn('ActionCategoryUser').then(() => {
      // Create a ruleset first
      cy.get('[data-testid="create-ruleset-button"]').click();
      cy.get('#ruleset-title').type('Action Category Ruleset');
      cy.get('#ruleset-description').type('Ruleset for testing action categories');
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Navigate to the ruleset
      cy.contains('Action Category Ruleset').should('be.visible');
      cy.get('[data-testid*="ruleset-card-"]')
        .first()
        .then(($card) => {
          const cardTestId = $card.attr('data-testid');
          const rulesetId = cardTestId?.replace('ruleset-card-', '');
          cy.get(`[data-testid="open-ruleset-${rulesetId}"]`).click();
        });

      // Navigate to actions page
      cy.get('[data-testid="nav-actions"]').click();
      cy.url().should('include', '/actions');

      // Click the New button to create an action
      cy.get('button').contains('New').click();

      // Fill in the action form
      cy.get('#create-title').type('Heal');
      cy.get('#create-category').type('Magic');
      cy.get('#create-description').type('Healing spell action');

      // Submit the form
      cy.get('[data-testid="base-create-submit"]').click();
      cy.get('[data-slot="dialog-close"]').click(); // Close creation dialog if still open

      // Verify the action was created
      cy.contains('Heal').should('be.visible');
      cy.contains('Magic').should('be.visible');
      cy.contains('Healing spell action').should('be.visible');
    });
  });

  it('should create an action with long description', () => {
    cy.createUserAndSignIn('LongDescriptionUser').then(() => {
      // Create a ruleset first
      cy.get('[data-testid="create-ruleset-button"]').click();
      cy.get('#ruleset-title').type('Long Description Ruleset');
      cy.get('#ruleset-description').type('Ruleset for testing long descriptions');
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Navigate to the ruleset
      cy.contains('Long Description Ruleset').should('be.visible');
      cy.get('[data-testid*="ruleset-card-"]')
        .first()
        .then(($card) => {
          const cardTestId = $card.attr('data-testid');
          const rulesetId = cardTestId?.replace('ruleset-card-', '');
          cy.get(`[data-testid="open-ruleset-${rulesetId}"]`).click();
        });

      // Navigate to actions page
      cy.get('[data-testid="nav-actions"]').click();
      cy.url().should('include', '/actions');

      // Click the New button to create an action
      cy.get('button').contains('New').click();

      // Fill in the action form
      cy.get('#create-title').type('Complex Action');
      cy.get('#create-category').type('Advanced');
      cy.get('#create-description').type(
        'This is a very long description that tests how the action management system handles longer text content. It should properly display and manage this extended description without any issues.',
      );

      // Submit the form
      cy.get('[data-testid="base-create-submit"]').click();
      cy.get('[data-slot="dialog-close"]').click(); // Close creation dialog if still open

      // Verify the action was created
      cy.contains('Complex Action').should('be.visible');
      cy.contains('Advanced').should('be.visible');
      cy.contains('This is a very long description').should('be.visible');
    });
  });

  it('should edit an existing action', () => {
    cy.createUserAndSignIn('EditActionUser').then(() => {
      // Create a ruleset first
      cy.get('[data-testid="create-ruleset-button"]').click();
      cy.get('#ruleset-title').type('Edit Action Ruleset');
      cy.get('#ruleset-description').type('Ruleset for testing action editing');
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Navigate to the ruleset
      cy.contains('Edit Action Ruleset').should('be.visible');
      cy.get('[data-testid*="ruleset-card-"]')
        .first()
        .then(($card) => {
          const cardTestId = $card.attr('data-testid');
          const rulesetId = cardTestId?.replace('ruleset-card-', '');
          cy.get(`[data-testid="open-ruleset-${rulesetId}"]`).click();
        });

      // Navigate to actions page
      cy.get('[data-testid="nav-actions"]').click();
      cy.url().should('include', '/actions');

      // Create an action first
      cy.get('button').contains('New').click();
      cy.get('#create-title').type('Original Action');
      cy.get('#create-category').type('Original Category');
      cy.get('#create-description').type('Original description');
      cy.get('[data-testid="base-create-submit"]').click();
      cy.get('[data-slot="dialog-close"]').click(); // Close creation dialog if still open

      // Wait for the action to appear
      cy.contains('Original Action').should('be.visible');

      // Find the edit button (pencil icon) for the action
      cy.get('[data-testid="chart-controls-edit"]').first().click();

      // Verify the edit form is populated with existing data
      cy.get('#create-title').should('have.value', 'Original Action');
      cy.get('#create-category').should('have.value', 'Original Category');
      cy.get('#create-description').should('have.value', 'Original description');

      // Modify the action
      cy.get('#create-title').clear().type('Updated Action');
      cy.get('#create-category').clear().type('Updated Category');
      cy.get('#create-description').clear().type('Updated description');

      // Submit the changes
      cy.get('[data-testid="base-create-submit"]').click();
      cy.get('[data-slot="dialog-close"]').click(); // Close creation dialog if still open

      // Verify the changes were saved
      cy.contains('Updated Action').should('be.visible');
      cy.contains('Updated Category').should('be.visible');
      cy.contains('Updated description').should('be.visible');

      // Verify old values are gone
      cy.contains('Original Action').should('not.exist');
      cy.contains('Original Category').should('not.exist');
    });
  });

  it('should delete an action with confirmation dialog', () => {
    cy.createUserAndSignIn('DeleteActionUser').then(() => {
      localStorage.setItem('qb.confirmOnDelete', 'true'); // Ensure confirmation is enabled
      // Create a ruleset first
      cy.get('[data-testid="create-ruleset-button"]').click();
      cy.get('#ruleset-title').type('Delete Action Ruleset');
      cy.get('#ruleset-description').type('Ruleset for testing action deletion');
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Navigate to the ruleset
      cy.contains('Delete Action Ruleset').should('be.visible');
      cy.get('[data-testid*="ruleset-card-"]')
        .first()
        .then(($card) => {
          const cardTestId = $card.attr('data-testid');
          const rulesetId = cardTestId?.replace('ruleset-card-', '');
          cy.get(`[data-testid="open-ruleset-${rulesetId}"]`).click();
        });

      // Navigate to actions page
      cy.get('[data-testid="nav-actions"]').click();
      cy.url().should('include', '/actions');

      // Create an action first
      cy.get('button').contains('New').click();
      cy.get('#create-title').type('Action To Delete');
      cy.get('#create-category').type('Test Category');
      cy.get('#create-description').type('This action will be deleted');
      cy.get('[data-testid="base-create-submit"]').click();
      cy.get('[data-slot="dialog-close"]').click(); // Close creation dialog if still open

      // Wait for the action to appear
      cy.contains('Action To Delete').should('be.visible');

      // Find the delete button (trash icon) for the action
      cy.get('[data-testid="chart-controls-delete"]').first().click();

      // Verify the confirmation dialog appears
      cy.contains('Permanently delete this content?').should('be.visible');
      cy.contains('Cancel').should('be.visible');

      // Click the Delete button to confirm
      cy.get('[data-testid="chart-controls-delete-confirm"]').click();

      // Verify the action was deleted
      cy.contains('Action To Delete').should('not.exist');
      cy.contains('Test Category').should('not.exist');
      cy.contains('This action will be deleted').should('not.exist');
    });
  });

  it('should cancel action deletion when clicking Cancel', () => {
    cy.createUserAndSignIn('CancelDeleteUser').then(() => {
      // Create a ruleset first
      cy.get('[data-testid="create-ruleset-button"]').click();
      cy.get('#ruleset-title').type('Cancel Delete Ruleset');
      cy.get('#ruleset-description').type('Ruleset for testing cancel deletion');
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Navigate to the ruleset
      cy.contains('Cancel Delete Ruleset').should('be.visible');
      cy.get('[data-testid*="ruleset-card-"]')
        .first()
        .then(($card) => {
          const cardTestId = $card.attr('data-testid');
          const rulesetId = cardTestId?.replace('ruleset-card-', '');
          cy.get(`[data-testid="open-ruleset-${rulesetId}"]`).click();
        });

      // Navigate to actions page
      cy.get('[data-testid="nav-actions"]').click();
      cy.url().should('include', '/actions');

      // Create an action first
      cy.get('button').contains('New').click();
      cy.get('#create-title').type('Action To Keep');
      cy.get('#create-category').type('Keep Category');
      cy.get('#create-description').type('This action should not be deleted');
      cy.get('[data-testid="base-create-submit"]').click();
      cy.get('[data-slot="dialog-close"]').click(); // Close creation dialog if still open

      // Wait for the action to appear
      cy.contains('Action To Keep').should('be.visible');

      // Find the delete button (trash icon) for the action
      cy.get('[data-testid="chart-controls-delete"]').first().click();

      // Verify the confirmation dialog appears
      cy.contains('Permanently delete this content?').should('be.visible');

      // Click the Cancel button
      cy.get('button').contains('Cancel').click();

      // Verify the action still exists
      cy.contains('Action To Keep').should('be.visible');
      cy.contains('Keep Category').should('be.visible');
      cy.contains('This action should not be deleted').should('be.visible');
    });
  });

  it('should validate required fields when creating an action', () => {
    cy.createUserAndSignIn('ValidationUser').then(() => {
      // Create a ruleset first
      cy.get('[data-testid="create-ruleset-button"]').click();
      cy.get('#ruleset-title').type('Validation Ruleset');
      cy.get('#ruleset-description').type('Ruleset for testing validation');
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Navigate to the ruleset
      cy.contains('Validation Ruleset').should('be.visible');
      cy.get('[data-testid*="ruleset-card-"]')
        .first()
        .then(($card) => {
          const cardTestId = $card.attr('data-testid');
          const rulesetId = cardTestId?.replace('ruleset-card-', '');
          cy.get(`[data-testid="open-ruleset-${rulesetId}"]`).click();
        });

      // Navigate to actions page
      cy.get('[data-testid="nav-actions"]').click();
      cy.url().should('include', '/actions');

      // Click the New button to create an action
      cy.get('button').contains('New').click();

      // Try to submit without filling required fields
      cy.get('[data-testid="base-create-submit"]').should('be.disabled');

      // Fill only the title
      cy.get('#create-title').type('Test Action');

      // Submit button should now be enabled
      cy.get('[data-testid="base-create-submit"]').should('not.be.disabled');

      // Submit the form
      cy.get('[data-testid="base-create-submit"]').click();
      cy.get('[data-slot="dialog-close"]').click(); // Close creation dialog if still open

      // Verify the action was created with default values
      cy.contains('Test Action').should('be.visible');
    });
  });

  it('should allow inline editing of action values in the chart', () => {
    cy.createUserAndSignIn('InlineEditUser').then(() => {
      // Create a ruleset first
      cy.get('[data-testid="create-ruleset-button"]').click();
      cy.get('#ruleset-title').type('Inline Edit Ruleset');
      cy.get('#ruleset-description').type('Ruleset for testing inline editing');
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Navigate to the ruleset
      cy.contains('Inline Edit Ruleset').should('be.visible');
      cy.get('[data-testid*="ruleset-card-"]')
        .first()
        .then(($card) => {
          const cardTestId = $card.attr('data-testid');
          const rulesetId = cardTestId?.replace('ruleset-card-', '');
          cy.get(`[data-testid="open-ruleset-${rulesetId}"]`).click();
        });

      // Navigate to actions page
      cy.get('[data-testid="nav-actions"]').click();
      cy.url().should('include', '/actions');
      // Create an action first
      cy.get('button').contains('New').click();
      cy.get('#create-title').type('Inline Editable');
      cy.get('#create-category').type('Editable');
      cy.get('#create-description').type('This can be edited inline');
      cy.get('[data-testid="base-create-submit"]').click();
      cy.get('[data-slot="dialog-close"]').click(); // Close creation dialog if still open

      // Wait for the action to appear
      cy.contains('Inline Editable').should('be.visible');

      // Double-click on the title cell to edit inline
      cy.contains('Inline Editable').dblclick();

      // Clear and type new value
      cy.get('.ag-cell-editor input').clear().type('Inline Edited Title');

      // Press Enter to save
      cy.get('.ag-cell-editor input').type('{enter}');

      // Verify the change was saved
      cy.contains('Inline Edited Title').should('be.visible');
      cy.contains('Inline Editable').should('not.exist');
    });
  });

  it('should handle multiple actions in the same category', () => {
    cy.createUserAndSignIn('MultipleActionsUser').then(() => {
      // Create a ruleset first
      cy.get('[data-testid="create-ruleset-button"]').click();
      cy.get('#ruleset-title').type('Multiple Actions Ruleset');
      cy.get('#ruleset-description').type('Ruleset for testing multiple actions');
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Navigate to the ruleset
      cy.contains('Multiple Actions Ruleset').should('be.visible');
      cy.get('[data-testid*="ruleset-card-"]')
        .first()
        .then(($card) => {
          const cardTestId = $card.attr('data-testid');
          const rulesetId = cardTestId?.replace('ruleset-card-', '');
          cy.get(`[data-testid="open-ruleset-${rulesetId}"]`).click();
        });

      // Navigate to actions page
      cy.get('[data-testid="nav-actions"]').click();
      cy.url().should('include', '/actions');

      // Create first action
      cy.get('button').contains('New').click();
      cy.get('#create-title').type('Attack');
      cy.get('#create-category').type('Combat');
      cy.get('#create-description').type('Basic attack');
      cy.get('[data-testid="base-create-submit"]').click();
      cy.get('[data-slot="dialog-close"]').click();

      // Create second action
      cy.get('button').contains('New').click();
      cy.get('#create-title').type('Defend');
      cy.get('#create-category').type('Combat');
      cy.get('#create-description').type('Defensive action');
      cy.get('[data-testid="base-create-submit"]').click();
      cy.get('[data-slot="dialog-close"]').click();

      // Create third action with different category
      cy.get('button').contains('New').click();
      cy.get('#create-title').type('Heal');
      cy.get('#create-category').type('Magic');
      cy.get('#create-description').type('Healing action');
      cy.get('[data-testid="base-create-submit"]').click();
      cy.get('[data-slot="dialog-close"]').click();

      // Verify all actions were created
      cy.contains('Attack').should('be.visible');
      cy.contains('Defend').should('be.visible');
      cy.contains('Heal').should('be.visible');
      cy.contains('Combat').should('be.visible');
      cy.contains('Magic').should('be.visible');
    });
  });
});
