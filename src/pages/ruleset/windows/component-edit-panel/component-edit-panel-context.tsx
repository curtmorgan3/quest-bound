import { createContext } from 'react';

export type ComponentEditPanelContextValue = {
  /** Updates the selected component(s) style with style[key] = `custom-prop-<customPropertyId>`. */
  assignStyleToCustomProperty: (styleKey: string, customPropertyId: string) => void;
  /**
   * Opens the custom properties modal.
   * - Pass styleKey only: on select, assignStyleToCustomProperty(styleKey, id) is called.
   * - Pass onSelect: on select, onSelect(id) is called instead (e.g. for gradient color slots).
   */
  openCustomPropertiesModal: (
    styleKey?: string,
    onSelect?: (customPropertyId: string) => void,
  ) => void;
};

export const ComponentEditPanelContext = createContext<ComponentEditPanelContextValue | null>(null);
