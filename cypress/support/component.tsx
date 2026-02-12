// ***********************************************************
// This example support/component.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import '../../src/index.css';
import './commands';

import { mount } from 'cypress/react';
import { type ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';

// Custom mount function that wraps components with router
const mountWithRouter = (component: ReactNode, options?: any) => {
  return mount(<BrowserRouter>{component}</BrowserRouter>, options);
};

// Helper function to mount with providers (for components that need context)
const mountWithProviders = (component: ReactNode, providers: ReactNode[] = [], options?: any) => {
  let wrappedComponent = component;
  
  // Wrap with providers in reverse order (innermost first)
  providers.reverse().forEach(provider => {
    wrappedComponent = <>{provider}{wrappedComponent}</>;
  });
  
  return mount(<BrowserRouter>{wrappedComponent}</BrowserRouter>, options);
};

// Helper to create mock component with default structure
export const createMockComponent = (overrides: Partial<any> = {}) => {
  return {
    id: 'test-component-1',
    type: 'text',
    x: 0,
    y: 0,
    width: 200,
    height: 100,
    data: '{}',
    style: '{}',
    locked: false,
    ...overrides,
  };
};

// Helper to create mock character context
export const createMockCharacterContext = (overrides: Partial<any> = {}) => {
  return {
    character: {
      id: 'test-char-1',
      name: 'Test Character',
      rulesetId: 'test-ruleset-1',
      userId: 'test-user-1',
    },
    characterAttributes: [],
    inventoryItems: [],
    getCharacterAttribute: cy.stub(),
    updateCharacterAttribute: cy.stub(),
    updateCharacterComponentData: cy.stub(),
    updateInventoryItem: cy.stub(),
    removeInventoryItem: cy.stub(),
    addInventoryItem: cy.stub(),
    setInventoryPanelConfig: cy.stub(),
    ...overrides,
  };
};

// Helper to create mock window editor context
export const createMockWindowEditorContext = (components: any[] = []) => {
  const componentsMap = new Map(components.map(c => [c.id, c]));
  
  return {
    components,
    getComponent: (id: string) => componentsMap.get(id),
    updateComponent: cy.stub(),
    addComponent: cy.stub(),
    deleteComponent: cy.stub(),
  };
};

// Type definitions are handled in component.d.ts

Cypress.Commands.add('mount', mountWithRouter);
Cypress.Commands.add('mountWithProviders', mountWithProviders);

before(() => {
  localStorage.setItem('qb.env', 'test');
});

// Example use:
// cy.mount(<MyComponent />)
// cy.mountWithProviders(<MyComponent />, [<SomeProvider />])
