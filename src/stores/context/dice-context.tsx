import { createContext } from 'react';

type DiceContext = {
  dicePanelOpen: boolean;
  setDicePanelOpen: (open: boolean) => void;
};

export const DiceContext = createContext<DiceContext>(null!);
export const DiceProvider = DiceContext.Provider;
