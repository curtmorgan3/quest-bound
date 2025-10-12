import type { Component } from '@/types';

type ComponentCrud = {
  onComponentsUpdated: (updates: Array<Component>) => void;
  onComponentsCreated: (updates: Array<Component>) => void;
  onComponentsDeleted: (ids: Array<string>) => void;
};

export const handleComponentCrud: ComponentCrud = {
  onComponentsCreated: () => {},
  onComponentsDeleted: () => {},
  onComponentsUpdated: () => {},
};
