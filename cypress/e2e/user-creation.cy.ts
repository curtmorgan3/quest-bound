describe('User Creation Flow', () => {
  beforeEach(() => {
    // Clear any existing data before each test
    cy.clearUserData();
  });

  it('should navigate to home page and create a new user', () => {
    // Use the reusable function to create a user and sign in
    cy.createUserAndSignIn().then((username) => {
      // Additional verification that the user was created successfully
      cy.log(`Created user: ${username}`);

      // Verify we can see the home page content
      cy.get('[data-testid="create-ruleset-button"]').should('be.visible');
    });
  });

  it('should handle user creation with empty username gracefully', () => {
    // Visit the home page
    cy.visit('/');

    // Select "New User" option
    cy.get('[data-testid="user-select"]').click();
    cy.contains('New User').click();

    // Leave username field empty
    cy.get('[data-testid="username-input"]').should('be.visible');

    // Try to submit with empty username - button should be disabled
    cy.get('[data-testid="submit-button"]').should('be.disabled');

    // Verify we're still on the sign-in page
    cy.url().should('include', '/');
    cy.get('h1').should('not.exist'); // No Rulesets heading on sign-in page
  });

  it('should allow selecting existing user and navigate to home page', () => {
    // First create a user using the reusable function
    cy.createUserAndSignIn().then((username) => {
      // Sign out to test existing user selection
      cy.signOut();

      // Sign in with the existing user
      cy.signInWithExistingUser(username);

      // Verify we're back on the home page
      cy.get('h1').should('contain', 'Rulesets');
      cy.get('[data-testid="create-ruleset-button"]').should('be.visible');
    });
  });

  it('should create multiple users and switch between them', () => {
    // Create first user
    cy.createUserAndSignIn('UserOne').then((username1) => {
      cy.log(`Created first user: ${username1}`);

      // Sign out
      cy.signOut();

      // Create second user
      cy.createUserAndSignIn('UserTwo').then((username2) => {
        cy.log(`Created second user: ${username2}`);

        // Sign out
        cy.signOut();

        // Sign in with first user
        cy.signInWithExistingUser(username1);
        cy.get('h1').should('contain', 'Rulesets');

        // Sign out and sign in with second user
        cy.signOut();
        cy.signInWithExistingUser(username2);
        cy.get('h1').should('contain', 'Rulesets');
      });
    });
  });
});
