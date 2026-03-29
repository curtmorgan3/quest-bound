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
};

export const WindowEditorContext = createContext<WindowEditorContext>(null!);
export const WindowEditorProvider = WindowEditorContext.Provider;
