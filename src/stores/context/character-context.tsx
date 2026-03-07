import type { Character, CharacterAttribute, InventoryItem } from '@/types';
import { createContext } from 'react';

export type InventoryPanelConfig = {
  open?: boolean;
  type?: 'item' | 'action' | 'attribute';
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

export type InventoryItemWithData = InventoryItem & {
  image?: string | null;
  title: string;
  description?: string;
  /** Category inherited from the referenced item/action/attribute, when present. */
  category?: string;
  inventoryWidth: number;
  inventoryHeight: number;
  stackSize: number;
  isEquippable: boolean;
  isConsumable: boolean;
  weight: number;
  customProperties: Record<any, any>;
  /** Present when type is 'attribute': the character's current value for this attribute. */
  value?: string | number | boolean;
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
