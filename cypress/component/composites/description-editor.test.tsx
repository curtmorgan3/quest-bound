import { DescriptionEditor } from '@/components/composites/description-editor';

describe('DescriptionEditor Component', () => {
  it('should render in edit mode by default', () => {
    const onChange = cy.stub().as('onChange');

    cy.mount(<DescriptionEditor value='Test description' onChange={onChange} />);

    cy.get('textarea').should('be.visible');
    cy.get('textarea').should('have.value', 'Test description');
  });

  it('should display initial content', () => {
    const onChange = cy.stub().as('onChange');

    cy.mount(<DescriptionEditor value='Initial content' onChange={onChange} />);

    cy.get('textarea').should('have.value', 'Initial content');
  });

  it('should allow text editing', () => {
    const onChange = cy.stub().as('onChange');

    cy.mount(<DescriptionEditor value='' onChange={onChange} />);

    cy.get('textarea').type('New content');
    cy.get('@onChange').should('have.been.called');
  });

  it('should call onChange with updated content', () => {
    const onChange = cy.stub().as('onChange');

    cy.mount(<DescriptionEditor value='Initial' onChange={onChange} />);

    cy.get('textarea').clear().type('Updated');
    cy.get('@onChange').should('have.been.called');
  });

  it('should handle empty content', () => {
    const onChange = cy.stub().as('onChange');

    cy.mount(<DescriptionEditor value='' onChange={onChange} />);

    cy.get('textarea').should('have.value', '');
  });

  it('should toggle to preview mode', () => {
    const onChange = cy.stub().as('onChange');

    cy.mount(<DescriptionEditor value='Test content' onChange={onChange} />);

    cy.contains('button', 'Preview').click();
    cy.get('textarea').should('not.exist');
    cy.contains('Test content').should('be.visible');
  });

  it('should toggle back to edit mode', () => {
    const onChange = cy.stub().as('onChange');

    cy.mount(<DescriptionEditor value='Test content' onChange={onChange} />);

    cy.contains('button', 'Preview').click();
    cy.contains('button', 'Edit').click();
    cy.get('textarea').should('be.visible');
  });

  it('should render markdown in preview mode', () => {
    const onChange = cy.stub().as('onChange');

    cy.mount(<DescriptionEditor value='# Heading\n\n**Bold text**' onChange={onChange} />);

    cy.contains('button', 'Preview').click();
    cy.get('h1').should('contain', 'Heading');
    cy.get('strong').should('contain', 'Bold text');
  });

  it('should apply placeholder', () => {
    const onChange = cy.stub().as('onChange');

    cy.mount(<DescriptionEditor value='' onChange={onChange} placeholder='Enter description...' />);

    cy.get('textarea').should('have.attr', 'placeholder', 'Enter description...');
  });

  it('should handle disabled state', () => {
    const onChange = cy.stub().as('onChange');

    cy.mount(<DescriptionEditor value='Test' onChange={onChange} disabled={true} />);

    cy.get('textarea').should('be.disabled');
  });

  it('should apply custom id', () => {
    const onChange = cy.stub().as('onChange');

    cy.mount(<DescriptionEditor value='Test' onChange={onChange} id='custom-id' />);

    cy.get('#custom-id').should('exist');
  });

  it('should apply custom className', () => {
    const onChange = cy.stub().as('onChange');

    cy.mount(<DescriptionEditor value='Test' onChange={onChange} className='custom-class' />);

    cy.get('.custom-class').should('exist');
  });

  it('should call onSave when Enter is pressed without Shift', () => {
    const onChange = cy.stub().as('onChange');
    const onSave = cy.stub().as('onSave');

    cy.mount(<DescriptionEditor value='Test' onChange={onChange} onSave={onSave} />);

    cy.get('textarea').type('{enter}');
    cy.get('@onSave').should('have.been.calledOnce');
  });

  it('should not call onSave when Shift+Enter is pressed', () => {
    const onChange = cy.stub().as('onChange');
    const onSave = cy.stub().as('onSave');

    cy.mount(<DescriptionEditor value='Test' onChange={onChange} onSave={onSave} />);

    cy.get('textarea').type('{shift}{enter}');
    cy.get('@onSave').should('not.have.been.called');
  });

  it('should show placeholder in preview mode when empty', () => {
    const onChange = cy.stub().as('onChange');

    cy.mount(<DescriptionEditor value='' onChange={onChange} placeholder='No description.' />);

    cy.contains('button', 'Preview').click();
    cy.contains('No description.').should('be.visible');
  });

  it('should have Edit and Preview toggle buttons', () => {
    const onChange = cy.stub().as('onChange');

    cy.mount(<DescriptionEditor value='Test' onChange={onChange} />);

    cy.contains('button', 'Edit').should('exist');
    cy.contains('button', 'Preview').should('exist');
  });

  it('should have Description label', () => {
    const onChange = cy.stub().as('onChange');

    cy.mount(<DescriptionEditor value='Test' onChange={onChange} />);

    cy.contains('Description').should('be.visible');
  });

  it('should handle multiline content', () => {
    const onChange = cy.stub().as('onChange');
    const multilineContent = 'Line 1\nLine 2\nLine 3';

    cy.mount(<DescriptionEditor value={multilineContent} onChange={onChange} />);

    cy.get('textarea').should('have.value', multilineContent);
  });

  it('should preserve content when switching between modes', () => {
    const onChange = cy.stub().as('onChange');

    cy.mount(<DescriptionEditor value='Original content' onChange={onChange} />);

    cy.contains('button', 'Preview').click();
    cy.contains('Original content').should('be.visible');
    cy.contains('button', 'Edit').click();
    cy.get('textarea').should('have.value', 'Original content');
  });
});
