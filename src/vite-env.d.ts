/// <reference types="vite/client" />
/// <reference types="cypress" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  readonly VITE_APP_VERSION: string;
  readonly VITE_PLAUSIBLE_DOMAIN?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

declare namespace Cypress {
  interface Chainable {
    /**
     * Custom command to select DOM element by data-cy attribute.
     * @example cy.dataCy('greeting')
     */
    dataCy(value: string): Chainable<JQuery<HTMLElement>>;

    /**
     * Custom command to login a user
     * @example cy.login('user@example.com', 'password')
     */
    login(email: string, password: string): Chainable<void>;

    /**
     * Custom command to wait for API calls to complete
     * @example cy.waitForApi()
     */
    waitForApi(): Chainable<void>;

    /**
     * Mount command for component testing
     */
    mount: typeof import('cypress/react18').mount;
  }
}
// Export the types to make them available globally
export {};
