import type { Character, CharacterAttribute, InventoryItem } from '@/types';
import { createContext } from 'react';

export type InventoryPanelConfig = {
  open?: boolean;
  type?: 'item' | 'action';
  includeIds?: string[];
  excludeIds?: string[];
  inventoryComponentId?: string;
  typeRestriction?: 'action' | 'item' | 'attribute';
  // Grid info for calculating item placement
  cellWidth?: number;
  cellHeight?: number;
  gridCols?: number;
  gridRows?: number;
};

export type InventoryItemWithData = InventoryItem & {
  image?: string | null;
  title: string;
  description?: string;
  inventoryWidth: number;
  inventoryHeight: number;
  stackSize: number;
};

type CharacterContext = {
  character: Character;
  characterAttributes: CharacterAttribute[];
  getCharacterAttribute: (attributeId: string) => CharacterAttribute | null;
  updateCharacterAttribute: (id: string, update: Partial<CharacterAttribute>) => void;
  updateCharacterComponentData: (id: string, value: string | boolean | number) => void;
  inventoryPanelConfig: InventoryPanelConfig;
  setInventoryPanelConfig: (config: InventoryPanelConfig) => void;
  inventoryItems: InventoryItemWithData[];
  updateInventoryItem: (id: string, data: Partial<InventoryItem>) => void;
  removeInventoryItem: (id: string) => void;
  addInventoryItem: (
    data: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt' | 'inventoryId'>,
  ) => void;
};

export const CharacterContext = createContext<CharacterContext>(null!);
export const CharacterProvider = CharacterContext.Provider;
