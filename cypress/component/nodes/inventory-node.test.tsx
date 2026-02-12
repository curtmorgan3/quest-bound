import { ViewInventoryNode } from '@/lib/compass-planes/nodes/components/inventory/inventory-node';
import { CharacterContext } from '@/stores';
import type { Component } from '@/types';

describe('InventoryNode Component', () => {
  const createInventoryComponent = (data: any, style: any = {}): Component => ({
    id: 'inventory-1',
    type: 'inventory',
    x: 0,
    y: 0,
    z: 1,
    rulesetId: '',
    rotation: 0,
    width: 400,
    height: 300,
    data: JSON.stringify({
      cellWidth: 1,
      cellHeight: 1,
      showItemAs: 'image',
      ...data,
    }),
    style: JSON.stringify({
      backgroundColor: '#f5f5f5',
      color: '#cccccc',
      outlineWidth: 1,
      ...style,
    }),
    locked: false,
    windowId: 'window-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const createMockCharacterContext = (inventoryItems: any[] = []) => ({
    character: { id: 'char-1', name: 'Test Character' },
    inventoryItems,
    updateInventoryItem: cy.stub().as('updateInventoryItem'),
    removeInventoryItem: cy.stub().as('removeInventoryItem'),
    addInventoryItem: cy.stub().as('addInventoryItem'),
    setInventoryPanelConfig: cy.stub().as('setInventoryPanelConfig'),
  });

  it('should render inventory grid', () => {
    const component = createInventoryComponent({});
    const mockContext = createMockCharacterContext();

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewInventoryNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('div').first().should('have.css', 'width', '400px');
    cy.get('div').first().should('have.css', 'height', '300px');
    cy.get('div').first().should('have.css', 'background-color', 'rgb(245, 245, 245)');
  });

  it('should display items in correct positions', () => {
    const component = createInventoryComponent({});
    const mockContext = createMockCharacterContext([
      {
        id: 'item-1',
        componentId: 'inventory-1',
        title: 'Health Potion',
        image: 'https://example.com/potion.png',
        x: 0,
        y: 0,
        inventoryWidth: 1,
        inventoryHeight: 1,
        quantity: 1,
      },
      {
        id: 'item-2',
        componentId: 'inventory-1',
        title: 'Sword',
        image: 'https://example.com/sword.png',
        x: 2,
        y: 1,
        inventoryWidth: 1,
        inventoryHeight: 2,
        quantity: 1,
      },
    ]);

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewInventoryNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('div[role="button"]').should('have.length', 2);
    cy.get('img[alt="Health Potion"]').should('exist');
    cy.get('img[alt="Sword"]').should('exist');
  });

  it('should display item quantities when > 1', () => {
    const component = createInventoryComponent({});
    const mockContext = createMockCharacterContext([
      {
        id: 'item-1',
        componentId: 'inventory-1',
        title: 'Health Potion',
        image: 'https://example.com/potion.png',
        x: 0,
        y: 0,
        inventoryWidth: 1,
        inventoryHeight: 1,
        quantity: 5,
      },
    ]);

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewInventoryNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.contains('5').should('be.visible');
  });

  it('should not display quantity badge when quantity is 1', () => {
    const component = createInventoryComponent({});
    const mockContext = createMockCharacterContext([
      {
        id: 'item-1',
        componentId: 'inventory-1',
        title: 'Health Potion',
        image: 'https://example.com/potion.png',
        x: 0,
        y: 0,
        inventoryWidth: 1,
        inventoryHeight: 1,
        quantity: 1,
      },
    ]);

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewInventoryNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('span').contains('1').should('not.exist');
  });

  it('should show empty slots', () => {
    const component = createInventoryComponent({});
    const mockContext = createMockCharacterContext([]);

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewInventoryNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('div').first().should('exist');
    cy.get('div[role="button"]').should('not.exist');
  });

  it('should handle items with different sizes', () => {
    const component = createInventoryComponent({});
    const mockContext = createMockCharacterContext([
      {
        id: 'item-1',
        componentId: 'inventory-1',
        title: 'Small Item',
        image: 'https://example.com/small.png',
        x: 0,
        y: 0,
        inventoryWidth: 1,
        inventoryHeight: 1,
        quantity: 1,
      },
      {
        id: 'item-2',
        componentId: 'inventory-1',
        title: 'Large Item',
        image: 'https://example.com/large.png',
        x: 2,
        y: 0,
        inventoryWidth: 2,
        inventoryHeight: 2,
        quantity: 1,
      },
    ]);

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewInventoryNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('div[role="button"]').should('have.length', 2);
    cy.get('div[role="button"]').eq(0).should('have.css', 'width', '20px');
    cy.get('div[role="button"]').eq(0).should('have.css', 'height', '20px');
    cy.get('div[role="button"]').eq(1).should('have.css', 'width', '40px');
    cy.get('div[role="button"]').eq(1).should('have.css', 'height', '40px');
  });

  it('should show item title when showItemAs is title', () => {
    const component = createInventoryComponent({
      showItemAs: 'title',
    });
    const mockContext = createMockCharacterContext([
      {
        id: 'item-1',
        componentId: 'inventory-1',
        title: 'Health Potion',
        image: 'https://example.com/potion.png',
        x: 0,
        y: 0,
        inventoryWidth: 1,
        inventoryHeight: 1,
        quantity: 1,
      },
    ]);

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewInventoryNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.contains('Health Potion').should('be.visible');
    cy.get('img[alt="Health Potion"]').should('not.exist');
  });

  it('should open inventory panel on double click', () => {
    const component = createInventoryComponent({});
    const mockContext = createMockCharacterContext();

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewInventoryNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('div').first().dblclick();
    cy.get('@setInventoryPanelConfig').should('have.been.calledOnce');
  });

  it('should filter items by component ID', () => {
    const component = createInventoryComponent({});
    const mockContext = createMockCharacterContext([
      {
        id: 'item-1',
        componentId: 'inventory-1',
        title: 'Item 1',
        image: 'https://example.com/item1.png',
        x: 0,
        y: 0,
        inventoryWidth: 1,
        inventoryHeight: 1,
        quantity: 1,
      },
      {
        id: 'item-2',
        componentId: 'other-inventory',
        title: 'Item 2',
        image: 'https://example.com/item2.png',
        x: 0,
        y: 0,
        inventoryWidth: 1,
        inventoryHeight: 1,
        quantity: 1,
      },
    ]);

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewInventoryNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('div[role="button"]').should('have.length', 1);
    cy.get('img[alt="Item 1"]').should('exist');
    cy.get('img[alt="Item 2"]').should('not.exist');
  });

  it('should apply opacity to disabled items', () => {
    const component = createInventoryComponent({});
    const mockContext = createMockCharacterContext([
      {
        id: 'item-1',
        componentId: 'inventory-1',
        title: 'Disabled Item',
        image: 'https://example.com/item.png',
        x: 0,
        y: 0,
        inventoryWidth: 1,
        inventoryHeight: 1,
        quantity: 1,
        value: false,
      },
    ]);

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewInventoryNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('img').should('have.css', 'opacity', '0.3');
  });

  it('should have grab cursor on items', () => {
    const component = createInventoryComponent({});
    const mockContext = createMockCharacterContext([
      {
        id: 'item-1',
        componentId: 'inventory-1',
        title: 'Item',
        image: 'https://example.com/item.png',
        x: 0,
        y: 0,
        inventoryWidth: 1,
        inventoryHeight: 1,
        quantity: 1,
      },
    ]);

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewInventoryNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('div[role="button"]').should('have.css', 'cursor', 'grab');
  });
});
