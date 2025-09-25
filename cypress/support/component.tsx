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

// Type definitions are handled in component.d.ts

Cypress.Commands.add('mount', mountWithRouter);

before(() => {
  localStorage.setItem('qb.env', 'test');
});

// Example use:
// cy.mount(<MyComponent />)
