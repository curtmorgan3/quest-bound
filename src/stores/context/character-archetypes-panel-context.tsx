import { createContext } from 'react';

type CharacterArchetypesPanelContext = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

export const CharacterArchetypesPanelContext =
  createContext<CharacterArchetypesPanelContext | null>(null);
