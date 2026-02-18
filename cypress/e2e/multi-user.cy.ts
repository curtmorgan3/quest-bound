describe('Multi-User Scenarios', () => {
  beforeEach(() => {
    cy.setupTest();
  });

  afterEach(() => {
    cy.clearUserData();
  });

  it('should isolate data between users', () => {
    // Create User A with ruleset
    cy.createUserAndSignIn('UserA').then((usernameA) => {
      cy.log(`Created User A: ${usernameA}`);

      cy.setupRuleset('UserA Ruleset', 'This belongs to User A');

      // Verify User A's ruleset exists
      cy.get('[data-testid="preview-card-title"]').should('contain', 'UserA Ruleset');

      // Sign out
      cy.signOut();

      // Create User B with different ruleset
      cy.createUserAndSignIn('UserB').then((usernameB) => {
        cy.log(`Created User B: ${usernameB}`);

        cy.setupRuleset('UserB Ruleset', 'This belongs to User B');

        // Verify User B's ruleset exists
        cy.get('[data-testid="preview-card-title"]').should('contain', 'UserB Ruleset');

        // Verify User A's ruleset is NOT visible
        cy.get('[data-testid="preview-card-title"]').should('not.contain', 'UserA Ruleset');

        // Sign out
        cy.signOut();

        // Sign back in as User A
        cy.signInWithExistingUser(usernameA);

        // Verify only User A's data is visible
        cy.get('[data-testid="preview-card-title"]').should('contain', 'UserA Ruleset');
        cy.get('[data-testid="preview-card-title"]').should('not.contain', 'UserB Ruleset');

        // Sign out
        cy.signOut();

        // Sign back in as User B
        cy.signInWithExistingUser(usernameB);

        // Verify only User B's data is visible
        cy.get('[data-testid="preview-card-title"]').should('contain', 'UserB Ruleset');
        cy.get('[data-testid="preview-card-title"]').should('not.contain', 'UserA Ruleset');
      });
    });
  });

  it('should not leak character data between users', () => {
    // Create User A with character
    cy.createUserAndSignIn('CharUserA').then((usernameA) => {
      cy.setupRuleset('Ruleset A');

      // Navigate to the ruleset by clicking the Open button
      cy.contains('button', 'Open').first().click();
      cy.get('[data-testid="nav-characters"]').click();
      cy.get('[data-testid="create-character-button"]').click();
      cy.get('#character-name').type('Character A');
      cy.get('[data-testid="create-character-submit"]').click();

      // Wait for character creation
      cy.get('[data-testid="preview-card-title"]', { timeout: 10000 }).should(
        'contain',
        'Character A',
      );

      // Sign out
      cy.signOut();

      // Create User B
      cy.createUserAndSignIn('CharUserB').then(() => {
        cy.setupRuleset('Ruleset B');

        // Navigate to the ruleset by clicking the Open button
        cy.contains('button', 'Open').first().click();
        cy.get('[data-testid="nav-characters"]').click();

        // Verify User B doesn't see User A's character
        cy.get('[data-testid="preview-card-title"]').should('not.contain', 'Character A');

        // Create User B's own character
        cy.get('[data-testid="create-character-button"]').click();
        cy.get('#character-name').type('Character B');
        cy.get('[data-testid="create-character-submit"]').click();

        cy.get('[data-testid="preview-card-title"]', { timeout: 10000 }).should(
          'contain',
          'Character B',
        );

        // Sign out
        cy.signOut();

        // Sign back in as User A
        cy.signInWithExistingUser(usernameA);

        // Navigate to the ruleset by clicking the Open button
        cy.contains('button', 'Open').first().click();
        cy.get('[data-testid="nav-characters"]').click();

        // Verify User A only sees their own character
        cy.get('[data-testid="preview-card-title"]').should('contain', 'Character A');
        cy.get('[data-testid="preview-card-title"]').should('not.contain', 'Character B');
      });
    });
  });

  it('should handle rapid user switching', () => {
    // Create multiple users
    const users = ['RapidUser1', 'RapidUser2', 'RapidUser3'];

    // Create all users with their own rulesets
    users.forEach((username, index) => {
      cy.createUserAndSignIn(username).then(() => {
        cy.setupRuleset(`${username} Ruleset`, `Ruleset for ${username}`);

        // Verify ruleset exists
        cy.get('[data-testid="preview-card-title"]').should('contain', `${username} Ruleset`);

        // Sign out (except for the last user, we'll switch from them)
        if (index < users.length - 1) {
          cy.signOut();
        }
      });
    });

    // Now rapidly switch between users
    users.forEach((username) => {
      cy.signOut();
      cy.signInWithExistingUser(username);

      // Verify correct data loads
      cy.get('[data-testid="preview-card-title"]').should('contain', `${username} Ruleset`);

      // Verify other users' data is not visible
      users
        .filter((u) => u !== username)
        .forEach((otherUser) => {
          cy.get('[data-testid="preview-card-title"]').should('not.contain', `${otherUser} Ruleset`);
        });
    });
  });

  it('should maintain separate dice roll histories per user', () => {
    // Create User A and make a dice roll
    cy.createUserAndSignIn('DiceUserA').then((usernameA) => {
      cy.setupRuleset('Ruleset A');

      // Navigate to the ruleset by clicking the Open button
      cy.contains('button', 'Open').first().click();
      cy.get('[data-testid="dice-panel-trigger"]').click();
      cy.get('#label').type('User A Roll');
      cy.get('#value').type('1d20');
      cy.get('[data-testid="roll-dice-button"]').click();

      cy.wait(1000);

      // Sign out
      cy.signOut();

      // Create User B and make a different dice roll
      cy.createUserAndSignIn('DiceUserB').then(() => {
        cy.setupRuleset('Ruleset B');

        // Navigate to the ruleset by clicking the Open button
        cy.contains('button', 'Open').first().click();
        cy.get('[data-testid="dice-panel-trigger"]').click();
        cy.get('#label').type('User B Roll');
        cy.get('#value').type('2d6');
        cy.get('[data-testid="roll-dice-button"]').click();

        cy.wait(1000);

        // Verify User B's roll history
        cy.get('[data-testid="dice-roll-item"]').should('contain', 'User B Roll');
        cy.get('[data-testid="dice-roll-item"]').should('not.contain', 'User A Roll');

        // Sign out
        cy.signOut();

        // Sign back in as User A
        cy.signInWithExistingUser(usernameA);

        // Navigate to the ruleset by clicking the Open button
        cy.contains('button', 'Open').first().click();
        cy.get('[data-testid="dice-panel-trigger"]').click();

        // Verify User A's roll history
        cy.get('[data-testid="dice-roll-item"]').should('contain', 'User A Roll');
        cy.get('[data-testid="dice-roll-item"]').should('not.contain', 'User B Roll');
      });
    });
  });
});
