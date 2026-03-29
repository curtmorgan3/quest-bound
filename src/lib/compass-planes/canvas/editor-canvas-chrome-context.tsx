import { createContext, useContext, type ReactNode, type RefObject } from 'react';

export type EditorCanvasChromeContextValue = {
  containerRef: RefObject<HTMLElement | null>;
  isSelected: (id: string) => boolean;
  onResizeCommit: (id: string, width: number, height: number, x: number, y: number) => void;
  useGrid: boolean;
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
    <EditorCanvasChromeContext.Provider value={value}>{children}</EditorCanvasChromeContext.Provider>
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
