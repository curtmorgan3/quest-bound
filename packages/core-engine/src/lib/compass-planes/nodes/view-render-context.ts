import type { Component } from '@/types';
import type { EffectiveLayout } from '../sheet-editor/component-world-geometry';
import type { PositionValues } from '../utils';

export type ViewRenderContext = {
  allComponents: Component[];
  byId: Map<string, Component>;
  effectiveLayout: Map<string, EffectiveLayout>;
  positionMap: Map<string, PositionValues>;
  /** Canvas-space bounds of a component (for relative child-window open placement). */
  getComponentCanvasRect?: (
    componentId: string,
  ) => { x: number; y: number; width: number; height: number } | null;
  /** Ruleset page template id — used to resolve child window displayScale from `RulesetWindow`. */
  sheetTemplatePageId?: string | null;
  /** Character sheet only: removes the window instance hosting this canvas (when `closeCharacterWindowOnClick` is set). */
  closeThisCharacterWindow?: () => void;
  /** When true, custom state names come from `componentActiveStatesById` (character window). */
  characterSheet?: boolean;
  /** Character sheet: component id → persisted active custom state name. */
  componentActiveStatesById?: Record<string, string>;
};
