/// <reference types="cypress" />

import { MountReturn } from 'cypress/react';
import { ReactNode } from 'react';

declare global {
  namespace Cypress {
    interface Chainable {
      mount(component: ReactNode, options?: any): Chainable<MountReturn>;
    }
  }
}
