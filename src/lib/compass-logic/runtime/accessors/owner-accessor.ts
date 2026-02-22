import type { Action, Attribute, CharacterAttribute, InventoryItem, Item } from '@/types';
import type Dexie from 'dexie';
import type { ExecuteActionEventFn } from '../proxies';
import { TileProxy } from '../proxies';
import { CharacterAccessor } from './character-accessor';

/**
 * Accessor for the character executing the script (Owner).
 * Extends CharacterAccessor; serializes as __type: 'Owner'.
 */
export class OwnerAccessor extends CharacterAccessor {
  constructor(
    characterId: string,
    characterName: string,
    inventoryId: string,
    db: Dexie,
    pendingUpdates: Map<string, any>,
    characterAttributesCache: Map<string, CharacterAttribute>,
    attributesCache: Map<string, Attribute>,
    actionsCache: Map<string, Action>,
    itemsCache: Map<string, Item>,
    inventoryItems: InventoryItem[],
    archetypeNamesCache: Set<string> = new Set(),
    targetId: string | null = null,
    executeActionEvent?: ExecuteActionEventFn,
    locationName: string = '',
    currentTile: { x: number; y: number } | null = null,
    tileWithContext: TileProxy | null = null,
  ) {
    super(
      characterId,
      characterName,
      inventoryId,
      db,
      pendingUpdates,
      characterAttributesCache,
      attributesCache,
      actionsCache,
      itemsCache,
      inventoryItems,
      archetypeNamesCache,
      targetId,
      executeActionEvent,
      locationName,
      currentTile,
      tileWithContext,
    );
  }

  override toStructuredCloneSafe(): unknown {
    return {
      __type: 'Owner',
      name: this.characterName,
      location: this.locationName,
      Tile: this.Tile.toStructuredCloneSafe(),
    };
  }
}
