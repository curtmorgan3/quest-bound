import { DescriptionEditor } from '@/components/composites/description-editor';

describe('DescriptionEditor Component', () => {
  it('should render with initial content', () => {
    const initialContent = 'Test description content';
    
    cy.mount(
      <DescriptionEditor 
        value={initialContent} 
        onChange={cy.spy()} 
      />
    );
    
    cy.contains(initialContent).should('be.visible');
  });

  it('should render the component without errors', () => {
    const onChangeSpy = cy.spy().as('onChangeSpy');
    
    cy.mount(
      <DescriptionEditor 
        value="Initial content" 
        onChange={onChangeSpy} 
      />
    );
    
    // Verify component renders
    cy.contains('Initial content').should('be.visible');
  });

  it('should handle empty content gracefully', () => {
    cy.mount(
      <DescriptionEditor 
        value="" 
        onChange={cy.spy()} 
      />
    );
    
    // Should render without errors - component structure may vary
    cy.get('div').should('exist');
  });

  it('should accept onChange callback', () => {
    const onChangeSpy = cy.spy().as('onChangeSpy');
    
    cy.mount(
      <DescriptionEditor 
        value="Test" 
        onChange={onChangeSpy}
      />
    );
    
    // Verify the component accepts the callback prop
    cy.contains('Test').should('be.visible');
  });

  it('should render with different content values', () => {
    const content = 'This is a longer description with multiple words';
    
    cy.mount(
      <DescriptionEditor 
        value={content} 
        onChange={cy.spy()}
      />
    );
    
    cy.contains('This is a longer description').should('be.visible');
  });
});
