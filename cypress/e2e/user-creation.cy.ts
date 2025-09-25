describe('User Creation Flow', () => {
  beforeEach(() => {
    // Clear any existing data before each test
    cy.clearLocalStorage();
    cy.window().then((win) => {
      // Clear IndexedDB
      win.indexedDB.deleteDatabase('qbdb');
    });
  });

  it('should navigate to home page and create a new user', () => {
    // Visit the home page
    cy.visit('/');

    // Should be on sign-in page since no user is logged in
    cy.url().should('include', '/');

    // Verify we're on the sign-in page by checking for the sign-in elements
    cy.get('[data-testid="user-select"]').should('be.visible');
    cy.get('[data-testid="user-select"]').click();

    // Select "New User" option
    cy.contains('New User').click();

    // Verify the username input field appears
    cy.get('[data-testid="username-input"]').should('be.visible');

    // Enter a new username
    const newUsername = `TestUser_${Date.now()}`;
    cy.get('[data-testid="username-input"]').type(newUsername);

    // Click submit button to create the user
    cy.get('[data-testid="submit-button"]').click();

    // Wait for the user creation to complete and navigation to home page
    // The app should redirect to home page after successful user creation
    cy.get('h1', { timeout: 10000 }).should('contain', 'Rulesets');

    // Verify we're now on the home page (should show "Rulesets" heading)
    cy.get('h1').should('contain', 'Rulesets');

    // Verify the user was created by checking if we can see the home page content
    cy.get('[data-testid="create-ruleset-button"]').should('be.visible');

    // Verify the username is stored in localStorage
    cy.window().then((win) => {
      const lastLoggedInUsername = win.localStorage.getItem('qb.lastLoggedInUsername');
      expect(lastLoggedInUsername).to.equal(newUsername);
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
    // First create a user
    cy.visit('/');
    cy.get('[data-testid="user-select"]').click();
    cy.contains('New User').click();

    const existingUsername = `ExistingUser_${Date.now()}`;
    cy.get('[data-testid="username-input"]').type(existingUsername);
    cy.get('[data-testid="submit-button"]').click();

    // Wait for navigation to home page
    cy.get('h1', { timeout: 10000 }).should('contain', 'Rulesets');

    // Sign out to test existing user selection
    cy.get('[data-testid="user-menu"]').click();
    cy.get('[data-testid="sign-out"]').click();

    // Should be back on sign-in page
    cy.url().should('include', '/');

    // Select the existing user from the dropdown
    cy.get('[data-testid="user-select"]').click();
    // Look for the user by their username in the dropdown
    cy.contains(existingUsername).click();
    cy.get('[data-testid="submit-button"]').click();

    // Should navigate back to home page
    cy.get('h1', { timeout: 10000 }).should('contain', 'Rulesets');
  });
});
