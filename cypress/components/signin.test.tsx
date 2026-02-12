import { SignIn } from '@/pages';

describe('SignIn Component', () => {
  it('should render sign in form', () => {
    cy.mount(<SignIn />);

    // Check for the main form elements
    cy.get('video').should('be.visible');
    cy.get('[role="combobox"]').should('be.visible'); // SelectTrigger
    cy.contains('Select a user').should('be.visible');
    cy.contains('Submit').should('be.visible');

    // Check for the links section
    cy.get('[data-testid="join-discord"]').should('be.visible');
    cy.contains('Learn More').should('be.visible');
  });
});
