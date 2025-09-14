import { SignIn } from './sign-in';

describe('SignIn Component', () => {
  it('should render sign in form', () => {
    cy.mount(<SignIn />);
    
    cy.get('[data-testid="sign-up-form"]').should('be.visible');
    cy.contains('Login or Signup').should('be.visible');
    cy.get('[data-testid="join-discord"]').should('be.visible');
    cy.contains('Learn More').should('be.visible');
  });
});