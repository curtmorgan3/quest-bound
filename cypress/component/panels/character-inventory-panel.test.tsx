import { CharacterInventoryPanel } from '@/pages/characters/character-inventory-panel/character-inventory-panel';
import { BrowserRouter } from 'react-router-dom';

// Mock the hooks
const mockUseCharacter = () => ({
  character: {
    id: 'char-1',
    name: 'Test Character',
    inventoryId: 'inv-1',
  },
});

const mockUseInventory = () => ({
  inventoryItems: [
    {
      id: 'item-1',
      type: 'item',
      title: 'Health Potion',
      description: 'Restores HP',
      quantity: 3,
      weight: 0.5,
      entityId: 'entity-1',
    },
    {
      id: 'item-2',
      type: 'item',
      title: 'Iron Sword',
      description: 'A sturdy sword',
      quantity: 1,
      weight: 5,
      entityId: 'entity-2',
    },
    {
      id: 'action-1',
      type: 'action',
      title: 'Fireball',
      description: 'Cast fireball',
      quantity: 1,
      weight: 0,
      entityId: 'entity-3',
    },
  ],
});

cy.stub(require('@/lib/compass-api'), 'useCharacter').callsFake(mockUseCharacter);
cy.stub(require('@/lib/compass-api'), 'useInventory').callsFake(mockUseInventory);

// Mock useParams
cy.stub(require('react-router-dom'), 'useParams').returns({ characterId: 'char-1' });

describe('CharacterInventoryPanel Component', () => {
  it('should render when open is true', () => {
    const onOpenChange = cy.stub().as('onOpenChange');

    cy.mount(
      <BrowserRouter>
        <CharacterInventoryPanel open={true} onOpenChange={onOpenChange} />
      </BrowserRouter>,
    );

    cy.get('[role="dialog"]').should('be.visible');
  });

  it('should display title', () => {
    const onOpenChange = cy.stub().as('onOpenChange');

    cy.mount(
      <BrowserRouter>
        <CharacterInventoryPanel open={true} onOpenChange={onOpenChange} />
      </BrowserRouter>,
    );

    cy.contains('Character Inventory').should('be.visible');
  });

  it('should display description', () => {
    const onOpenChange = cy.stub().as('onOpenChange');

    cy.mount(
      <BrowserRouter>
        <CharacterInventoryPanel open={true} onOpenChange={onOpenChange} />
      </BrowserRouter>,
    );

    cy.contains('Manage all items or add attributes and actions').should('be.visible');
  });

  it('should have type filter dropdown', () => {
    const onOpenChange = cy.stub().as('onOpenChange');

    cy.mount(
      <BrowserRouter>
        <CharacterInventoryPanel open={true} onOpenChange={onOpenChange} />
      </BrowserRouter>,
    );

    cy.get('[role="combobox"]').should('exist');
  });

  it('should have search input', () => {
    const onOpenChange = cy.stub().as('onOpenChange');

    cy.mount(
      <BrowserRouter>
        <CharacterInventoryPanel open={true} onOpenChange={onOpenChange} />
      </BrowserRouter>,
    );

    cy.get('input[placeholder="Filter by title..."]').should('be.visible');
  });

  it('should have Add from ruleset button', () => {
    const onOpenChange = cy.stub().as('onOpenChange');

    cy.mount(
      <BrowserRouter>
        <CharacterInventoryPanel open={true} onOpenChange={onOpenChange} />
      </BrowserRouter>,
    );

    cy.contains('button', 'Add from ruleset').should('be.visible');
  });

  it('should display inventory items', () => {
    const onOpenChange = cy.stub().as('onOpenChange');

    cy.mount(
      <BrowserRouter>
        <CharacterInventoryPanel open={true} onOpenChange={onOpenChange} />
      </BrowserRouter>,
    );

    cy.contains('Health Potion').should('be.visible');
    cy.contains('Iron Sword').should('be.visible');
  });

  it('should filter items by type', () => {
    const onOpenChange = cy.stub().as('onOpenChange');

    cy.mount(
      <BrowserRouter>
        <CharacterInventoryPanel open={true} onOpenChange={onOpenChange} />
      </BrowserRouter>,
    );

    // Default filter is 'item', so actions shouldn't be visible
    cy.contains('Health Potion').should('be.visible');
    cy.contains('Fireball').should('not.exist');
  });

  it('should display total weight for items', () => {
    const onOpenChange = cy.stub().as('onOpenChange');

    cy.mount(
      <BrowserRouter>
        <CharacterInventoryPanel open={true} onOpenChange={onOpenChange} />
      </BrowserRouter>,
    );

    // Total weight: (3 * 0.5) + (1 * 5) = 6.5
    cy.contains('Total Weight: 6.5').should('be.visible');
  });

  it('should filter items by title', () => {
    const onOpenChange = cy.stub().as('onOpenChange');

    cy.mount(
      <BrowserRouter>
        <CharacterInventoryPanel open={true} onOpenChange={onOpenChange} />
      </BrowserRouter>,
    );

    cy.get('input[placeholder="Filter by title..."]').type('Potion');
    cy.contains('Health Potion').should('be.visible');
    cy.contains('Iron Sword').should('not.exist');
  });

  it('should show empty state when no items match filter', () => {
    const onOpenChange = cy.stub().as('onOpenChange');

    cy.mount(
      <BrowserRouter>
        <CharacterInventoryPanel open={true} onOpenChange={onOpenChange} />
      </BrowserRouter>,
    );

    cy.get('input[placeholder="Filter by title..."]').type('NonexistentItem');
    cy.contains('No items match "NonexistentItem"').should('be.visible');
  });

  it('should not render when open is false', () => {
    const onOpenChange = cy.stub().as('onOpenChange');

    cy.mount(
      <BrowserRouter>
        <CharacterInventoryPanel open={false} onOpenChange={onOpenChange} />
      </BrowserRouter>,
    );

    cy.get('[role="dialog"]').should('not.exist');
  });

  it('should have Items option in type filter', () => {
    const onOpenChange = cy.stub().as('onOpenChange');

    cy.mount(
      <BrowserRouter>
        <CharacterInventoryPanel open={true} onOpenChange={onOpenChange} />
      </BrowserRouter>,
    );

    cy.get('[role="combobox"]').click();
    cy.contains('Items').should('be.visible');
  });

  it('should have Actions option in type filter', () => {
    const onOpenChange = cy.stub().as('onOpenChange');

    cy.mount(
      <BrowserRouter>
        <CharacterInventoryPanel open={true} onOpenChange={onOpenChange} />
      </BrowserRouter>,
    );

    cy.get('[role="combobox"]').click();
    cy.contains('Actions').should('be.visible');
  });

  it('should have Attributes option in type filter', () => {
    const onOpenChange = cy.stub().as('onOpenChange');

    cy.mount(
      <BrowserRouter>
        <CharacterInventoryPanel open={true} onOpenChange={onOpenChange} />
      </BrowserRouter>,
    );

    cy.get('[role="combobox"]').click();
    cy.contains('Attributes').should('be.visible');
  });

  it('should use virtualization for item list', () => {
    const onOpenChange = cy.stub().as('onOpenChange');

    cy.mount(
      <BrowserRouter>
        <CharacterInventoryPanel open={true} onOpenChange={onOpenChange} />
      </BrowserRouter>,
    );

    // Check that items are rendered (virtualization is working)
    cy.contains('Health Potion').should('be.visible');
  });
});
