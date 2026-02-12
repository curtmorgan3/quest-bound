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

// Type definitions are handled in component.d.ts

Cypress.Commands.add('mount', mountWithRouter);
Cypress.Commands.add('mountWithProviders', mountWithProviders);

before(() => {
  localStorage.setItem('qb.env', 'test');
});

// Example use:
// cy.mount(<MyComponent />)
// cy.mountWithProviders(<MyComponent />, [<SomeProvider />])
