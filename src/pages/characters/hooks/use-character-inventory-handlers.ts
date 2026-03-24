import { useInventory } from '@/lib/compass-api';
import { isCampaignPlayClientRelayForCampaign } from '@/lib/campaign-play/campaign-play-action-relay';
import { useExecuteItemEvent } from '@/lib/compass-logic';
import { sendCampaignPlayClientActionRequest } from '@/lib/campaign-play/realtime/campaign-play-client-action-bridge';
import type { InventoryPanelConfig } from '@/stores';
import type {
  Action,
  Attribute,
  Character,
  InventoryItem,
  Item,
  RollFn,
  RollSplitFn,
} from '@/types';
import { useMemo } from 'react';
import { toast } from 'sonner';
import { findFirstEmptySlot } from '../character-inventory-panel';

type ItemEvent = 'on_equip' | 'on_unequip' | 'on_consume' | 'on_activate';

interface UseInventoryUpdateWrapperes {
  inventoryPanelConfig: InventoryPanelConfig;
  setInventoryPanelConfig: (config: InventoryPanelConfig) => void;
  character?: Character;
  roll?: RollFn;
  rollSplit?: RollSplitFn;
  /** When set (e.g. in campaign play), scripts get Owner.location and other campaign context. */
  campaignId?: string;
  /** When set with campaignId (e.g. character sheet in a scene), item scripts get Scene with inTurns/onTurnAdvance. */
  campaignSceneId?: string;
}

export const useCharacterInventoryHandlers = ({
  character,
  roll,
  rollSplit,
  campaignId,
  campaignSceneId,
  inventoryPanelConfig,
  setInventoryPanelConfig,
}: UseInventoryUpdateWrapperes) => {
  const { inventoryItems, addInventoryItem, updateInventoryItem, removeInventoryItem } =
    useInventory(character?.inventoryId ?? '', character?.id ?? '');

  const { executeItemEvent } = useExecuteItemEvent();

  const inventoryItemIdToRulesetItemId = useMemo(() => {
    const map = new Map<string, string>();

    inventoryItems.forEach((item) => {
      map.set(item.id, item.entityId);
    });

    return map;
  }, [inventoryItems]);

  const fireItemEvent = async (
    rulesetItemId: string,
    event: ItemEvent,
    inventoryItemInstanceId: string,
  ) => {
    if (!character) return;
    if (isCampaignPlayClientRelayForCampaign(campaignId)) {
      try {
        await sendCampaignPlayClientActionRequest({
          campaignId: campaignId!,
          campaignSceneId,
          body: {
            type: 'use_item',
            itemId: rulesetItemId,
            characterId: character.id,
            eventType: event,
            inventoryItemInstanceId,
          },
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Item action failed');
      }
      return;
    }
    executeItemEvent(
      rulesetItemId,
      character.id,
      event,
      roll,
      campaignId,
      inventoryItemInstanceId,
      rollSplit,
      campaignSceneId,
    );
  };

  const addItemAndFireEvent = async (
    data: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt' | 'inventoryId'>,
  ) => {
    await addInventoryItem(data);
  };

  const updateItemAndFireEvent = async (invItemId: string, data: Partial<InventoryItem>) => {
    const rulesetItemId = inventoryItemIdToRulesetItemId.get(invItemId);
    if (rulesetItemId) {
      if (data.isEquipped === true) {
        await fireItemEvent(rulesetItemId, 'on_equip', invItemId);
      }
      if (data.isEquipped === false) {
        await fireItemEvent(rulesetItemId, 'on_unequip', invItemId);
      }
    }

    updateInventoryItem(invItemId, data);
  };

  /**
   * Fires on_consume event and reduces qty by 1
   * Removes item if new qty is 0
   */
  const consumeItem = (invItemId: string) => {
    void (async () => {
      const rulesetItemId = inventoryItemIdToRulesetItemId.get(invItemId);
      if (rulesetItemId) {
        await fireItemEvent(rulesetItemId, 'on_consume', invItemId);
        if (isCampaignPlayClientRelayForCampaign(campaignId)) {
          return;
        }
      }

      const item = inventoryItems.find((item) => item.id === invItemId);
      if (!item) return;

      if (item.quantity <= 1) {
        removeInventoryItem(invItemId);
      } else {
        updateInventoryItem(invItemId, {
          quantity: item.quantity - 1,
        });
      }
    })();
  };

  const activateItem = (invItemId: string) => {
    void (async () => {
      const rulesetItemId = inventoryItemIdToRulesetItemId.get(invItemId);
      if (!rulesetItemId) return;
      await fireItemEvent(rulesetItemId, 'on_activate', invItemId);
    })();
  };

  const removeItemAndFireEvent = async (id: string) => {
    removeInventoryItem(id);
  };

  const handleSelectInventoryEntity = (
    entity: Action | Item | Attribute,
    type: 'action' | 'item' | 'attribute',
  ) => {
    if (inventoryPanelConfig.addToDefaultInventory) {
      addItemAndFireEvent({
        type,
        entityId: entity.id,
        componentId: '',
        quantity: 1,
        x: 0,
        y: 0,
      });
      return;
    }

    if (!inventoryPanelConfig.inventoryComponentId) {
      console.warn('No component ID available when adding item to inventory.');
      return;
    }

    // Get the entity's inventory dimensions (default to 2x2 if not specified)
    const itemWidth =
      (entity as Item).inventoryWidth ??
      (entity as Action).inventoryWidth ??
      (entity as Attribute).inventoryWidth ??
      2;
    const itemHeight =
      (entity as Item).inventoryHeight ??
      (entity as Action).inventoryHeight ??
      (entity as Attribute).inventoryHeight ??
      2;

    // Find the first empty slot
    const slot = findFirstEmptySlot({
      inventoryItems,
      inventoryPanelConfig,
      itemHeightIn20px: itemHeight,
      itemWidthIn20px: itemWidth,
    });

    if (!slot) {
      console.warn('No empty slot available in inventory.');
      setInventoryPanelConfig({});
      return;
    }

    addItemAndFireEvent({
      type,
      entityId: entity.id,
      componentId: inventoryPanelConfig.inventoryComponentId,
      quantity: 1,
      x: slot.x,
      y: slot.y,
    });
  };

  return {
    inventoryItems,
    handleSelectInventoryEntity,
    addItemAndFireEvent,
    updateItemAndFireEvent,
    removeItemAndFireEvent,
    consumeItem,
    activateItem,
  };
};
