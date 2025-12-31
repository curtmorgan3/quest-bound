import type { Component } from '@/types';
import { createContext } from 'react';

type WindowEditorContext = {
  components: Component[];
  getComponent: (id: string) => Component | null;
  viewMode: boolean;
};

export const WindowEditorContext = createContext<WindowEditorContext>(null!);
export const WindowEditorProvider = WindowEditorContext.Provider;
