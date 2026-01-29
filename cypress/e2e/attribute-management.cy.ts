describe('Attribute Management', () => {
  beforeEach(() => {
    cy.setupTest();
  });

  afterEach(() => {
    cy.clearUserData();
  });

  it('should create a number attribute', () => {
    cy.createUserAndSignIn('AttributeTestUser').then(() => {
      // Create a ruleset first
      cy.get('[data-testid="create-ruleset-button"]').click();
      cy.get('#ruleset-title').type('Test Ruleset for Attributes');
      cy.get('#ruleset-description').type('Ruleset for testing attribute management');
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Wait for ruleset to be created and navigate to it
      cy.contains('Test Ruleset for Attributes').should('be.visible');
      cy.get('[data-testid*="ruleset-card-"]')
        .first()
        .then(($card) => {
          const cardTestId = $card.attr('data-testid');
          const rulesetId = cardTestId?.replace('ruleset-card-', '');
          cy.get(`[data-testid="open-ruleset-${rulesetId}"]`).click();
        });

      // Should be on attributes page by default
      cy.url().should('include', '/attributes');

      // Click the New button to create an attribute
      cy.get('button').contains('New').click();

      // Fill in the attribute form
      cy.get('#create-title').type('Strength');
      cy.get('#create-category').type('Physical');
      cy.get('#create-description').type('Physical strength attribute');

      // Select Number type (should be default)
      cy.get('[role="combobox"]').first().click();
      cy.get('[role="option"]').contains('Number').click();

      // Set default value
      cy.get('#create-default').type('10');

      // Submit the form
      cy.get('[data-testid="base-create-submit"]').click();
      cy.get('[data-slot="dialog-close"]').click(); // Close creation dialog if still open

      // Verify the attribute was created and appears in the chart
      cy.contains('Strength').should('be.visible');
      cy.contains('Number').should('be.visible');
      cy.contains('Physical').should('be.visible');
      cy.contains('10').should('be.visible');
    });
  });

  it('should create a text attribute', () => {
    cy.createUserAndSignIn('TextAttributeUser').then(() => {
      // Create a ruleset first
      cy.get('[data-testid="create-ruleset-button"]').click();
      cy.get('#ruleset-title').type('Text Attribute Ruleset');
      cy.get('#ruleset-description').type('Ruleset for testing text attributes');
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Navigate to the ruleset
      cy.contains('Text Attribute Ruleset').should('be.visible');
      cy.get('[data-testid*="ruleset-card-"]')
        .first()
        .then(($card) => {
          const cardTestId = $card.attr('data-testid');
          const rulesetId = cardTestId?.replace('ruleset-card-', '');
          cy.get(`[data-testid="open-ruleset-${rulesetId}"]`).click();
        });

      // Click the New button to create an attribute
      cy.get('button').contains('New').click();

      // Fill in the attribute form
      cy.get('#create-title').type('Character Name');
      cy.get('#create-category').type('Identity');
      cy.get('#create-description').type("The character's name");

      // Select Text type
      cy.get('[role="combobox"]').first().click();
      cy.get('[role="option"]').contains('Text').click();

      // Set default value
      cy.get('#create-default').type('Unknown');

      // Submit the form
      cy.get('[data-testid="base-create-submit"]').click();
      cy.get('[data-slot="dialog-close"]').click(); // Close creation dialog if still open

      // Verify the attribute was created
      cy.contains('Character Name').should('be.visible');
      cy.contains('Text').should('be.visible');
      cy.contains('Identity').should('be.visible');
      cy.contains('Unknown').should('be.visible');
    });
  });

  it('should create a boolean attribute', () => {
    cy.createUserAndSignIn('BooleanAttributeUser').then(() => {
      // Create a ruleset first
      cy.get('[data-testid="create-ruleset-button"]').click();
      cy.get('#ruleset-title').type('Boolean Attribute Ruleset');
      cy.get('#ruleset-description').type('Ruleset for testing boolean attributes');
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Navigate to the ruleset
      cy.contains('Boolean Attribute Ruleset').should('be.visible');
      cy.get('[data-testid*="ruleset-card-"]')
        .first()
        .then(($card) => {
          const cardTestId = $card.attr('data-testid');
          const rulesetId = cardTestId?.replace('ruleset-card-', '');
          cy.get(`[data-testid="open-ruleset-${rulesetId}"]`).click();
        });

      // Click the New button to create an attribute
      cy.get('button').contains('New').click();

      // Fill in the attribute form
      cy.get('#create-title').type('Is Alive');
      cy.get('#create-category').type('Status');
      cy.get('#create-description').type('Whether the character is alive');

      // Select Boolean type
      cy.get('[role="combobox"]').first().click();
      cy.get('[role="option"]').contains('Boolean').click();

      // Check the default value checkbox (should be false by default)
      cy.get('[role="checkbox"]').should('not.be.checked');

      // Submit the form
      cy.get('[data-testid="base-create-submit"]').click();
      cy.get('[data-slot="dialog-close"]').click(); // Close creation dialog if still open

      // Verify the attribute was created
      cy.contains('Is Alive').should('be.visible');
      cy.contains('Boolean').should('be.visible');
      cy.contains('Status').should('be.visible');
    });
  });

  it('should create an enum attribute with multiple options', () => {
    cy.createUserAndSignIn('EnumAttributeUser').then(() => {
      // Create a ruleset first
      cy.get('[data-testid="create-ruleset-button"]').click();
      cy.get('#ruleset-title').type('Enum Attribute Ruleset');
      cy.get('#ruleset-description').type('Ruleset for testing enum attributes');
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Navigate to the ruleset
      cy.contains('Enum Attribute Ruleset').should('be.visible');
      cy.get('[data-testid*="ruleset-card-"]')
        .first()
        .then(($card) => {
          const cardTestId = $card.attr('data-testid');
          const rulesetId = cardTestId?.replace('ruleset-card-', '');
          cy.get(`[data-testid="open-ruleset-${rulesetId}"]`).click();
        });

      // Click the New button to create an attribute
      cy.get('button').contains('New').click();

      // Fill in the attribute form
      cy.get('#create-title').type('Character Class');
      cy.get('#create-category').type('Character');
      cy.get('#create-description').type("The character's class");

      // Select List type
      cy.get('[role="combobox"]').first().click();
      cy.get('[role="option"]').contains('List').click();

      // Add list options
      cy.get('#create-list-options').type('Warrior');
      cy.get('[data-testid="add-list-option-button"]').click();

      cy.get('#create-list-options').type('Mage');
      cy.get('[data-testid="add-list-option-button"]').click();

      cy.get('#create-list-options').type('Rogue');
      cy.get('[data-testid="add-list-option-button"]').click();

      // Set default value from the list
      cy.get('[role="combobox"]').eq(1).click();
      cy.get('[role="option"]').contains('Warrior').click();

      // Submit the form
      cy.get('[data-testid="base-create-submit"]').click();
      cy.get('[data-slot="dialog-close"]').click(); // Close creation dialog if still open

      // Verify the attribute was created
      cy.contains('Character Class').should('be.visible');
      cy.contains('List').should('be.visible');
      cy.contains('Character').should('be.visible');
      cy.contains('Warrior').should('be.visible');
    });
  });

  it('should edit an existing attribute', () => {
    cy.createUserAndSignIn('EditAttributeUser').then(() => {
      // Create a ruleset first
      cy.get('[data-testid="create-ruleset-button"]').click();
      cy.get('#ruleset-title').type('Edit Attribute Ruleset');
      cy.get('#ruleset-description').type('Ruleset for testing attribute editing');
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Navigate to the ruleset
      cy.contains('Edit Attribute Ruleset').should('be.visible');
      cy.get('[data-testid*="ruleset-card-"]')
        .first()
        .then(($card) => {
          const cardTestId = $card.attr('data-testid');
          const rulesetId = cardTestId?.replace('ruleset-card-', '');
          cy.get(`[data-testid="open-ruleset-${rulesetId}"]`).click();
        });

      // Create an attribute first
      cy.get('button').contains('New').click();
      cy.get('#create-title').type('Original Title');
      cy.get('#create-category').type('Original Category');
      cy.get('#create-description').type('Original description');
      cy.get('#create-default').type('5');
      cy.get('[data-testid="base-create-submit"]').click();
      cy.get('[data-slot="dialog-close"]').click(); // Close creation dialog if still open

      // Wait for the attribute to appear
      cy.contains('Original Title').should('be.visible');

      // Find the edit button (pencil icon) for the attribute
      cy.get('[data-testid="chart-controls-edit"]').first().click();

      // Verify the edit form is populated with existing data
      cy.get('#create-title').should('have.value', 'Original Title');
      cy.get('#create-category').should('have.value', 'Original Category');
      cy.get('#create-description').should('have.value', 'Original description');
      cy.get('#create-default').should('have.value', '5');

      // Modify the attribute
      cy.get('#create-title').clear().type('Updated Title');
      cy.get('#create-category').clear().type('Updated Category');
      cy.get('#create-description').clear().type('Updated description');
      cy.get('#create-default').clear().type('15');

      // Submit the changes
      cy.get('[data-testid="base-create-submit"]').click();
      cy.get('[data-slot="dialog-close"]').click(); // Close creation dialog if still open

      // Verify the changes were saved
      cy.contains('Updated Title').should('be.visible');
      cy.contains('Updated Category').should('be.visible');
      cy.contains('Updated description').should('be.visible');
      cy.contains('15').should('be.visible');

      // Verify old values are gone
      cy.contains('Original Title').should('not.exist');
      cy.contains('Original Category').should('not.exist');
    });
  });

  it('should delete an attribute with confirmation dialog', () => {
    cy.createUserAndSignIn('DeleteAttributeUser').then(() => {
      localStorage.setItem('qb.confirmOnDelete', 'true'); // Ensure confirmation is enabled
      // Create a ruleset first
      cy.get('[data-testid="create-ruleset-button"]').click();
      cy.get('#ruleset-title').type('Delete Attribute Ruleset');
      cy.get('#ruleset-description').type('Ruleset for testing attribute deletion');
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Navigate to the ruleset
      cy.contains('Delete Attribute Ruleset').should('be.visible');
      cy.get('[data-testid*="ruleset-card-"]')
        .first()
        .then(($card) => {
          const cardTestId = $card.attr('data-testid');
          const rulesetId = cardTestId?.replace('ruleset-card-', '');
          cy.get(`[data-testid="open-ruleset-${rulesetId}"]`).click();
        });

      // Create an attribute first
      cy.get('button').contains('New').click();
      cy.get('#create-title').type('Attribute To Delete');
      cy.get('#create-category').type('Test Category');
      cy.get('#create-description').type('This attribute will be deleted');
      cy.get('#create-default').type('100');
      cy.get('[data-testid="base-create-submit"]').click();
      cy.get('[data-slot="dialog-close"]').click(); // Close creation dialog if still open

      // Wait for the attribute to appear
      cy.contains('Attribute To Delete').should('be.visible');

      // Find the delete button (trash icon) for the attribute
      cy.get('[data-testid="chart-controls-delete"]').first().click();

      // Verify the confirmation dialog appears
      cy.contains('Permanently delete this content?').should('be.visible');
      cy.contains('Cancel').should('be.visible');

      // Click the Delete button to confirm
      cy.get('[data-testid="chart-controls-delete-confirm"]').click();

      // Verify the attribute was deleted
      cy.contains('Attribute To Delete').should('not.exist');
      cy.contains('Test Category').should('not.exist');
      cy.contains('This attribute will be deleted').should('not.exist');
      cy.contains('100').should('not.exist');
    });
  });

  it('should cancel attribute deletion when clicking Cancel', () => {
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

      // Create an attribute first
      cy.get('button').contains('New').click();
      cy.get('#create-title').type('Attribute To Keep');
      cy.get('#create-category').type('Keep Category');
      cy.get('#create-description').type('This attribute should not be deleted');
      cy.get('#create-default').type('200');
      cy.get('[data-testid="base-create-submit"]').click();
      cy.get('[data-slot="dialog-close"]').click(); // Close creation dialog if still open

      // Wait for the attribute to appear
      cy.contains('Attribute To Keep').should('be.visible');

      // Find the delete button (trash icon) for the attribute
      cy.get('[data-testid="chart-controls-delete"]').first().click();

      // Verify the confirmation dialog appears
      cy.contains('Permanently delete this content?').should('be.visible');

      // Click the Cancel button
      cy.get('button').contains('Cancel').click();

      // Verify the attribute still exists
      cy.contains('Attribute To Keep').should('be.visible');
      cy.contains('Keep Category').should('be.visible');
      cy.contains('This attribute should not be deleted').should('be.visible');
      cy.contains('200').should('be.visible');
    });
  });

  it('should validate required fields when creating an attribute', () => {
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

      // Click the New button to create an attribute
      cy.get('button').contains('New').click();

      // Try to submit without filling required fields
      cy.get('[data-testid="base-create-submit"]').should('be.disabled');

      // Fill only the title
      cy.get('#create-title').type('Test Attribute');

      // Submit button should now be enabled
      cy.get('[data-testid="base-create-submit"]').should('not.be.disabled');

      // Submit the form
      cy.get('[data-testid="base-create-submit"]').click();
      cy.get('[data-slot="dialog-close"]').click(); // Close creation dialog if still open

      // Verify the attribute was created with default values
      cy.contains('Test Attribute').should('be.visible');
    });
  });

  it('should handle enum attribute with no options gracefully', () => {
    cy.createUserAndSignIn('EmptyEnumUser').then(() => {
      // Create a ruleset first
      cy.get('[data-testid="create-ruleset-button"]').click();
      cy.get('#ruleset-title').type('Empty Enum Ruleset');
      cy.get('#ruleset-description').type('Ruleset for testing empty enum');
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Navigate to the ruleset
      cy.contains('Empty Enum Ruleset').should('be.visible');
      cy.get('[data-testid*="ruleset-card-"]')
        .first()
        .then(($card) => {
          const cardTestId = $card.attr('data-testid');
          const rulesetId = cardTestId?.replace('ruleset-card-', '');
          cy.get(`[data-testid="open-ruleset-${rulesetId}"]`).click();
        });

      // Click the New button to create an attribute
      cy.get('button').contains('New').click();

      // Fill in the attribute form
      cy.get('#create-title').type('Empty Enum Attribute');
      cy.get('#create-category').type('Test');
      cy.get('#create-description').type('Enum with no options');

      // Select List type
      cy.get('[role="combobox"]').first().click();
      cy.get('[role="option"]').contains('List').click();

      // Don't add any options, just submit
      cy.get('[data-testid="base-create-submit"]').click();
      cy.get('[data-slot="dialog-close"]').click(); // Close creation dialog if still open

      // Verify the attribute was created
      cy.contains('Empty Enum Attribute').should('be.visible');
      cy.contains('List').should('be.visible');
    });
  });

  it('should allow inline editing of attribute values in the chart', () => {
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

      // Create an attribute first
      cy.get('button').contains('New').click();
      cy.get('#create-title').type('Inline Editable');
      cy.get('#create-category').type('Editable');
      cy.get('#create-description').type('This can be edited inline');
      cy.get('#create-default').type('50');
      cy.get('[data-testid="base-create-submit"]').click();
      cy.get('[data-slot="dialog-close"]').click(); // Close creation dialog if still open

      // Wait for the attribute to appear
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
});
