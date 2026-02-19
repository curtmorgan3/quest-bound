describe('Archetypes', () => {
  beforeEach(() => {
    cy.setupTest();
  });

  afterEach(() => {
    cy.clearUserData();
  });

  it('should create character with default archetype', () => {
    cy.createUserAndSignIn().then(() => {
      cy.setupRuleset('Archetype Ruleset');

      cy.visit('/characters');
      cy.get('[data-testid="create-character-button"]', { timeout: 10000 }).should('be.visible').click();

      cy.get('#character-name').type('Hero');
      cy.get('[data-testid="create-character-submit"]').click();

      cy.get('[data-testid="preview-card-title"]', { timeout: 10000 }).should('contain', 'Hero');

      cy.contains('[data-testid="preview-card-title"]', 'Hero').click();
      cy.url().should('include', '/characters/');

      cy.get('[data-testid="nav-character-archetypes"]').click();
      cy.get('[data-testid="character-archetypes-panel"]').should('be.visible');
      cy.get('[data-testid="character-archetypes-list"]').should('contain', 'Default');
    });
  });

  it('should create character with explicit archetype when multiple exist', () => {
    cy.createUserAndSignIn().then(() => {
      cy.setupRuleset('Multi Archetype Ruleset');

      cy.visit('/rulesets');
      cy.contains('Multi Archetype Ruleset').parents().find('[data-testid="preview-card-open"]').first().click();
      cy.url().should('include', '/rulesets/');

      cy.get('[data-testid="nav-archetypes"]').click();
      cy.get('[data-testid="archetypes-new-button"]').click();
      cy.get('#archetype-name').type('Fighter');
      cy.get('#archetype-desc').type('Melee specialist');
      cy.contains('button', 'Create').click();

      cy.get('[data-testid="archetypes-list"]').should('contain', 'Default');
      cy.get('[data-testid="archetypes-list"]').should('contain', 'Fighter');

      cy.visit('/characters');
      cy.get('[data-testid="create-character-button"]', { timeout: 10000 }).should('be.visible').click();

      cy.get('#character-name').type('Warrior');
      cy.get('[data-testid="character-archetype-select"]').click();
      cy.contains('[role="option"]', 'Fighter').click();
      cy.get('[data-testid="create-character-submit"]').click();

      cy.get('[data-testid="preview-card-title"]', { timeout: 10000 }).should('contain', 'Warrior');

      cy.contains('[data-testid="preview-card-title"]', 'Warrior').click();
      cy.get('[data-testid="nav-character-archetypes"]').click();
      cy.get('[data-testid="character-archetypes-list"]').should('contain', 'Fighter');
    });
  });

  it('should add and remove archetype at runtime', () => {
    cy.createUserAndSignIn().then(() => {
      cy.setupRuleset('Runtime Archetype Ruleset');

      cy.visit('/rulesets');
      cy.contains('Runtime Archetype Ruleset').parents().find('[data-testid="preview-card-open"]').first().click();
      cy.get('[data-testid="nav-archetypes"]').click();
      cy.get('[data-testid="archetypes-new-button"]').click();
      cy.get('#archetype-name').type('Mage');
      cy.contains('button', 'Create').click();

      cy.visit('/characters');
      cy.get('[data-testid="create-character-button"]', { timeout: 10000 }).should('be.visible').click();
      cy.get('#character-name').type('Wizard');
      cy.get('[data-testid="create-character-submit"]').click();

      cy.contains('[data-testid="preview-card-title"]', 'Wizard').click();
      cy.get('[data-testid="nav-character-archetypes"]').click();

      cy.get('[data-testid="character-archetypes-panel"]').should('be.visible');
      cy.get('[data-testid="character-archetypes-list"]').should('contain', 'Default');

      cy.get('[data-testid="add-archetype-select"]').click();
      cy.contains('[role="option"]', 'Mage').click();

      cy.get('[data-testid="character-archetypes-list"]').should('contain', 'Mage');

      cy.get('[data-testid="character-archetypes-list"]')
        .contains('Mage')
        .closest('[data-testid^="character-archetype-row-"]')
        .find('[data-testid="remove-archetype-btn"]')
        .click();
      cy.get('[data-testid="character-archetypes-list"]').should('not.contain', 'Mage');
    });
  });

  it('should manage archetypes CRUD', () => {
    cy.createUserAndSignIn().then(() => {
      cy.setupRuleset('Archetype CRUD Ruleset');

      cy.visit('/rulesets');
      cy.contains('Archetype CRUD Ruleset').parents().find('[data-testid="preview-card-open"]').first().click();
      cy.get('[data-testid="nav-archetypes"]').click();

      cy.get('[data-testid="archetypes-list"]').should('contain', 'Default');

      cy.get('[data-testid="archetypes-new-button"]').click();
      cy.get('#archetype-name').type('Rogue');
      cy.get('#archetype-desc').type('Stealth and agility');
      cy.contains('button', 'Create').click();

      cy.get('[data-testid="archetypes-list"]').should('contain', 'Rogue');

      cy.get('[data-testid="archetypes-list"]')
        .contains('Rogue')
        .closest('[data-testid^="archetype-item-"]')
        .find('[data-testid="archetype-delete-btn"]')
        .click();
      cy.get('[data-testid="archetype-delete-confirm"]').click();

      cy.get('[data-testid="archetypes-list"]').should('not.contain', 'Rogue');
    });
  });
});
