import { NumberInput } from '@/components/composites/number-input';

describe('NumberInput Component', () => {
  it('should render with initial value', () => {
    const onChange = cy.stub().as('onChange');

    cy.mount(<NumberInput value={50} onChange={onChange} />);

    cy.get('input[type="number"]').should('have.value', '50');
  });

  it('should accept direct input', () => {
    const onChange = cy.stub().as('onChange');

    cy.mount(<NumberInput value={50} onChange={onChange} />);

    cy.get('input[type="number"]').clear().type('75');
    cy.get('@onChange').should('have.been.calledWith', 75);
  });

  it('should handle empty value', () => {
    const onChange = cy.stub().as('onChange');

    cy.mount(<NumberInput value={''} onChange={onChange} />);

    cy.get('input[type="number"]').should('have.value', '');
  });

  it('should open popover on click', () => {
    const onChange = cy.stub().as('onChange');

    cy.mount(<NumberInput value={50} onChange={onChange} wheelMin={0} wheelMax={100} />);

    cy.get('input[type="number"]').click();
    cy.get('[role="dialog"]').should('be.visible');
  });

  it('should display preset buttons in popover', () => {
    const onChange = cy.stub().as('onChange');

    cy.mount(<NumberInput value={50} onChange={onChange} wheelMin={0} wheelMax={100} />);

    cy.get('input[type="number"]').click();
    cy.get('button').contains('1').should('be.visible');
    cy.get('button').contains('3').should('be.visible');
    cy.get('button').contains('5').should('be.visible');
  });

  it('should have Set button in popover', () => {
    const onChange = cy.stub().as('onChange');

    cy.mount(<NumberInput value={50} onChange={onChange} wheelMin={0} wheelMax={100} />);

    cy.get('input[type="number"]').click();
    cy.get('button').contains('Set').should('be.visible');
  });

  it('should have Add and Subtract buttons in popover', () => {
    const onChange = cy.stub().as('onChange');

    cy.mount(<NumberInput value={50} onChange={onChange} wheelMin={0} wheelMax={100} />);

    cy.get('input[type="number"]').click();
    cy.get('.number-input-add').should('be.visible');
    cy.get('.number-input-subtract').should('be.visible');
  });

  it('should call onChange with new value when Set is clicked', () => {
    const onChange = cy.stub().as('onChange');

    cy.mount(<NumberInput value={50} onChange={onChange} wheelMin={0} wheelMax={100} />);

    cy.get('input[type="number"]').click();
    // Wait for popover to open and scroll to complete
    cy.wait(500);
    cy.get('button.number-input-set').click();
    cy.get('@onChange').should('have.been.called');
  });

  it('should handle disabled state', () => {
    const onChange = cy.stub().as('onChange');

    cy.mount(<NumberInput value={50} onChange={onChange} disabled={true} />);

    cy.get('input[type="number"]').should('be.disabled');
  });

  it('should apply placeholder', () => {
    const onChange = cy.stub().as('onChange');

    cy.mount(<NumberInput value={''} onChange={onChange} placeholder='Enter a number' />);

    cy.get('input[type="number"]').should('have.attr', 'placeholder', 'Enter a number');
  });

  it('should apply custom className', () => {
    const onChange = cy.stub().as('onChange');

    cy.mount(<NumberInput value={50} onChange={onChange} className='custom-class' />);

    cy.get('input[type="number"]').should('have.class', 'custom-class');
  });

  it('should apply custom style', () => {
    const onChange = cy.stub().as('onChange');

    cy.mount(
      <NumberInput value={50} onChange={onChange} style={{ fontSize: '20px', color: 'red' }} />,
    );

    cy.get('input[type="number"]').should('have.css', 'font-size', '20px');
    cy.get('input[type="number"]').should('have.css', 'color', 'rgb(255, 0, 0)');
  });

  it('should enforce inputMin constraint', () => {
    const onChange = cy.stub().as('onChange');

    cy.mount(<NumberInput value={50} onChange={onChange} inputMin={10} inputMax={100} />);

    cy.get('input[type="number"]').should('have.attr', 'min', '10');
  });

  it('should enforce inputMax constraint', () => {
    const onChange = cy.stub().as('onChange');

    cy.mount(<NumberInput value={50} onChange={onChange} inputMin={0} inputMax={100} />);

    cy.get('input[type="number"]').should('have.attr', 'max', '100');
  });

  it('should call onBlur when input loses focus', () => {
    const onChange = cy.stub().as('onChange');
    const onBlur = cy.stub().as('onBlur');

    cy.mount(<NumberInput value={50} onChange={onChange} onBlur={onBlur} />);

    cy.get('input[type="number"]').focus().blur();
    cy.get('@onBlur').should('have.been.calledOnce');
  });

  it('should display label in popover when provided', () => {
    const onChange = cy.stub().as('onChange');

    cy.mount(
      <NumberInput value={50} onChange={onChange} label='Health Points' wheelMin={0} wheelMax={100} />,
    );

    cy.get('input[type="number"]').click();
    cy.contains('Health Points').should('be.visible');
  });

  it('should handle step parameter', () => {
    const onChange = cy.stub().as('onChange');

    cy.mount(<NumberInput value={50} onChange={onChange} step={5} wheelMin={0} wheelMax={100} />);

    cy.get('input[type="number"]').click();
    cy.get('[role="dialog"]').should('be.visible');
  });

  it('should call onOpenChange when popover opens', () => {
    const onChange = cy.stub().as('onChange');
    const onOpenChange = cy.stub().as('onOpenChange');

    cy.mount(
      <NumberInput
        value={50}
        onChange={onChange}
        onOpenChange={onOpenChange}
        wheelMin={0}
        wheelMax={100}
      />,
    );

    cy.get('input[type="number"]').click();
    cy.get('@onOpenChange').should('have.been.calledWith', true);
  });

  it('should not open popover when disabled', () => {
    const onChange = cy.stub().as('onChange');

    cy.mount(<NumberInput value={50} onChange={onChange} disabled={true} wheelMin={0} wheelMax={100} />);

    cy.get('input[type="number"]').click({ force: true });
    cy.get('[role="dialog"]').should('not.exist');
  });
});
