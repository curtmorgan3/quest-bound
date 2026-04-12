describe('Ruleset Management', () => {
  beforeEach(() => {
    cy.setupTest();
  });

  afterEach(() => {
    cy.clearUserData();
  });

  it('should create a new ruleset after user sign-in', () => {
    // Use the reusable function to create a user and sign in
    cy.createUserAndSignIn().then((username) => {
      cy.log(`Testing ruleset creation for user: ${username}`);

      // Verify we're on the home page
      cy.get('h1').should('contain', 'Rulesets');

      // Click the create ruleset button
      cy.get('[data-testid="create-ruleset-button"]').click();

      // Fill in the ruleset form
      cy.get('#ruleset-title').type('Test Ruleset');
      cy.get('#ruleset-description').type('This is a test ruleset created by e2e test');

      // Submit the form
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Verify the ruleset was created
      cy.get('[data-testid="preview-card-title"]').should('contain', 'Test Ruleset');
    });
  });

  it('should allow user to sign out and sign back in with existing rulesets', () => {
    // Create a user and ruleset
    cy.createUserAndSignIn('RulesetUser').then((username) => {
      // Create a ruleset
      cy.get('[data-testid="create-ruleset-button"]').click();
      cy.get('#ruleset-title').type('Persistent Ruleset');
      cy.get('#ruleset-description').type('This ruleset should persist after sign out');
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Wait for the ruleset to appear
      cy.get('[data-testid="preview-card-title"]').should('contain', 'Persistent Ruleset');

      // Sign out
      cy.signOut();

      // Sign back in with the same user
      cy.signInWithExistingUser(username);

      // Verify the ruleset still exists
      cy.get('[data-testid="preview-card-title"]').should('contain', 'Persistent Ruleset');
    });
  });

  it('deletes a ruleset and ensures it no longer appears in the list', () => {
    // Create a user and ruleset
    cy.createUserAndSignIn('DeleteTestUser').then(() => {
      // Create a ruleset to delete
      cy.get('[data-testid="create-ruleset-button"]').click();
      cy.get('#ruleset-title').type('Ruleset To Delete');
      cy.get('#ruleset-description').type('This ruleset will be deleted');
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Wait for the ruleset to appear
      cy.get('[data-testid="preview-card-title"]').should('contain', 'Ruleset To Delete');

      // Click the delete button
      cy.get('[data-testid="preview-card-delete"]').first().click();
      
      // Confirm deletion in the alert dialog
      cy.get('[data-testid="preview-card-delete-confirm"]').click();
      
      // Verify the ruleset is gone - check that the page shows no cards or the specific title is gone
      cy.get('body').should('not.contain', 'Ruleset To Delete');
    });
  });

  it('opens a ruleset', () => {
    // Create a user and ruleset
    cy.createUserAndSignIn('OpenTestUser').then(() => {
      // Create a ruleset to open
      cy.get('[data-testid="create-ruleset-button"]').click();
      cy.get('#ruleset-title').type('Ruleset To Open');
      cy.get('#ruleset-description').type('This ruleset will be opened');
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Wait for the ruleset to appear
      cy.get('[data-testid="preview-card-title"]').should('contain', 'Ruleset To Open');

      // Click the Open button
      cy.contains('button', 'Open').first().click();

      // Verify we navigated to the ruleset page
      cy.url().should('include', '/rulesets/');
    });
  });
});
