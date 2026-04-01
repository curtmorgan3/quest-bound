import type {
  Action,
  Attribute,
  CharacterAttribute,
  CustomProperty,
  InventoryItem,
  Item,
  RollFn,
  RollSplitFn,
} from '@/types';
import type Dexie from 'dexie';
import type { ExecuteActionEventFn } from '../proxies';
import type { SheetUiCoordinator } from '../sheet-ui/sheet-ui-coordinator';
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
    archetypeVariantByName: Map<string, string | undefined> = new Map(),
    targetId: string | null = null,
    executeActionEvent?: ExecuteActionEventFn,
    customProperties: CustomProperty[] = [],
    characterCustomProperties: Record<string, string | number | boolean> = {},
    turnOrder: number = 0,
    campaignId?: string,
    campaignSceneId?: string,
    registerComponentUpdate?: (
      characterId: string,
      referenceLabel: string,
      type: 'animation' | 'style',
      data: Record<string, unknown>,
    ) => void,
    rollFn?: RollFn,
    rollSplitFn?: RollSplitFn,
    onRollComplete?: (message: string) => Promise<void>,
    refLabelToComponentId?: Map<string, string>,
    sheetUiCoordinator?: SheetUiCoordinator | null,
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
      archetypeVariantByName,
      targetId,
      executeActionEvent,
      customProperties,
      characterCustomProperties,
      turnOrder,
      campaignId,
      campaignSceneId,
      registerComponentUpdate,
      rollFn,
      rollSplitFn,
      onRollComplete,
      refLabelToComponentId,
      sheetUiCoordinator,
    );
  }

  override toStructuredCloneSafe(): unknown {
    return {
      __type: 'Owner',
      name: this.characterName,
    };
  }
}
