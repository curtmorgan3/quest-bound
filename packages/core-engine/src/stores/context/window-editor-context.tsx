import type { ComponentUpdate } from '@/lib/compass-api';
import type { Component } from '@/types';
import { createContext } from 'react';

type WindowEditorContext = {
  components: Component[];
  viewMode: boolean;
  getComponent: (id: string) => Component | null;
  updateComponent: (id: string, data: Partial<Component>) => void;
  updateComponents: (updates: Array<ComponentUpdate>) => void;
  /** Phase 4a: wrap selection in a group root (`Cmd/Ctrl+G` + edit panel). */
  groupSelectedComponents: () => void;
  ungroupSelectedComponents: () => void;
  canGroupSelected: boolean;
  canUngroupSelected: boolean;
  /** Component ids that are a `Composite.rootComponentId` or `CompositeVariant.groupComponentId`. */
  compositeTemplateRootIds: ReadonlySet<string>;
  /**
   * From selected component(s) `editorStateTarget` (persisted): `'base'` or a `ComponentStateEntry.name`.
   * When multiple selections disagree, reads as `'base'` until the user picks a target.
   */
  stateEditTarget: string;
  setStateEditTarget: (target: string) => void;
};

export const WindowEditorContext = createContext<WindowEditorContext>(null!);
export const WindowEditorProvider = WindowEditorContext.Provider;
