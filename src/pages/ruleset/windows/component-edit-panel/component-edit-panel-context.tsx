import { createContext } from 'react';

export type ComponentEditPanelContextValue = {
  openCustomPropertiesModal: () => void;
  onSelectCustomProperty: (customPropertyId: string) => void;
};

export const ComponentEditPanelContext = createContext<ComponentEditPanelContextValue | null>(null);
