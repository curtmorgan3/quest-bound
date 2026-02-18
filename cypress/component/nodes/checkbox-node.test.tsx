import { ViewCheckboxNode } from '@/lib/compass-planes/nodes/components/checkbox/checkbox-node';
import { CharacterContext } from '@/stores';
import type { Component } from '@/types';

// Mock the useAssets hook
const mockUseAssets = () => ({ assets: [] });
cy.stub(require('@/lib/compass-api'), 'useAssets').callsFake(mockUseAssets);

describe('CheckboxNode Component', () => {
  const createCheckboxComponent = (data: any, style: any = {}): Component => ({
    id: 'checkbox-1',
    type: 'checkbox',
    x: 0,
    y: 0,
    z: 1,
    rulesetId: '',
    rotation: 0,
    width: 40,
    height: 40,
    data: JSON.stringify(data),
    style: JSON.stringify({
      color: '#000000',
      textAlign: 'center',
      verticalAlign: 'center',
      backgroundColor: 'transparent',
      ...style,
    }),
    locked: false,
    windowId: 'window-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const createMockCharacterContext = (overrides: any = {}) => ({
    character: { id: 'char-1', name: 'Test Character' },
    characterAttributes: [],
    getCharacterAttribute: cy.stub().returns({ value: false }),
    updateCharacterAttribute: cy.stub().as('updateCharacterAttribute'),
    updateCharacterComponentData: cy.stub().as('updateCharacterComponentData'),
    ...overrides,
  });

  it('should render unchecked state for false attribute', () => {
    const component = createCheckboxComponent({
      value: false,
      characterAttributeId: 'attr-1',
    });

    const mockContext = createMockCharacterContext();

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewCheckboxNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('section').should('exist');
    cy.get('svg').should('exist'); // Default unchecked icon (SquareIcon)
  });

  it('should render checked state for true attribute', () => {
    const component = createCheckboxComponent({
      value: true,
      characterAttributeId: 'attr-1',
    });

    const mockContext = createMockCharacterContext();

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewCheckboxNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('section').should('exist');
    cy.get('svg').should('exist'); // Default checked icon (CheckIcon)
  });

  it('should toggle attribute value on click', () => {
    const component = createCheckboxComponent({
      value: false,
      characterAttributeId: 'attr-1',
    });

    const mockContext = createMockCharacterContext();

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewCheckboxNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('section').click();
    cy.get('@updateCharacterAttribute').should('have.been.calledWith', 'attr-1', {
      value: true,
    });
  });

  it('should toggle from checked to unchecked', () => {
    const component = createCheckboxComponent({
      value: true,
      characterAttributeId: 'attr-1',
    });

    const mockContext = createMockCharacterContext();

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewCheckboxNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('section').click();
    cy.get('@updateCharacterAttribute').should('have.been.calledWith', 'attr-1', {
      value: false,
    });
  });

  it('should handle disabled state in edit mode', () => {
    const component = createCheckboxComponent({
      value: false,
      characterAttributeId: 'attr-1',
    });

    const mockContext = createMockCharacterContext();

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewCheckboxNode component={component} editMode={true} />
      </CharacterContext.Provider>,
    );

    cy.get('section').should('have.css', 'pointer-events', 'none');
    cy.get('section').should('have.css', 'cursor', 'default');
  });

  it('should apply custom styling', () => {
    const component = createCheckboxComponent(
      {
        value: false,
        characterAttributeId: 'attr-1',
      },
      {
        backgroundColor: '#f0f0f0',
        borderRadius: '8px',
        color: '#ff0000',
      },
    );

    const mockContext = createMockCharacterContext();

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewCheckboxNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('section').should('have.css', 'background-color', 'rgb(240, 240, 240)');
    cy.get('section').should('have.css', 'border-radius', '8px');
    cy.get('svg').should('have.css', 'color', 'rgb(255, 0, 0)');
  });

  it('should update component data when no characterAttributeId', () => {
    const component = createCheckboxComponent({
      value: false,
    });

    const mockContext = createMockCharacterContext();

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewCheckboxNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('section').click();
    cy.get('@updateCharacterComponentData').should('have.been.calledWith', 'checkbox-1', true);
  });

  it('should display custom checked image when provided', () => {
    const component = createCheckboxComponent({
      value: true,
      characterAttributeId: 'attr-1',
      checkedAssetUrl: 'https://example.com/checked.png',
    });

    const mockContext = createMockCharacterContext();

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewCheckboxNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('img').should('have.attr', 'src', 'https://example.com/checked.png');
  });

  it('should display custom unchecked image when provided', () => {
    const component = createCheckboxComponent({
      value: false,
      characterAttributeId: 'attr-1',
      uncheckedAssetUrl: 'https://example.com/unchecked.png',
    });

    const mockContext = createMockCharacterContext();

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewCheckboxNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('img').should('have.attr', 'src', 'https://example.com/unchecked.png');
  });

  it('should always show unchecked in edit mode', () => {
    const component = createCheckboxComponent({
      value: true,
      characterAttributeId: 'attr-1',
    });

    const mockContext = createMockCharacterContext();

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewCheckboxNode component={component} editMode={true} />
      </CharacterContext.Provider>,
    );

    // In edit mode, isChecked is always false
    cy.get('svg').should('exist'); // Should show unchecked icon
  });
});
