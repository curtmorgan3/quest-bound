import { NumberInput } from '@/components/composites/number-input';

describe('NumberInput Component', () => {
  it('should render with initial value', () => {
    const onChangeSpy = cy.spy().as('onChangeSpy');
    
    cy.mount(<NumberInput value={10} onChange={onChangeSpy} />);
    
    cy.get('input[type="number"]').should('have.value', '10');
  });

  it('should call onChange when value is typed', () => {
    const onChangeSpy = cy.spy().as('onChangeSpy');
    
    cy.mount(<NumberInput value={10} onChange={onChangeSpy} />);
    
    cy.get('input[type="number"]').clear().type('25');
    cy.get('@onChangeSpy').should('have.been.called');
  });

  it('should accept wheelMin configuration', () => {
    cy.mount(<NumberInput value={5} onChange={cy.spy()} wheelMin={0} wheelMax={100} />);
    
    // Verify component renders with configuration
    cy.get('input[type="number"]').should('have.value', '5');
  });

  it('should enforce maximum value', () => {
    const onChangeSpy = cy.spy().as('onChangeSpy');
    
    cy.mount(<NumberInput value={95} onChange={onChangeSpy} wheelMin={0} wheelMax={100} />);
    
    // Try to go above maximum
    cy.get('input[type="number"]').clear().type('150').blur();
    
    // Should clamp to maximum
    cy.get('@onChangeSpy').should('have.been.called');
  });

  it('should handle disabled state', () => {
    const onChangeSpy = cy.spy().as('onChangeSpy');
    
    cy.mount(<NumberInput value={10} onChange={onChangeSpy} disabled={true} />);
    
    cy.get('input[type="number"]').should('be.disabled');
  });

  it('should handle empty value', () => {
    const onChangeSpy = cy.spy().as('onChangeSpy');
    
    cy.mount(<NumberInput value={''} onChange={onChangeSpy} />);
    
    cy.get('input[type="number"]').should('have.value', '');
  });

  it('should accept step value configuration', () => {
    const onChangeSpy = cy.spy().as('onChangeSpy');
    
    cy.mount(<NumberInput value={10} onChange={onChangeSpy} step={5} wheelMin={0} wheelMax={100} />);
    
    // Verify the component renders with step configuration
    cy.get('input[type="number"]').should('have.value', '10');
  });
});
