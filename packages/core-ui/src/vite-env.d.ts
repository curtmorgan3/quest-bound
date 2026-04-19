/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set by qb-bundler Vite `define` for the static ruleset bundle shell. */
  readonly VITE_QB_BUNDLE?: string;
}
