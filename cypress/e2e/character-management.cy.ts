describe('Character Management', () => {
  beforeEach(() => {
    cy.setupTest();
  });

  afterEach(() => {
    cy.clearUserData();
  });

  it('should create a new character', () => {
    cy.createUserAndSignIn().then((username) => {
      cy.log(`Testing character creation for user: ${username}`);

      // Create a ruleset first
      cy.setupRuleset('Test Ruleset', 'Ruleset for character testing');

      // Navigate to characters page
      cy.visit('/characters');
      cy.url().should('include', '/characters');
      
      // Wait for page to load and click create character button
      cy.get('[data-testid="create-character-button"]', { timeout: 10000 }).should('be.visible').click();

      // Fill in character name
      cy.get('#character-name').type('Test Character');

      // Submit the form
      cy.get('[data-testid="create-character-submit"]').click();

      // Verify character was created
      cy.get('[data-testid="preview-card-title"]', { timeout: 10000 }).should(
        'contain',
        'Test Character',
      );
    });
  });

  it('should persist character data after sign out/in', () => {
    cy.createUserAndSignIn('CharacterUser').then((username) => {
      // Create ruleset and character
      cy.setupRuleset('Persistent Ruleset');

      // Navigate to characters page
      cy.visit('/characters');
      cy.get('[data-testid="create-character-button"]', { timeout: 10000 }).should('be.visible').click();
      cy.get('#character-name').type('Persistent Character');
      cy.get('[data-testid="create-character-submit"]').click();

      // Wait for character to be created
      cy.get('[data-testid="preview-card-title"]', { timeout: 10000 }).should(
        'contain',
        'Persistent Character',
      );

      // Sign out
      cy.signOut();

      // Sign back in
      cy.signInWithExistingUser(username);

      // Navigate back to characters page
      cy.visit('/characters');

      // Verify character still exists
      cy.get('[data-testid="preview-card-title"]').should('contain', 'Persistent Character');
    });
  });

  it('should delete a character', () => {
    cy.createUserAndSignIn().then(() => {
      // Create ruleset and character
      cy.setupRuleset('Test Ruleset');

      // Navigate to characters page
      cy.visit('/characters');
      cy.get('[data-testid="create-character-button"]', { timeout: 10000 }).should('be.visible').click();
      cy.get('#character-name').type('Character To Delete');
      cy.get('[data-testid="create-character-submit"]').click();

      // Wait for character to be created
      cy.get('[data-testid="preview-card-title"]', { timeout: 10000 }).should(
        'contain',
        'Character To Delete',
      );

      // Delete the character
      cy.get('[data-testid="character-card"]').first().rightclick();
      cy.get('[data-testid="delete-character"]').click();

      // Confirm deletion
      cy.get('[data-testid="confirm-delete"]').click();

      // Verify character is removed
      cy.get('body').should('not.contain', 'Character To Delete');
    });
  });

  it('should switch between multiple characters', () => {
    cy.createUserAndSignIn().then(() => {
      // Create ruleset
      cy.setupRuleset('Multi Character Ruleset');

      // Navigate to characters page
      cy.visit('/characters');

      // Create first character
      cy.get('[data-testid="create-character-button"]').click();
      cy.get('#character-name').type('Character One');
      cy.get('[data-testid="create-character-submit"]').click();
      cy.get('[data-testid="preview-card-title"]', { timeout: 10000 }).should(
        'contain',
        'Character One',
      );

      // Create second character
      cy.get('[data-testid="create-character-button"]').click();
      cy.get('#character-name').type('Character Two');
      cy.get('[data-testid="create-character-submit"]').click();

      // Verify both characters exist
      cy.get('[data-testid="preview-card-title"]').should('contain', 'Character One');
      cy.get('[data-testid="preview-card-title"]').should('contain', 'Character Two');

      // Click on first character
      cy.contains('[data-testid="preview-card-title"]', 'Character One').click();

      // Verify we're viewing the first character
      cy.url().should('include', '/characters/');

      // Go back and click on second character
      cy.go('back');
      cy.contains('[data-testid="preview-card-title"]', 'Character Two').click();

      // Verify we're viewing the second character
      cy.url().should('include', '/characters/');
    });
  });

  it('should handle character creation with empty name gracefully', () => {
    cy.createUserAndSignIn().then(() => {
      cy.setupRuleset('Test Ruleset');

      // Navigate to characters page
      cy.visit('/characters');
      cy.get('[data-testid="create-character-button"]', { timeout: 10000 }).should('be.visible').click();

      // Try to submit without entering a name
      cy.get('[data-testid="create-character-submit"]').should('be.disabled');

      // Verify we're still on the create form
      cy.get('#character-name').should('be.visible');
    });
  });
});
