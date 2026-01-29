/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })

// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })

// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })

// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

/**
 * Creates a new user and signs them in
 * @param username - Optional username. If not provided, generates a unique username
 * @returns Chainable with the created username
 */
Cypress.Commands.add('createUserAndSignIn', (username?: string) => {
  const finalUsername = username || `TestUser_${Date.now()}`;

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

  // Enter the username
  cy.get('[data-testid="username-input"]').type(finalUsername);

  // Click submit button to create the user
  cy.get('[data-testid="submit-button"]').click();

  // Wait for the user creation to complete and navigation to home page
  cy.get('h1', { timeout: 10000 }).should('contain', 'Rulesets');

  // Verify we're now on the home page
  cy.get('h1').should('contain', 'Rulesets');

  // Verify the user was created by checking if we can see the home page content
  cy.get('[data-testid="create-ruleset-button"]').should('be.visible');

  // Verify the username is stored in localStorage
  cy.window().then((win) => {
    const lastLoggedInUsername = win.localStorage.getItem('qb.lastLoggedInUsername');
    expect(lastLoggedInUsername).to.equal(finalUsername);
  });

  // Return the username for potential use in the test
  return cy.wrap(finalUsername);
});

/**
 * Signs in with an existing user
 * @param username - The username of the existing user to sign in with
 * @returns Chainable
 */
Cypress.Commands.add('signInWithExistingUser', (username: string) => {
  // Visit the home page
  cy.visit('/');

  // Should be on sign-in page since no user is logged in
  cy.url().should('include', '/');

  // Select the existing user from the dropdown
  cy.get('[data-testid="user-select"]').click();
  cy.contains(username).click();
  cy.get('[data-testid="submit-button"]').click();

  // Should navigate to home page
  cy.get('h1', { timeout: 10000 }).should('contain', 'Rulesets');

  return cy.wrap(username);
});

/**
 * Signs out the current user
 * @returns Chainable
 */
Cypress.Commands.add('signOut', () => {
  cy.get('[data-testid="user-menu"]').click();
  cy.get('[data-testid="sign-out"]').click();

  // Should be back on sign-in page
  cy.url().should('include', '/');

  return cy.wrap(null);
});

/**
 * Clears all user data (localStorage and IndexedDB)
 * @returns Chainable
 */
Cypress.Commands.add('clearUserData', () => {
  cy.clearLocalStorage();
  cy.window().then((win) => {
    // Clear IndexedDB
    win.indexedDB.deleteDatabase('qbdb');
  });

  return cy.wrap(null);
});

Cypress.Commands.add('setupTest', () => {
  localStorage.setItem('qb.sidebarCollapsed', 'false');
  return cy.wrap(null);
});

Cypress.Commands.add('setupRuleset', (title?: string, description?: string) => {
  cy.get('[data-testid="create-ruleset-button"]').click();
  cy.get('#ruleset-title').type(title ?? 'Ruleset');
  cy.get('#ruleset-description').type(description ?? 'Ruleset for testing window filtering');
  cy.get('[data-testid="create-ruleset-submit"]').click();

  return cy.wrap(null);
});

declare global {
  namespace Cypress {
    interface Chainable {
      createUserAndSignIn(username?: string): Chainable<string>;
      signInWithExistingUser(username: string): Chainable<string>;
      setupRuleset(title?: string, description?: string): Chainable<null>;
      signOut(): Chainable<null>;
      clearUserData(): Chainable<null>;
      setupTest(): Chainable<null>;
    }
  }
}
