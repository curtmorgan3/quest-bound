/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set by qb-bundler Vite `define` for the static ruleset bundle shell. */
  readonly VITE_QB_BUNDLE?: string;
  /** Set to `"true"` in game mode builds (single-ruleset deployment). */
  readonly VITE_GAME_MODE?: string;
  /** Set to `"false"` to restrict game mode to play-only routes. */
  readonly VITE_EDIT_MODE?: string;
}
