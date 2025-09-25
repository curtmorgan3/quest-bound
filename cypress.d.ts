/// <reference types="cypress" />

import { ReactNode } from 'react';

declare global {
  namespace Cypress {
    interface Chainable {
      mount(component: ReactNode, options?: any): Chainable<Element>;
    }
  }
}
