export const GAME_MODE = import.meta.env.VITE_GAME_MODE === 'true';
export const GAME_ID = import.meta.env.VITE_GAME_ID ?? '';
export const EDIT_MODE = import.meta.env.VITE_EDIT_MODE !== 'false';
export const GAME_NAME = import.meta.env.VITE_GAME_NAME ?? '';
export const GAME_SHORT_NAME = import.meta.env.VITE_GAME_SHORT_NAME ?? '';
export const GAME_DESCRIPTION = import.meta.env.VITE_GAME_DESCRIPTION ?? '';
export const GAME_THEME_COLOR = import.meta.env.VITE_GAME_THEME_COLOR ?? '#000000';
