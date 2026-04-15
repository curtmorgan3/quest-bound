import { createContext } from 'react';

type CharacterInventoryPanelContext = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

export const CharacterInventoryPanelContext = createContext<CharacterInventoryPanelContext | null>(
  null,
);
