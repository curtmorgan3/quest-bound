import type { Component } from '@/types';
import { createContext, useContext } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

import type { EffectiveLayout } from './component-world-geometry';

export type SheetCanvasLayoutContextValue = {
  byId: Map<string, Component>;
  effectiveLayout: Map<string, EffectiveLayout>;
  onItemPointerDown: (e: ReactPointerEvent<HTMLDivElement>, c: Component) => void;
};

export const SheetCanvasLayoutContext = createContext<SheetCanvasLayoutContextValue | null>(null);

export function useSheetCanvasLayout(): SheetCanvasLayoutContextValue | null {
  return useContext(SheetCanvasLayoutContext);
}
