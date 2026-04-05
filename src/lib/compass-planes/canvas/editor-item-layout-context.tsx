import { getComponentData } from '@/lib/compass-planes/utils';
import {
  takeFullHeightCss,
  takeFullWidthCss,
} from '@/lib/compass-planes/utils/take-full-dimension-css';
import { WindowEditorContext } from '@/stores';
import type { Component } from '@/types';
import { createContext, useContext, type ReactNode } from 'react';

export type EditorItemLayout = { width: number; height: number };

/** Numeric size for math; `widthStyle` / `heightStyle` for CSS (viewport units at root, `100%` in a group). */
export type ComponentCanvasDimensions = {
  width: number;
  height: number;
  widthStyle: number | string;
  heightStyle: number | string;
};

export function canvasDimensionToCss(value: number | string): string | number {
  return typeof value === 'string' ? value : `${value}px`;
}

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
 * Use `width` / `height` for calculations; `widthStyle` / `heightStyle` for CSS (honors data flags).
 */
export function useComponentCanvasDimensions(
  component: Component | null | undefined,
): ComponentCanvasDimensions {
  const live = useContext(EditorItemLayoutContext);
  const windowEditor = useContext(WindowEditorContext);
  /** Ruleset window editor: layout on canvas uses stored pixels; preview (`viewMode`) uses viewport CSS. */
  const usePixelSizeOnly =
    windowEditor != null && windowEditor.viewMode === false;
  const getParent = windowEditor ? (id: string) => windowEditor.getComponent(id) : undefined;

  if (!component) {
    return { width: 0, height: 0, widthStyle: 0, heightStyle: 0 };
  }
  const w = live ? live.width : component.width;
  const h = live ? live.height : component.height;
  const width = typeof w === 'number' && Number.isFinite(w) ? w : Number(w) || 0;
  const height = typeof h === 'number' && Number.isFinite(h) ? h : Number(h) || 0;
  const data = getComponentData(component);
  return {
    width,
    height,
    widthStyle:
      usePixelSizeOnly || !data.takeFullWidth ? w : takeFullWidthCss(component, getParent),
    heightStyle:
      usePixelSizeOnly || !data.takeFullHeight ? h : takeFullHeightCss(component, getParent),
  };
}
