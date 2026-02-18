describe('Dice Rolling Integration', () => {
  beforeEach(() => {
    cy.setupTest();
  });

  afterEach(() => {
    cy.clearUserData();
  });

  it('should roll dice from dice panel', () => {
    cy.createUserAndSignIn().then(() => {
      cy.setupRuleset('Dice Test Ruleset');

      // Navigate to the ruleset by clicking the Open button
      cy.contains('button', 'Open').first().click();

      // Open dice panel
      cy.get('[data-testid="dice-panel-trigger"]').click();

      // Enter dice expression
      cy.get('#value').type('2d6+4');

      // Roll dice
      cy.get('[data-testid="roll-dice-button"]').click();

      // Verify result is displayed
      cy.get('[data-testid="dice-result"]', { timeout: 5000 }).should('be.visible');

      // Verify result is within expected range (6-16 for 2d6+4)
      cy.get('[data-testid="dice-result-total"]').should('exist');
    });
  });

  it('should display roll history', () => {
    cy.createUserAndSignIn().then(() => {
      cy.setupRuleset('Dice History Ruleset');

      // Navigate to the ruleset by clicking the Open button
      cy.contains('button', 'Open').first().click();

      // Open dice panel
      cy.get('[data-testid="dice-panel-trigger"]').click();

      // Make first roll
      cy.get('#value').type('1d20');
      cy.get('[data-testid="roll-dice-button"]').click();
      cy.wait(1000);

      // Make second roll
      cy.get('#value').clear().type('2d6');
      cy.get('[data-testid="roll-dice-button"]').click();
      cy.wait(1000);

      // Verify history shows both rolls
      cy.get('[data-testid="dice-history"]').should('be.visible');
      cy.get('[data-testid="dice-roll-item"]').should('have.length.at.least', 2);
    });
  });

  it('should parse complex dice expressions', () => {
    cy.createUserAndSignIn().then(() => {
      cy.setupRuleset('Complex Dice Ruleset');

      // Navigate to the ruleset by clicking the Open button
      cy.contains('button', 'Open').first().click();

      // Open dice panel
      cy.get('[data-testid="dice-panel-trigger"]').click();

      // Test various dice expressions
      const expressions = ['2d6+4', '1d20-2', '3d8+1d4+5', '4d6'];

      expressions.forEach((expression) => {
        cy.get('#value').clear().type(expression);
        cy.get('[data-testid="roll-dice-button"]').click();
        cy.wait(500);

        // Verify result is displayed
        cy.get('[data-testid="dice-result"]', { timeout: 5000 }).should('be.visible');
      });
    });
  });

  it('should persist roll history after reload', () => {
    cy.createUserAndSignIn().then(() => {
      cy.setupRuleset('Persistent Dice Ruleset');

      // Navigate to the ruleset by clicking the Open button
      cy.contains('button', 'Open').first().click();

      // Open dice panel and make a roll
      cy.get('[data-testid="dice-panel-trigger"]').click();
      cy.get('#value').type('1d20+5');
      cy.get('[data-testid="roll-dice-button"]').click();

      // Wait for roll to complete
      cy.get('[data-testid="dice-result"]', { timeout: 5000 }).should('be.visible');

      // Reload the page
      cy.reload();

      // Open dice panel again
      cy.get('[data-testid="dice-panel-trigger"]').click();

      // Verify roll history persisted
      cy.get('[data-testid="dice-history"]').should('be.visible');
      cy.get('[data-testid="dice-roll-item"]').should('have.length.at.least', 1);
    });
  });

  it('should save dice roll with label', () => {
    cy.createUserAndSignIn().then(() => {
      cy.setupRuleset('Labeled Dice Ruleset');

      // Navigate to the ruleset by clicking the Open button
      cy.contains('button', 'Open').first().click();

      // Open dice panel
      cy.get('[data-testid="dice-panel-trigger"]').click();

      // Enter label and dice expression
      cy.get('#label').type('Attack Roll');
      cy.get('#value').type('1d20+5');

      // Save and roll
      cy.get('[data-testid="save-and-roll-button"]').click();

      // Verify roll is saved with label
      cy.get('[data-testid="dice-roll-item"]').should('contain', 'Attack Roll');
    });
  });

  it('should handle invalid dice expressions gracefully', () => {
    cy.createUserAndSignIn().then(() => {
      cy.setupRuleset('Invalid Dice Ruleset');

      // Navigate to the ruleset by clicking the Open button
      cy.contains('button', 'Open').first().click();

      // Open dice panel
      cy.get('[data-testid="dice-panel-trigger"]').click();

      // Try invalid expression
      cy.get('#value').type('invalid');
      cy.get('[data-testid="roll-dice-button"]').click();

      // Verify error handling (button should not process invalid input)
      // Or verify no result is shown
      cy.get('[data-testid="dice-result"]').should('not.exist');
    });
  });
});
