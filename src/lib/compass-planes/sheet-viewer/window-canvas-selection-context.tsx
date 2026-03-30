import { createContext, useContext } from 'react';

export type WindowCanvasSelectionContextValue = {
  selectedWindowId: string | null;
  selectWindow: (id: string | null) => void;
};

export const WindowCanvasSelectionContext =
  createContext<WindowCanvasSelectionContextValue | null>(null);

export function useWindowCanvasSelection(): WindowCanvasSelectionContextValue | null {
  return useContext(WindowCanvasSelectionContext);
}
