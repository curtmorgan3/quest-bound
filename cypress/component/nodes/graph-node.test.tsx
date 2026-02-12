import { ViewGraphNode } from '@/lib/compass-planes/nodes/components/graph/graph-node';
import { CharacterContext } from '@/stores';
import type { Component } from '@/types';

describe('GraphNode Component', () => {
  const createGraphComponent = (data: any, style: any = {}): Component => ({
    id: 'graph-1',
    type: 'graph',
    x: 0,
    y: 0,
    z: 1,
    rulesetId: '',
    rotation: 0,
    width: 200,
    height: 40,
    data: JSON.stringify(data),
    style: JSON.stringify({
      color: '#7BA3C7',
      backgroundColor: '#e0e0e0',
      borderRadius: '4px',
      ...style,
    }),
    locked: false,
    windowId: 'window-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const createMockCharacterContext = (attributes: any[] = []) => ({
    character: { id: 'char-1', name: 'Test Character' },
    characterAttributes: attributes,
    getCharacterAttribute: (id: string) => attributes.find((a) => a.id === id),
    updateCharacterAttribute: cy.stub(),
    ...({} as any),
  });

  it('should render horizontal linear progress bar', () => {
    const component = createGraphComponent({
      graphVariant: 'horizontal-linear',
      numeratorAttributeId: 'attr-hp',
      denominatorAttributeId: 'attr-max-hp',
    });

    const mockContext = createMockCharacterContext([
      { id: 'attr-hp', value: 50 },
      { id: 'attr-max-hp', value: 100 },
    ]);

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewGraphNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('div').first().should('have.css', 'width', '200px');
    cy.get('div').first().should('have.css', 'height', '40px');
  });

  it('should render vertical linear progress bar', () => {
    const component = createGraphComponent({
      graphVariant: 'vertical-linear',
      numeratorAttributeId: 'attr-hp',
      denominatorAttributeId: 'attr-max-hp',
    });

    const mockContext = createMockCharacterContext([
      { id: 'attr-hp', value: 75 },
      { id: 'attr-max-hp', value: 100 },
    ]);

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewGraphNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('div').first().should('have.css', 'width', '200px');
    cy.get('div').first().should('have.css', 'height', '40px');
    cy.get('div').first().should('have.css', 'position', 'relative');
  });

  it('should render circular progress indicator', () => {
    const component = createGraphComponent({
      graphVariant: 'circular',
      numeratorAttributeId: 'attr-hp',
      denominatorAttributeId: 'attr-max-hp',
    });

    const mockContext = createMockCharacterContext([
      { id: 'attr-hp', value: 60 },
      { id: 'attr-max-hp', value: 100 },
    ]);

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewGraphNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('svg').should('exist');
    cy.get('circle').should('have.length', 2); // Background and fill circles
  });

  it('should calculate percentage correctly for 50%', () => {
    const component = createGraphComponent({
      graphVariant: 'horizontal-linear',
      numeratorAttributeId: 'attr-hp',
      denominatorAttributeId: 'attr-max-hp',
    });

    const mockContext = createMockCharacterContext([
      { id: 'attr-hp', value: 50 },
      { id: 'attr-max-hp', value: 100 },
    ]);

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewGraphNode component={component} />
      </CharacterContext.Provider>,
    );

    // The fill div should be 50% width
    cy.get('div').eq(1).should('have.css', 'width').and('match', /50%/);
  });

  it('should handle 100% fill', () => {
    const component = createGraphComponent({
      graphVariant: 'horizontal-linear',
      numeratorAttributeId: 'attr-hp',
      denominatorAttributeId: 'attr-max-hp',
    });

    const mockContext = createMockCharacterContext([
      { id: 'attr-hp', value: 100 },
      { id: 'attr-max-hp', value: 100 },
    ]);

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewGraphNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('div').eq(1).should('have.css', 'width').and('match', /100%/);
  });

  it('should handle zero values', () => {
    const component = createGraphComponent({
      graphVariant: 'horizontal-linear',
      numeratorAttributeId: 'attr-hp',
      denominatorAttributeId: 'attr-max-hp',
    });

    const mockContext = createMockCharacterContext([
      { id: 'attr-hp', value: 0 },
      { id: 'attr-max-hp', value: 100 },
    ]);

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewGraphNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('div').eq(1).should('have.css', 'width').and('match', /0%/);
  });

  it('should handle denominator of zero gracefully', () => {
    const component = createGraphComponent({
      graphVariant: 'horizontal-linear',
      numeratorAttributeId: 'attr-hp',
      denominatorAttributeId: 'attr-max-hp',
    });

    const mockContext = createMockCharacterContext([
      { id: 'attr-hp', value: 50 },
      { id: 'attr-max-hp', value: 0 },
    ]);

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewGraphNode component={component} />
      </CharacterContext.Provider>,
    );

    // Should render without error and show 0%
    cy.get('div').first().should('exist');
  });

  it('should apply custom colors', () => {
    const component = createGraphComponent(
      {
        graphVariant: 'horizontal-linear',
        numeratorAttributeId: 'attr-hp',
        denominatorAttributeId: 'attr-max-hp',
      },
      {
        color: '#ff0000',
        backgroundColor: '#cccccc',
      },
    );

    const mockContext = createMockCharacterContext([
      { id: 'attr-hp', value: 50 },
      { id: 'attr-max-hp', value: 100 },
    ]);

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewGraphNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('div').first().should('have.css', 'background-color', 'rgb(204, 204, 204)');
    cy.get('div').eq(1).should('have.css', 'background-color', 'rgb(255, 0, 0)');
  });

  it('should clamp values above 100%', () => {
    const component = createGraphComponent({
      graphVariant: 'horizontal-linear',
      numeratorAttributeId: 'attr-hp',
      denominatorAttributeId: 'attr-max-hp',
    });

    const mockContext = createMockCharacterContext([
      { id: 'attr-hp', value: 150 },
      { id: 'attr-max-hp', value: 100 },
    ]);

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewGraphNode component={component} />
      </CharacterContext.Provider>,
    );

    // Should be clamped to 100%
    cy.get('div').eq(1).should('have.css', 'width').and('match', /100%/);
  });

  it('should handle missing attributes gracefully', () => {
    const component = createGraphComponent({
      graphVariant: 'horizontal-linear',
      numeratorAttributeId: 'attr-missing',
      denominatorAttributeId: 'attr-also-missing',
    });

    const mockContext = createMockCharacterContext([]);

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewGraphNode component={component} />
      </CharacterContext.Provider>,
    );

    // Should render without error
    cy.get('div').first().should('exist');
  });

  it('should apply border radius styling', () => {
    const component = createGraphComponent(
      {
        graphVariant: 'horizontal-linear',
        numeratorAttributeId: 'attr-hp',
        denominatorAttributeId: 'attr-max-hp',
      },
      {
        borderRadius: '12px',
      },
    );

    const mockContext = createMockCharacterContext([
      { id: 'attr-hp', value: 50 },
      { id: 'attr-max-hp', value: 100 },
    ]);

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewGraphNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('div').first().should('have.css', 'border-radius', '12px');
  });
});
