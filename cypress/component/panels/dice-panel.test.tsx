import { DicePanel } from '@/pages/dice/dice-panel';
import { DiceContext } from '@/stores';

// Mock the hooks
const mockUseDiceRolls = () => ({
  diceRolls: [
    { id: '1', label: 'Attack Roll', value: '1d20+5', createdAt: new Date().toISOString() },
    { id: '2', label: 'Damage', value: '2d6+3', createdAt: new Date().toISOString() },
  ],
  createDiceRoll: cy.stub().as('createDiceRoll').resolves(),
  deleteDiceRoll: cy.stub().as('deleteDiceRoll'),
});

cy.stub(require('@/lib/compass-api'), 'useDiceRolls').callsFake(mockUseDiceRolls);

describe('DicePanel Component', () => {
  const createMockDiceContext = (overrides: any = {}) => ({
    rollDice: cy.stub().as('rollDice'),
    isRolling: false,
    lastResult: null,
    reset: cy.stub().as('reset'),
    dicePanelOpen: true,
    setDicePanelOpen: cy.stub().as('setDicePanelOpen'),
    username: null,
    ...overrides,
  });

  it('should render when dicePanelOpen is true', () => {
    const mockContext = createMockDiceContext();

    cy.mount(
      <DiceContext.Provider value={mockContext as any}>
        <DicePanel />
      </DiceContext.Provider>,
    );

    cy.get('[role="dialog"]').should('be.visible');
  });

  it('should display label input', () => {
    const mockContext = createMockDiceContext();

    cy.mount(
      <DiceContext.Provider value={mockContext as any}>
        <DicePanel />
      </DiceContext.Provider>,
    );

    cy.get('input#label').should('be.visible');
    cy.get('input#label').should('have.attr', 'placeholder', 'Attack roll, Damage, etc.');
  });

  it('should display roll value input', () => {
    const mockContext = createMockDiceContext();

    cy.mount(
      <DiceContext.Provider value={mockContext as any}>
        <DicePanel />
      </DiceContext.Provider>,
    );

    cy.get('input#value').should('be.visible');
    cy.get('input#value').should('have.attr', 'placeholder', '2d6+3');
  });

  it('should have Roll button', () => {
    const mockContext = createMockDiceContext();

    cy.mount(
      <DiceContext.Provider value={mockContext as any}>
        <DicePanel />
      </DiceContext.Provider>,
    );

    cy.contains('button', 'Roll').should('be.visible');
  });

  it('should have Save and Roll button', () => {
    const mockContext = createMockDiceContext();

    cy.mount(
      <DiceContext.Provider value={mockContext as any}>
        <DicePanel />
      </DiceContext.Provider>,
    );

    cy.contains('button', 'Save and Roll').should('be.visible');
  });

  it('should call rollDice when Roll button is clicked', () => {
    const mockContext = createMockDiceContext();

    cy.mount(
      <DiceContext.Provider value={mockContext as any}>
        <DicePanel />
      </DiceContext.Provider>,
    );

    cy.get('input#value').type('2d6+4');
    cy.contains('button', 'Roll').click();
    cy.get('@rollDice').should('have.been.calledWith', '2d6+4');
  });

  it('should disable Roll button when value is empty', () => {
    const mockContext = createMockDiceContext();

    cy.mount(
      <DiceContext.Provider value={mockContext as any}>
        <DicePanel />
      </DiceContext.Provider>,
    );

    cy.contains('button', 'Roll').should('be.disabled');
  });

  it('should disable Save and Roll button when label is empty', () => {
    const mockContext = createMockDiceContext();

    cy.mount(
      <DiceContext.Provider value={mockContext as any}>
        <DicePanel />
      </DiceContext.Provider>,
    );

    cy.get('input#value').type('2d6+4');
    cy.contains('button', 'Save and Roll').should('be.disabled');
  });

  it('should display saved rolls', () => {
    const mockContext = createMockDiceContext();

    cy.mount(
      <DiceContext.Provider value={mockContext as any}>
        <DicePanel />
      </DiceContext.Provider>,
    );

    cy.contains('Attack Roll').should('be.visible');
    cy.contains('Damage').should('be.visible');
  });

  it('should show rolling state', () => {
    const mockContext = createMockDiceContext({ isRolling: true });

    cy.mount(
      <DiceContext.Provider value={mockContext as any}>
        <DicePanel />
      </DiceContext.Provider>,
    );

    cy.contains('Rolling...').should('be.visible');
  });

  it('should display last result total', () => {
    const mockContext = createMockDiceContext({
      lastResult: {
        total: 15,
        notation: '2d6+4',
        segments: [{ type: 'dice', notation: '2d6', rolls: [3, 5], total: 8 }],
      },
    });

    cy.mount(
      <DiceContext.Provider value={mockContext as any}>
        <DicePanel />
      </DiceContext.Provider>,
    );

    cy.contains('15').should('be.visible');
  });

  it('should display last result segments', () => {
    const mockContext = createMockDiceContext({
      lastResult: {
        total: 15,
        notation: '2d6+4',
        segments: [
          { type: 'dice', notation: '2d6', rolls: [3, 5], total: 8 },
          { type: 'modifier', value: 4, total: 4 },
        ],
      },
    });

    cy.mount(
      <DiceContext.Provider value={mockContext as any}>
        <DicePanel />
      </DiceContext.Provider>,
    );

    cy.get('ul.list-disc').should('be.visible');
  });

  it('should show empty state for saved rolls', () => {
    // Mock with empty rolls
    cy.stub(require('@/lib/compass-api'), 'useDiceRolls').callsFake(() => ({
      diceRolls: [],
      createDiceRoll: cy.stub().resolves(),
      deleteDiceRoll: cy.stub(),
    }));

    const mockContext = createMockDiceContext();

    cy.mount(
      <DiceContext.Provider value={mockContext as any}>
        <DicePanel />
      </DiceContext.Provider>,
    );

    cy.contains('No saved rolls yet.').should('be.visible');
  });

  it('should disable Roll button when rolling', () => {
    const mockContext = createMockDiceContext({ isRolling: true });

    cy.mount(
      <DiceContext.Provider value={mockContext as any}>
        <DicePanel />
      </DiceContext.Provider>,
    );

    cy.get('input#value').type('2d6+4');
    cy.contains('button', 'Rolling…').should('be.disabled');
  });

  it('should have Saved rolls section', () => {
    const mockContext = createMockDiceContext();

    cy.mount(
      <DiceContext.Provider value={mockContext as any}>
        <DicePanel />
      </DiceContext.Provider>,
    );

    cy.contains('Saved rolls').should('be.visible');
  });

  it('should call createDiceRoll when Save and Roll is clicked', () => {
    const mockContext = createMockDiceContext();

    cy.mount(
      <DiceContext.Provider value={mockContext as any}>
        <DicePanel />
      </DiceContext.Provider>,
    );

    cy.get('input#label').type('Test Roll');
    cy.get('input#value').type('1d20');
    cy.contains('button', 'Save and Roll').click();
    cy.get('@createDiceRoll').should('have.been.calledWith', {
      label: 'Test Roll',
      value: '1d20',
    });
  });

  it('should reset value when panel closes', () => {
    const mockContext = createMockDiceContext({ dicePanelOpen: false });

    cy.mount(
      <DiceContext.Provider value={mockContext as any}>
        <DicePanel />
      </DiceContext.Provider>,
    );

    cy.get('@reset').should('have.been.called');
  });
});
