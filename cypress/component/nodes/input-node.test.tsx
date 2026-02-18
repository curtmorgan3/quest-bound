import { ViewInputNode } from '@/lib/compass-planes/nodes/components/input/input-node';
import { CharacterContext } from '@/stores';
import type { Component } from '@/types';

describe('InputNode Component', () => {
  const createInputComponent = (data: any, style: any = {}): Component => ({
    id: 'input-1',
    type: 'input',
    x: 0,
    y: 0,
    z: 1,
    rulesetId: '',
    rotation: 0,
    width: 200,
    height: 40,
    data: JSON.stringify(data),
    style: JSON.stringify({
      fontSize: 14,
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

  const createMockCharacterContext = (overrides: any = {}) => ({
    character: { id: 'char-1', name: 'Test Character' },
    characterAttributes: [],
    updateCharacterAttribute: cy.stub().as('updateCharacterAttribute'),
    updateCharacterComponentData: cy.stub().as('updateCharacterComponentData'),
    ...overrides,
  });

  it('should render text input and display value', () => {
    const component = createInputComponent({
      type: 'text',
      name: 'Character Name',
      value: 'Test Hero',
      characterAttributeId: 'attr-1',
    });

    const mockContext = createMockCharacterContext();

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewInputNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('input[type="text"]').should('have.value', 'Test Hero');
    cy.get('input[type="text"]').should('have.attr', 'placeholder', 'Character Name');
  });

  it('should update attribute on text input change', () => {
    const component = createInputComponent({
      type: 'text',
      name: 'Character Name',
      value: 'Test Hero',
      characterAttributeId: 'attr-1',
    });

    const mockContext = createMockCharacterContext();

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewInputNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('input[type="text"]').clear().type('New Hero');
    cy.get('@updateCharacterAttribute').should('have.been.calledWith', 'attr-1', {
      value: 'New Hero',
    });
  });

  it('should render number input with value', () => {
    const component = createInputComponent({
      type: 'number',
      name: 'Health Points',
      value: 50,
      min: 0,
      max: 100,
      characterAttributeId: 'attr-2',
    });

    const mockContext = createMockCharacterContext();

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewInputNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('input[type="number"]').should('have.value', '50');
  });

  it('should update attribute on number input change', () => {
    const component = createInputComponent({
      type: 'number',
      name: 'Health Points',
      value: 50,
      min: 0,
      max: 100,
      characterAttributeId: 'attr-2',
    });

    const mockContext = createMockCharacterContext();

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewInputNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('input[type="number"]').clear().type('75');
    cy.get('@updateCharacterAttribute').should('have.been.called');
  });

  it('should render select dropdown with options', () => {
    const component = createInputComponent({
      type: 'list',
      name: 'Character Class',
      value: 'Warrior',
      options: ['Warrior', 'Mage', 'Rogue', 'Cleric'],
      attributeType: 'list',
      allowMultiSelect: false,
      characterAttributeId: 'attr-3',
    });

    const mockContext = createMockCharacterContext();

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewInputNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('select').should('have.value', 'Warrior');
    cy.get('select option').should('have.length', 5); // including placeholder
    cy.get('select option').eq(1).should('have.text', 'Warrior');
    cy.get('select option').eq(2).should('have.text', 'Mage');
  });

  it('should update attribute on select change', () => {
    const component = createInputComponent({
      type: 'list',
      name: 'Character Class',
      value: 'Warrior',
      options: ['Warrior', 'Mage', 'Rogue', 'Cleric'],
      attributeType: 'list',
      allowMultiSelect: false,
      characterAttributeId: 'attr-3',
    });

    const mockContext = createMockCharacterContext();

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewInputNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('select').select('Mage');
    cy.get('@updateCharacterAttribute').should('have.been.calledWith', 'attr-3', {
      value: 'Mage',
    });
  });

  it('should render multi-select button for multi-select lists', () => {
    const component = createInputComponent({
      type: 'list',
      name: 'Skills',
      value: 'Swordsmanship;;Shield Bash',
      options: ['Swordsmanship', 'Shield Bash', 'Battle Cry', 'Intimidation'],
      attributeType: 'list',
      allowMultiSelect: true,
      characterAttributeId: 'attr-4',
    });

    const mockContext = createMockCharacterContext();

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewInputNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('button').should('contain', 'Swordsmanship, Shield Bash');
  });

  it('should open dialog for multi-select input', () => {
    const component = createInputComponent({
      type: 'list',
      name: 'Skills',
      value: 'Swordsmanship',
      options: ['Swordsmanship', 'Shield Bash', 'Battle Cry', 'Intimidation'],
      attributeType: 'list',
      allowMultiSelect: true,
      characterAttributeId: 'attr-4',
    });

    const mockContext = createMockCharacterContext();

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewInputNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('button').click();
    cy.get('[role="dialog"]').should('be.visible');
    cy.contains('Skills').should('be.visible');
  });

  it('should handle disabled state in edit mode', () => {
    const component = createInputComponent({
      type: 'text',
      name: 'Character Name',
      value: 'Test Hero',
      characterAttributeId: 'attr-1',
    });

    const mockContext = createMockCharacterContext();

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewInputNode component={component} editMode={true} />
      </CharacterContext.Provider>,
    );

    cy.get('input[type="text"]').should('be.disabled');
  });

  it('should apply custom styling', () => {
    const component = createInputComponent(
      {
        type: 'text',
        name: 'Styled Input',
        value: 'Test',
        characterAttributeId: 'attr-1',
      },
      {
        fontSize: 18,
        fontFamily: 'Georgia',
        color: '#0000ff',
        textAlign: 'center',
      },
    );

    const mockContext = createMockCharacterContext();

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewInputNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('input').should('have.css', 'font-size', '18px');
    cy.get('input').should('have.css', 'font-family', 'Georgia');
    cy.get('input').should('have.css', 'color', 'rgb(0, 0, 255)');
    cy.get('input').should('have.css', 'text-align', 'center');
  });

  it('should update component data when no characterAttributeId', () => {
    const component = createInputComponent({
      type: 'text',
      name: 'Component Data',
      value: 'Initial Value',
    });

    const mockContext = createMockCharacterContext();

    cy.mount(
      <CharacterContext.Provider value={mockContext as any}>
        <ViewInputNode component={component} />
      </CharacterContext.Provider>,
    );

    cy.get('input[type="text"]').clear().type('Updated Value');
    cy.get('@updateCharacterComponentData').should(
      'have.been.calledWith',
      'input-1',
      'Updated Value',
    );
  });
});
