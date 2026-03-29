import { createContext, useContext, type ReactNode, type RefObject } from 'react';

export type EditorCanvasChromeContextValue = {
  containerRef: RefObject<HTMLElement | null>;
  isSelected: (id: string) => boolean;
  onResizeCommit: (id: string, width: number, height: number, x: number, y: number) => void;
  useGrid: boolean;
  /** Pixel step for snap and resize when `useGrid` is true. */
  gridSize: number;
  /** View-only zoom; pointer/resize math uses this with `transform: scale` on the canvas root. */
  viewScale: number;
  /** Live box during resize (canvas space); omit if the host renders without transient geometry. */
  onResizeTransient?: (id: string, width: number, height: number, x: number, y: number) => void;
  /** Clear resize overlay when the gesture ends without a commit (cancel / no change). */
  onResizeGestureEnd?: () => void;
};

const EditorCanvasChromeContext = createContext<EditorCanvasChromeContextValue | null>(null);

export function EditorCanvasChromeProvider({
  value,
  children,
}: {
  value: EditorCanvasChromeContextValue;
  children: ReactNode;
}) {
  return (
    <EditorCanvasChromeContext.Provider value={value}>
      {children}
    </EditorCanvasChromeContext.Provider>
  );
}

/** Resize handles and selection chrome on the native sheet canvas. */
export function useEditorCanvasChrome(): EditorCanvasChromeContextValue {
  const v = useContext(EditorCanvasChromeContext);
  if (v == null) {
    throw new Error('useEditorCanvasChrome must be used within EditorCanvasChromeProvider');
  }
  return v;
}
