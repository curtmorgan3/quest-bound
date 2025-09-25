describe('Ruleset Management', () => {
  beforeEach(() => {
    // Clear any existing data before each test
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
      cy.contains('Test Ruleset').should('be.visible');
      cy.contains('This is a test ruleset created by e2e test').should('be.visible');
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

      // Verify ruleset exists
      cy.contains('Persistent Ruleset').should('be.visible');

      // Sign out
      cy.signOut();

      // Sign back in with the same user
      cy.signInWithExistingUser(username);

      // Verify the ruleset still exists
      cy.contains('Persistent Ruleset').should('be.visible');
      cy.contains('This ruleset should persist after sign out').should('be.visible');
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
      cy.contains('Ruleset To Delete').should('be.visible');

      // Get the ruleset ID from the DOM to target the delete button
      cy.get('[data-testid*="ruleset-card-"]')
        .first()
        .then(($card) => {
          const cardTestId = $card.attr('data-testid');
          const rulesetId = cardTestId?.replace('ruleset-card-', '');

          // Click the delete button for this specific ruleset
          cy.get(`[data-testid="delete-ruleset-${rulesetId}"]`).click();

          // Verify the ruleset is no longer visible
          cy.contains('Ruleset To Delete').should('not.exist');
          cy.contains('This ruleset will be deleted').should('not.exist');

          // Verify the ruleset card is gone
          cy.get(`[data-testid="ruleset-card-${rulesetId}"]`).should('not.exist');
        });
    });
  });

  it.only('opens a ruleset', () => {
    // Create a user and ruleset
    cy.createUserAndSignIn('OpenTestUser').then(() => {
      // Create a ruleset to open
      cy.get('[data-testid="create-ruleset-button"]').click();
      cy.get('#ruleset-title').type('Ruleset To Open');
      cy.get('#ruleset-description').type('This ruleset will be opened');
      cy.get('[data-testid="create-ruleset-submit"]').click();

      // Wait for the ruleset to appear
      cy.contains('Ruleset To Open').should('be.visible');

      // Get the ruleset ID from the DOM to target the open button
      cy.get('[data-testid*="ruleset-card-"]')
        .first()
        .then(($card) => {
          const cardTestId = $card.attr('data-testid');
          const rulesetId = cardTestId?.replace('ruleset-card-', '');

          // Click the open button for this specific ruleset
          cy.get(`[data-testid="open-ruleset-${rulesetId}"]`).click();

          // Verify we navigated to the ruleset page
          cy.url().should('include', `/rulesets/${rulesetId}`);

          // The ruleset page should show the ruleset title
          cy.contains('Ruleset To Open').should('be.visible');
        });
    });
  });
});
