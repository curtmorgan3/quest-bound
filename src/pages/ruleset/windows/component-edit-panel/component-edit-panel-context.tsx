import { createContext } from 'react';

export type ComponentEditPanelContextValue = {
  /** Updates the selected component(s) style with style[key] = `custom-prop-<customPropertyId>`. */
  assignStyleToCustomProperty: (styleKey: string, customPropertyId: string) => void;
  /** Opens the custom properties modal. Pass styleKey so that on select, assignStyleToCustomProperty(styleKey, id) is called. */
  openCustomPropertiesModal: (styleKey?: string) => void;
};

export const ComponentEditPanelContext = createContext<ComponentEditPanelContextValue | null>(null);
