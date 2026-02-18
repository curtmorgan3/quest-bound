describe('Window Management', () => {
  beforeEach(() => {
    cy.setupTest();
  });

  afterEach(() => {
    cy.clearUserData();
  });

  it('should create a basic window', () => {
    cy.createUserAndSignIn('WindowTestUser').then(() => {
      // Create a ruleset first
      cy.get('[data-testid="create-ruleset-button"]').click();
      cy.get('#ruleset-title').type('Test Ruleset for Windows');
      cy.get('#ruleset-description').type('Ruleset for testing window management');
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Wait for ruleset to be created and navigate to it
      cy.contains('Test Ruleset for Windows').should('be.visible');
      cy.contains('button', 'Open').first().click();

      // Navigate to windows page
      cy.get('[data-testid="nav-windows"]').click();
      cy.url().should('include', '/windows');

      // Click the New button to create a window
      cy.get('button').contains('New').click();

      // Fill in the window form
      cy.get('#create-title').type('Character Sheet');
      cy.get('#create-category').type('Core');

      // Submit the form
      cy.get('[data-testid="base-create-submit"]').click();
      cy.get('[data-slot="dialog-close"]').click();

      // Verify the window was created and appears in the list
      cy.contains('Character Sheet').should('be.visible');
      cy.contains('Core').should('be.visible');
    });
  });

  it('should create a window with different category', () => {
    cy.createUserAndSignIn('WindowCategoryUser').then(() => {
      // Create a ruleset first
      cy.get('[data-testid="create-ruleset-button"]').click();
      cy.get('#ruleset-title').type('Window Category Ruleset');
      cy.get('#ruleset-description').type('Ruleset for testing window categories');
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Navigate to the ruleset
      cy.contains('Window Category Ruleset').should('be.visible');
      cy.contains('button', 'Open').first().click();

      // Navigate to windows page
      cy.get('[data-testid="nav-windows"]').click();
      cy.url().should('include', '/windows');

      // Click the New button to create a window
      cy.get('button').contains('New').click();

      // Fill in the window form
      cy.get('#create-title').type('Inventory Panel');
      cy.get('#create-category').type('Equipment');

      // Submit the form
      cy.get('[data-testid="base-create-submit"]').click();
      cy.get('[data-slot="dialog-close"]').click();

      // Verify the window was created
      cy.contains('Inventory Panel').should('be.visible');
      cy.contains('Equipment').should('be.visible');
    });
  });

  it('should create multiple windows', () => {
    cy.createUserAndSignIn('MultipleWindowsUser').then(() => {
      // Create a ruleset first
      cy.get('[data-testid="create-ruleset-button"]').click();
      cy.get('#ruleset-title').type('Multiple Windows Ruleset');
      cy.get('#ruleset-description').type('Ruleset for testing multiple windows');
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Navigate to the ruleset
      cy.contains('Multiple Windows Ruleset').should('be.visible');
      cy.contains('button', 'Open').first().click();

      // Navigate to windows page
      cy.get('[data-testid="nav-windows"]').click();
      cy.url().should('include', '/windows');

      // Create first window
      cy.get('button').contains('New').click();
      cy.get('#create-title').type('Stats Window');
      cy.get('#create-category').type('Core');
      cy.get('[data-testid="base-create-submit"]').click();
      cy.get('[data-slot="dialog-close"]').click();

      // Create second window
      cy.get('button').contains('New').click();
      cy.get('#create-title').type('Skills Window');
      cy.get('#create-category').type('Core');
      cy.get('[data-testid="base-create-submit"]').click();
      cy.get('[data-slot="dialog-close"]').click();

      // Create third window with different category
      cy.get('button').contains('New').click();
      cy.get('#create-title').type('Combat Tracker');
      cy.get('#create-category').type('Combat');
      cy.get('[data-testid="base-create-submit"]').click();
      cy.get('[data-slot="dialog-close"]').click();

      // Verify all windows were created
      cy.contains('Stats Window').should('be.visible');
      cy.contains('Skills Window').should('be.visible');
      cy.contains('Combat Tracker').should('be.visible');
    });
  });

  it('should edit window title inline', () => {
    cy.createUserAndSignIn('EditWindowTitleUser').then(() => {
      // Create a ruleset first
      cy.get('[data-testid="create-ruleset-button"]').click();
      cy.get('#ruleset-title').type('Edit Window Title Ruleset');
      cy.get('#ruleset-description').type('Ruleset for testing window title editing');
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Navigate to the ruleset
      cy.contains('Edit Window Title Ruleset').should('be.visible');
      cy.get('button').contains('Open').click();

      // Navigate to windows page
      cy.get('[data-testid="nav-windows"]').click();
      cy.url().should('include', '/windows');

      // Create a window first
      cy.get('button').contains('New').click();
      cy.get('#create-title').type('Original Window');
      cy.get('#create-category').type('Test');
      cy.get('[data-testid="base-create-submit"]').click();
      cy.get('[data-slot="dialog-close"]').click();

      // Click on the title to edit it inline
      cy.get('[data-testid="preview-card-title"]').first().click();

      // Wait for input to be enabled and type new value
      cy.get('[data-testid="preview-card-title-input"]').first().should('not.be.disabled').clear().type('Updated Window{enter}');

      // Verify the change was saved
      cy.get('[data-testid="preview-card-title"]').first().should('contain', 'Updated Window');
    });
  });

  it('should edit window category inline', () => {
    cy.createUserAndSignIn('EditWindowCategoryUser').then(() => {
      // Create a ruleset first
      cy.get('[data-testid="create-ruleset-button"]').click();
      cy.get('#ruleset-title').type('Edit Window Category Ruleset');
      cy.get('#ruleset-description').type('Ruleset for testing window category editing');
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Navigate to the ruleset
      cy.contains('Edit Window Category Ruleset').should('be.visible');
      cy.contains('button', 'Open').first().click();

      // Navigate to windows page
      cy.get('[data-testid="nav-windows"]').click();
      cy.url().should('include', '/windows');

      // Create a window first
      cy.get('button').contains('New').click();
      cy.get('#create-title').type('Category Test Window');
      cy.get('#create-category').type('Original Category');
      cy.get('[data-testid="base-create-submit"]').click();
      cy.get('[data-slot="dialog-close"]').click();

      // Wait for the window to appear
      cy.contains('Category Test Window').should('be.visible');
      cy.contains('Original Category').should('be.visible');

      // Click on the category to edit it inline
      cy.contains('Original Category').click();

      // Clear and type new value
      cy.get('[data-testid="preview-card-description-input"]')
        .first()
        .clear()
        .type('Updated Category{enter}');

      // Verify the change was saved
      cy.contains('Updated Category').should('be.visible');
      cy.contains('Original Category').should('not.exist');
    });
  });

  it('should delete a window', () => {
    cy.createUserAndSignIn('DeleteWindowUser').then(() => {
      // Create a ruleset first
      cy.get('[data-testid="create-ruleset-button"]').click();
      cy.get('#ruleset-title').type('Delete Window Ruleset');
      cy.get('#ruleset-description').type('Ruleset for testing window deletion');
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Navigate to the ruleset
      cy.contains('Delete Window Ruleset').should('be.visible');
      cy.contains('button', 'Open').first().click();

      // Navigate to windows page
      cy.get('[data-testid="nav-windows"]').click();
      cy.url().should('include', '/windows');

      // Create a window first
      cy.get('button').contains('New').click();
      cy.get('#create-title').type('Window To Delete');
      cy.get('#create-category').type('Temporary');
      cy.get('[data-testid="base-create-submit"]').click();
      cy.get('[data-slot="dialog-close"]').click();

      // Click the Delete button on the card
      cy.get('[data-testid="preview-card-delete"]').first().click();
      
      // Confirm deletion in the alert dialog
      cy.get('[data-testid="preview-card-delete-confirm"]').click();

      // Verify the window was deleted
      cy.get('body').should('not.contain', 'Window To Delete');
    });
  });

  it('should open a window editor', () => {
    cy.createUserAndSignIn('OpenWindowUser').then(() => {
      // Create a ruleset first
      cy.get('[data-testid="create-ruleset-button"]').click();
      cy.get('#ruleset-title').type('Open Window Ruleset');
      cy.get('#ruleset-description').type('Ruleset for testing window opening');
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Navigate to the ruleset
      cy.contains('Open Window Ruleset').should('be.visible');
      cy.contains('button', 'Open').first().click();

      // Navigate to windows page
      cy.get('[data-testid="nav-windows"]').click();
      cy.url().should('include', '/windows');

      // Create a window first
      cy.get('button').contains('New').click();
      cy.get('#create-title').type('Window To Open');
      cy.get('#create-category').type('Test');
      cy.get('[data-testid="base-create-submit"]').click();
      cy.get('[data-slot="dialog-close"]').click();

      // Wait for the window to appear
      cy.contains('Window To Open').should('be.visible');

      // Click the Open button on the card
      cy.get('button').contains('Open').click();

      // Verify we navigated to the window editor page
      cy.url().should('include', '/windows/');
    });
  });

  it('should filter windows by title', () => {
    cy.createUserAndSignIn('FilterWindowTitleUser').then(() => {
      cy.setupRuleset('Filter Window Title Ruleset', 'Ruleset for testing window filtering');

      // Navigate to the ruleset
      cy.contains('Filter Window Title Ruleset').should('be.visible');
      cy.get('button').contains('Open').click();

      // Navigate to windows page
      cy.get('[data-testid="nav-windows"]').click();
      cy.url().should('include', '/windows');

      // Create multiple windows
      cy.get('button').contains('New').click();
      cy.get('#create-title').type('Inventory Panel');
      cy.get('#create-category').type('Equipment');
      cy.get('[data-testid="base-create-submit"]').click();

      cy.get('#create-title').type('Character Sheet');
      cy.get('#create-category').type('Core');
      cy.get('[data-testid="base-create-submit"]').click();

      cy.get('[data-slot="dialog-close"]').click();

      // Filter by title
      cy.get('[data-testid="preview-filter"]').type('Character');

      // Verify only matching window is visible
      cy.get('[data-testid="preview-card-title"]').first().should('contain', 'Character');
    });
  });

  it('should filter windows by category', () => {
    cy.createUserAndSignIn('FilterWindowCategoryUser').then(() => {
      // Create a ruleset first
      cy.get('[data-testid="create-ruleset-button"]').click();
      cy.get('#ruleset-title').type('Filter Window Category Ruleset');
      cy.get('#ruleset-description').type('Ruleset for testing window category filtering');
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Navigate to the ruleset
      cy.contains('Filter Window Category Ruleset').should('be.visible');
      cy.contains('button', 'Open').first().click();

      // Navigate to windows page
      cy.get('[data-testid="nav-windows"]').click();
      cy.url().should('include', '/windows');

      // Create multiple windows with different categories
      cy.get('button').contains('New').click();
      cy.get('#create-title').type('Stats Window');
      cy.get('#create-category').type('Core');
      cy.get('[data-testid="base-create-submit"]').click();
      cy.get('[data-slot="dialog-close"]').click();

      cy.get('button').contains('New').click();
      cy.get('#create-title').type('Combat Tracker');
      cy.get('#create-category').type('Combat');
      cy.get('[data-testid="base-create-submit"]').click();
      cy.get('[data-slot="dialog-close"]').click();

      // Wait for both windows to appear
      cy.contains('Stats Window').should('be.visible');
      cy.contains('Combat Tracker').should('be.visible');

      // Filter by category
      cy.get('input').first().type('Combat');

      // Verify only matching window is visible
      cy.contains('Combat Tracker').should('be.visible');
      cy.contains('Stats Window').should('not.exist');

      // Clear filter
      cy.get('input[placeholder*="Filter"]').clear();

      // Both should be visible again
      cy.contains('Stats Window').should('be.visible');
      cy.contains('Combat Tracker').should('be.visible');
    });
  });

  it('should validate required fields when creating a window', () => {
    cy.createUserAndSignIn('ValidationWindowUser').then(() => {
      // Create a ruleset first
      cy.get('[data-testid="create-ruleset-button"]').click();
      cy.get('#ruleset-title').type('Validation Window Ruleset');
      cy.get('#ruleset-description').type('Ruleset for testing window validation');
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Navigate to the ruleset
      cy.contains('Validation Window Ruleset').should('be.visible');
      cy.contains('button', 'Open').first().click();

      // Navigate to windows page
      cy.get('[data-testid="nav-windows"]').click();
      cy.url().should('include', '/windows');

      // Click the New button to create a window
      cy.get('button').contains('New').click();

      // Try to submit without filling required fields
      cy.get('[data-testid="base-create-submit"]').should('be.disabled');

      // Fill only the title
      cy.get('#create-title').type('Test Window');

      // Submit button should now be enabled
      cy.get('[data-testid="base-create-submit"]').should('not.be.disabled');

      // Submit the form
      cy.get('[data-testid="base-create-submit"]').click();
      cy.get('[data-slot="dialog-close"]').click();

      // Verify the window was created with default values
      cy.contains('Test Window').should('be.visible');
    });
  });

  it('should create window without category', () => {
    cy.createUserAndSignIn('NoCategoryWindowUser').then(() => {
      // Create a ruleset first
      cy.get('[data-testid="create-ruleset-button"]').click();
      cy.get('#ruleset-title').type('No Category Window Ruleset');
      cy.get('#ruleset-description').type('Ruleset for testing window without category');
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Navigate to the ruleset
      cy.contains('No Category Window Ruleset').should('be.visible');
      cy.contains('button', 'Open').first().click();

      // Navigate to windows page
      cy.get('[data-testid="nav-windows"]').click();
      cy.url().should('include', '/windows');

      // Click the New button to create a window
      cy.get('button').contains('New').click();

      // Fill in only the title
      cy.get('#create-title').type('Window Without Category');

      // Submit the form
      cy.get('[data-testid="base-create-submit"]').click();
      cy.get('[data-slot="dialog-close"]').click();

      // Verify the window was created
      cy.contains('Window Without Category').should('be.visible');
      // Should show "Set category" placeholder
      cy.contains('Set category').should('be.visible');
    });
  });
});
