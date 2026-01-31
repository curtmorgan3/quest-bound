import type { Character, CharacterAttribute } from '@/types';
import { createContext } from 'react';

export type InventoryPanelConfig = {
  open?: boolean;
  type?: 'item' | 'action';
  includeIds?: string[];
  excludeIds?: string[];
  inventoryComponentId?: string;
};

type CharacterContext = {
  character: Character;
  characterAttributes: CharacterAttribute[];
  getCharacterAttribute: (attributeId: string) => CharacterAttribute | null;
  updateCharacterAttribute: (id: string, update: Partial<CharacterAttribute>) => void;
  updateCharacterComponentData: (id: string, value: string | boolean | number) => void;
  inventoryPanelConfig: InventoryPanelConfig;
  setInventoryPanelConfig: (config: InventoryPanelConfig) => void;
};

export const CharacterContext = createContext<CharacterContext>(null!);
export const CharacterProvider = CharacterContext.Provider;
