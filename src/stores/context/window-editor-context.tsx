import type { ComponentUpdate } from '@/lib/compass-api';
import type { Component } from '@/types';
import { createContext } from 'react';

type WindowEditorContext = {
  components: Component[];
  viewMode: boolean;
  getComponent: (id: string) => Component | null;
  updateComponent: (id: string, data: Partial<Component>) => void;
  updateComponents: (updates: Array<ComponentUpdate>) => void;
};

export const WindowEditorContext = createContext<WindowEditorContext>(null!);
export const WindowEditorProvider = WindowEditorContext.Provider;
