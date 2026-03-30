import { createContext, useContext } from 'react';

export type WindowCanvasSelectionContextValue = {
  selectedWindowId: string | null;
  selectWindow: (id: string | null) => void;
  /**
   * Canvas pixel grid for layout snap (same as sheet editor). When non-null, window display scale
   * snaps so the scaled outer width aligns to this step.
   */
  layoutGridSnapPx: number | null;
};

export const WindowCanvasSelectionContext =
  createContext<WindowCanvasSelectionContextValue | null>(null);

export function useWindowCanvasSelection(): WindowCanvasSelectionContextValue | null {
  return useContext(WindowCanvasSelectionContext);
}
