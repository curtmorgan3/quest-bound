import type {
  Character,
  CharacterAttribute,
  InventoryItem,
  InventoryItemWithData,
} from '@quest-bound/types';
import { createContext } from 'react';

export type { InventoryItemWithData } from '@quest-bound/types';

export type InventoryPanelConfig = {
  open?: boolean;
  type?: 'item' | 'action' | 'attribute' | 'pinned';
  includeIds?: string[];
  excludeIds?: string[];
  inventoryComponentId?: string;
  /** When true, selecting an item adds it to the character's default inventory (no component). */
  addToDefaultInventory?: boolean;
  typeRestriction?: 'action' | 'item' | 'attribute';
  categoryRestriction?: string;
  // Grid info for calculating item placement
  cellWidth?: number;
  cellHeight?: number;
  gridCols?: number;
  gridRows?: number;
};

type CharacterContext = {
  character: Character;
  /** When set (e.g. sheet open in campaign play), script execution gets this campaign id for context and log persistence. */
  campaignId?: string;
  /** When set with campaignId (e.g. sheet open in a scene), scripts get Scene accessor. */
  campaignSceneId?: string;
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
  fireAction: (actionId: string) => void;
  /** Fire action with Caller = itemInstanceProxy of that inventory item (e.g. from item context menu). */
  fireActionFromItem: (actionId: string, inventoryItemId: string) => void;
  consumeItem: (id: string) => void;
  activateItem: (id: string) => void;
};

export const CharacterContext = createContext<CharacterContext>(null!);
export const CharacterProvider = CharacterContext.Provider;
