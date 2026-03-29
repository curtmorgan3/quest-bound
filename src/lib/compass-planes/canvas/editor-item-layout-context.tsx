import type { Component } from '@/types';
import { createContext, useContext, type ReactNode } from 'react';

export type EditorItemLayout = { width: number; height: number };

const EditorItemLayoutContext = createContext<EditorItemLayout | null>(null);

export function EditorItemLayoutProvider({
  value,
  children,
}: {
  value: EditorItemLayout;
  children: ReactNode;
}) {
  return (
    <EditorItemLayoutContext.Provider value={value}>{children}</EditorItemLayoutContext.Provider>
  );
}

/**
 * Width/height of the item on the native sheet canvas (includes live resize preview).
 * Outside the provider, falls back to `component` dimensions (viewer / React Flow).
 */
export function useComponentCanvasDimensions(
  component: Component | null | undefined,
): { width: number; height: number } {
  const live = useContext(EditorItemLayoutContext);
  if (!component) return { width: 0, height: 0 };
  if (live) return { width: live.width, height: live.height };
  return { width: component.width, height: component.height };
}
