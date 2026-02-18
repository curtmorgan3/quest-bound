import { ViewTextNode } from '@/lib/compass-planes/nodes/components/text/text-node';
import { DiceContext } from '@/stores';
import type { Component, IDiceContext } from '@/types';

describe('TextNode Component', () => {
  const createTextComponent = (data: any, style: any = {}): Component => ({
    id: 'text-1',
    type: 'text',
    rulesetId: '',
    x: 0,
    y: 0,
    z: 1,
    rotation: 0,
    width: 200,
    height: 100,
    data: JSON.stringify(data),
    style: JSON.stringify({
      fontSize: 16,
      fontFamily: 'Arial',
      color: '#000000',
      textAlign: 'start',
      verticalAlign: 'start',
      backgroundColor: 'transparent',
      ...style,
    }),
    locked: false,
    windowId: 'window-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const mockDiceContext = {
    rollDice: cy.stub().as('rollDice'),
    isRolling: false,
    lastResult: null,
    reset: cy.stub(),
    dicePanelOpen: false,
    setDicePanelOpen: cy.stub(),
    username: null,
  } as unknown as IDiceContext;

  it('should render plain text content', () => {
    const component = createTextComponent({ value: 'Plain text content' });

    cy.mount(
      <DiceContext.Provider value={mockDiceContext}>
        <ViewTextNode component={component} />
      </DiceContext.Provider>,
    );

    cy.contains('Plain text content').should('be.visible');
  });

  it('should display interpolated value from data', () => {
    const component = createTextComponent({
      value: 'Character: {{name}}',
      interpolatedValue: 'Character: Test Hero',
    });

    cy.mount(
      <DiceContext.Provider value={mockDiceContext}>
        <ViewTextNode component={component} />
      </DiceContext.Provider>,
    );

    cy.contains('Character: Test Hero').should('be.visible');
  });

  it('should detect dice expressions in text', () => {
    const component = createTextComponent({
      value: 'Attack: 2d6+4',
      interpolatedValue: 'Attack: 2d6+4',
    });

    cy.mount(
      <DiceContext.Provider value={mockDiceContext}>
        <ViewTextNode component={component} />
      </DiceContext.Provider>,
    );

    cy.contains('Attack: 2d6+4').should('be.visible');
    cy.contains('Attack: 2d6+4').should('have.class', 'clickable');
  });

  it('should call rollDice when clicking dice expression', () => {
    const component = createTextComponent({
      value: '2d6+4',
      interpolatedValue: '2d6+4',
    });

    cy.mount(
      <DiceContext.Provider value={mockDiceContext}>
        <ViewTextNode component={component} />
      </DiceContext.Provider>,
    );

    cy.contains('2d6+4').click();
    cy.get('@rollDice').should('have.been.calledWith', '2d6+4');
  });

  it('should apply text styling (font, color, size)', () => {
    const component = createTextComponent(
      { value: 'Styled Text', interpolatedValue: 'Styled Text' },
      {
        fontSize: 24,
        fontFamily: 'Georgia',
        fontWeight: 'bold',
        fontStyle: 'italic',
        color: '#ff0000',
        textAlign: 'center',
      },
    );

    cy.mount(
      <DiceContext.Provider value={mockDiceContext}>
        <ViewTextNode component={component} />
      </DiceContext.Provider>,
    );

    cy.contains('Styled Text').should('have.css', 'font-size', '24px');
    cy.contains('Styled Text').should('have.css', 'font-family', 'Georgia');
    cy.contains('Styled Text').should('have.css', 'font-weight', '700'); // bold = 700
    cy.contains('Styled Text').should('have.css', 'font-style', 'italic');
    cy.contains('Styled Text').should('have.css', 'color', 'rgb(255, 0, 0)'); // #ff0000
  });

  it('should apply background color and border radius', () => {
    const component = createTextComponent(
      { value: 'Background Test', interpolatedValue: 'Background Test' },
      {
        backgroundColor: '#f0f0f0',
        borderRadius: '8px',
      },
    );

    cy.mount(
      <DiceContext.Provider value={mockDiceContext}>
        <ViewTextNode component={component} />
      </DiceContext.Provider>,
    );

    cy.get('section').should('have.css', 'background-color', 'rgb(240, 240, 240)');
    cy.get('section').should('have.css', 'border-radius', '8px');
  });

  it('should handle empty text gracefully', () => {
    const component = createTextComponent({ value: '', interpolatedValue: '' });

    cy.mount(
      <DiceContext.Provider value={mockDiceContext}>
        <ViewTextNode component={component} />
      </DiceContext.Provider>,
    );

    cy.get('section').should('exist');
    cy.get('span').should('be.empty');
  });

  it('should handle text alignment', () => {
    const component = createTextComponent(
      { value: 'Centered', interpolatedValue: 'Centered' },
      {
        textAlign: 'center',
        verticalAlign: 'center',
      },
    );

    cy.mount(
      <DiceContext.Provider value={mockDiceContext}>
        <ViewTextNode component={component} />
      </DiceContext.Provider>,
    );

    cy.get('section').should('have.css', 'justify-content', 'center');
    cy.get('section').should('have.css', 'align-items', 'center');
  });

  it('should not trigger dice roll when onDoubleClick is provided', () => {
    const component = createTextComponent({
      value: '2d6+4',
      interpolatedValue: '2d6+4',
    });

    const onDoubleClick = cy.stub().as('onDoubleClick');

    cy.mount(
      <DiceContext.Provider value={mockDiceContext}>
        <ViewTextNode component={component} onDoubleClick={onDoubleClick} />
      </DiceContext.Provider>,
    );

    cy.contains('2d6+4').click();
    cy.get('@rollDice').should('not.have.been.called');
  });

  it('should handle multiple dice expressions in text', () => {
    const component = createTextComponent({
      value: 'Attack 2d6+4 and damage 1d8',
      interpolatedValue: 'Attack 2d6+4 and damage 1d8',
    });

    cy.mount(
      <DiceContext.Provider value={mockDiceContext}>
        <ViewTextNode component={component} />
      </DiceContext.Provider>,
    );

    cy.contains('Attack 2d6+4 and damage 1d8').should('be.visible');
    cy.contains('Attack 2d6+4 and damage 1d8').should('have.class', 'clickable');
    cy.contains('Attack 2d6+4 and damage 1d8').click();
    cy.get('@rollDice').should('have.been.calledWith', '2d6+4,1d8');
  });
});
