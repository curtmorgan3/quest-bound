/// <reference types="vite/client" />
/// <reference types="cypress" />

interface ImportMetaEnv {
  /** Set to `"1"` in qb-bundler static builds (trimmed app shell). */
  readonly VITE_QB_BUNDLE?: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_PLAUSIBLE_DOMAIN?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Set to `"true"` in game mode builds (single-ruleset deployment). */
  readonly VITE_GAME_MODE?: string;
  /** UUID of the `games` table row for this deployment. Used to check game authorization. */
  readonly VITE_GAME_ID?: string;
  /** Subdomain slug for this deployment, e.g. `dnd` → `dnd.questbound.com`. */
  readonly VITE_GAME_SLUG?: string;
  /** Set to `"false"` to restrict game mode to landing, /characters, and /campaigns only. Defaults to true. */
  readonly VITE_EDIT_MODE?: string;
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

declare global {
  /** File System Access API — directory permissions and picker (Chromium). */
  interface FileSystemDirectoryHandle {
    queryPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
    requestPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
  }

  interface Window {
    showDirectoryPicker(options?: {
      id?: string;
      mode?: 'read' | 'readwrite';
      startIn?: FileSystemHandle | FileSystemDirectoryHandle;
    }): Promise<FileSystemDirectoryHandle>;
  }
}

// Export the types to make them available globally
export {};
