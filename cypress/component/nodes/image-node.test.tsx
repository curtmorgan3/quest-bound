import { ViewImageNode } from '@/lib/compass-planes/nodes/components/image/image-node';
import { CharacterContext } from '@/stores';
import type { Component } from '@/types';

// Mock the useAssets hook
const mockUseAssets = () => ({ assets: [] });
cy.stub(require('@/lib/compass-api'), 'useAssets').callsFake(mockUseAssets);

describe('ImageNode Component', () => {
  const createImageComponent = (data: any, style: any = {}): Component => ({
    id: 'image-1',
    type: 'image',
    x: 0,
    y: 0,
    width: 200,
    z: 1,
    rulesetId: '',
    rotation: 0,
    height: 200,
    data: JSON.stringify(data),
    style: JSON.stringify({
      backgroundColor: 'transparent',
      borderRadius: '0px',
      ...style,
    }),
    locked: false,
    windowId: 'window-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const createMockCharacterContext = (overrides: any = {}) => ({
    character: { id: 'char-1', name: 'Test Character', image: null },
    ...overrides,
  });

  it('should display image from asset URL', () => {
    const component = createImageComponent({
      assetUrl: 'https://example.com/image.png',
    });

    const mockContext = createMockCharacterContext();

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewImageNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('img').should('have.attr', 'src', 'https://example.com/image.png');
  });

  it('should handle missing image gracefully', () => {
    const component = createImageComponent({});

    const mockContext = createMockCharacterContext();

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewImageNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('img').should('not.exist');
  });

  it('should apply sizing (width, height)', () => {
    const component = createImageComponent({
      assetUrl: 'https://example.com/image.png',
    });

    const mockContext = createMockCharacterContext();

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewImageNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('img').should('have.css', 'width', '200px');
    cy.get('img').should('have.css', 'height', '200px');
  });

  it('should apply border radius styling', () => {
    const component = createImageComponent(
      {
        assetUrl: 'https://example.com/image.png',
      },
      {
        borderRadius: '12px',
      },
    );

    const mockContext = createMockCharacterContext();

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewImageNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('img').should('have.css', 'border-radius', '12px');
  });

  it('should use character image when useCharacterImage is true', () => {
    const component = createImageComponent({
      assetUrl: 'https://example.com/default.png',
      useCharacterImage: true,
    });

    const mockContext = createMockCharacterContext({
      character: {
        id: 'char-1',
        name: 'Test Character',
        image: 'https://example.com/character.png',
      },
    });

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewImageNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('img').should('have.attr', 'src', 'https://example.com/character.png');
  });

  it('should fall back to component image when character has no image', () => {
    const component = createImageComponent({
      assetUrl: 'https://example.com/default.png',
      useCharacterImage: true,
    });

    const mockContext = createMockCharacterContext({
      character: {
        id: 'char-1',
        name: 'Test Character',
        image: null,
      },
    });

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewImageNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('img').should('have.attr', 'src', 'https://example.com/default.png');
  });

  it('should apply object-fit cover', () => {
    const component = createImageComponent({
      assetUrl: 'https://example.com/image.png',
    });

    const mockContext = createMockCharacterContext();

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewImageNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('img').should('have.css', 'object-fit', 'cover');
  });

  it('should not be draggable', () => {
    const component = createImageComponent({
      assetUrl: 'https://example.com/image.png',
    });

    const mockContext = createMockCharacterContext();

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewImageNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('img').should('have.attr', 'draggable', 'false');
  });

  it('should apply opacity from style', () => {
    const component = createImageComponent(
      {
        assetUrl: 'https://example.com/image.png',
      },
      {
        opacity: 0.5,
      },
    );

    const mockContext = createMockCharacterContext();

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewImageNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('img').should('have.css', 'opacity', '0.5');
  });
});
