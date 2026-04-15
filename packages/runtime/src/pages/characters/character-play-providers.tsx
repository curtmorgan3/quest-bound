import { useCampaignPlayClientActionPending, useCampaignPlayClientForCharacter } from '@/hooks';
import { isCampaignPlayClientRelayForCampaign } from '@/lib/campaign-play/campaign-play-action-relay';
import { sendCampaignPlayClientActionRequest } from '@/lib/campaign-play/realtime/campaign-play-client-action-bridge';
import {
  flushDelegatedUiQueueForCharacter,
  registerCampaignPlayDelegatedCharacterSurface,
} from '@/lib/campaign-play/realtime/campaign-play-delegated-ui-client';
import { useCharacter, useCharacterAttributes } from '@/lib/compass-api';
import { useExecuteActionEvent } from '@/lib/compass-logic';
import { reportPlaytestActionFired } from '@/lib/cloud/playtest/playtest-api';
import {
  setCurrentCampaignIdForScripts,
  setCurrentCampaignSceneIdForScripts,
} from '@/lib/compass-logic/worker/current-campaign-ref';
import {
  setCurrentRollHandlerForScripts,
  setCurrentRollSplitHandlerForScripts,
} from '@/lib/compass-logic/worker/current-roll-handler-ref';
import { InventoryDragPreview } from '@/lib/compass-planes/nodes/components/inventory/inventory-drag-preview';
import {
  CharacterArchetypesPanelContext,
  CharacterInventoryPanelContext,
  CharacterProvider,
  DiceContext,
  InventoryDragProvider,
  type InventoryPanelConfig,
} from '@quest-bound/runtime/context';
import type { CharacterAttribute } from '@/types';
import { Loader2 } from 'lucide-react';
import { useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { CharacterArchetypesPanel } from './character-archetypes-panel';
import { CharacterAttributeEditPanel } from './character-attribute-edit-panel';
import { CharacterInventoryPanel } from './character-inventory-panel';
import { useCharacterInventoryHandlers } from './hooks';
import { InventoryPanel } from './inventory-panel';

type CharacterPlayProvidersProps = {
  characterId: string;
  children: ReactNode;
};

/**
 * Character sheet context (inventory, attributes, actions) plus panels that depend on it.
 * Used by routes that are not {@link CharacterPage} but need the same sidebar panels.
 */
export function CharacterPlayProviders({ characterId, children }: CharacterPlayProvidersProps) {
  const { playCampaignId, playCampaignSceneId } = useCampaignPlayClientForCharacter({
    characterId,
    propCampaignId: undefined,
    propCampaignSceneId: undefined,
    realtimePlayEnabled: true,
    campaignPlayClientBootstrapEnabled: true,
  });
  const effectiveCampaignId = playCampaignId;
  const effectiveCampaignSceneId = playCampaignSceneId;
  const isRemoteCampaignClient = isCampaignPlayClientRelayForCampaign(effectiveCampaignId);
  const hostActionPendingCount = useCampaignPlayClientActionPending(
    isRemoteCampaignClient ? effectiveCampaignId : undefined,
  );
  const characterInventoryPanel = useContext(CharacterInventoryPanelContext);
  const characterArchetypesPanel = useContext(CharacterArchetypesPanelContext);

  const diceContext = useContext(DiceContext);
  const rollDice = diceContext?.rollDice;

  const roll = async (diceString: string, rerollMessage?: string) =>
    rollDice(diceString, { rerollMessage }).then((res) => res.total);
  const rollSplit = async (diceString: string, rerollMessage?: string) =>
    rollDice(diceString, { rerollMessage }).then((res) =>
      res.segments.flatMap((s) => s.rolls.map((r) => r.value)),
    );

  useEffect(() => {
    setCurrentRollHandlerForScripts(roll);
    setCurrentRollSplitHandlerForScripts(rollSplit);
    return () => {
      setCurrentRollHandlerForScripts(undefined);
      setCurrentRollSplitHandlerForScripts(undefined);
    };
  }, [roll, rollSplit]);

  useLayoutEffect(() => {
    const unregister = registerCampaignPlayDelegatedCharacterSurface(characterId);
    flushDelegatedUiQueueForCharacter(characterId);
    return unregister;
  }, [characterId]);

  useEffect(() => {
    setCurrentCampaignIdForScripts(effectiveCampaignId ?? undefined);
    setCurrentCampaignSceneIdForScripts(effectiveCampaignSceneId ?? undefined);
    return () => {
      setCurrentCampaignIdForScripts(undefined);
      setCurrentCampaignSceneIdForScripts(undefined);
    };
  }, [effectiveCampaignId, effectiveCampaignSceneId]);

  const { character, updateCharacter } = useCharacter(characterId);

  const campaignPlayManualContext = useMemo(
    () =>
      effectiveCampaignId
        ? { campaignId: effectiveCampaignId, campaignSceneId: effectiveCampaignSceneId }
        : undefined,
    [effectiveCampaignId, effectiveCampaignSceneId],
  );

  const { characterAttributes, updateCharacterAttribute, syncWithRuleset } = useCharacterAttributes(
    character?.id,
    campaignPlayManualContext,
  );

  useEffect(() => {
    if (!character?.id) return;
    void syncWithRuleset();
  }, [character?.id]);

  const [inventoryPanelConfig, setInventoryPanelConfig] = useState<InventoryPanelConfig>({});

  const { executeActionEvent } = useExecuteActionEvent();

  const {
    inventoryItems,
    addItemAndFireEvent,
    updateItemAndFireEvent,
    removeItemAndFireEvent,
    consumeItem,
    activateItem,
    handleSelectInventoryEntity,
  } = useCharacterInventoryHandlers({
    character,
    roll,
    rollSplit,
    campaignId: effectiveCampaignId,
    campaignSceneId: effectiveCampaignSceneId,
    inventoryPanelConfig,
    setInventoryPanelConfig,
  });

  const handleUpdateCharacterAttribute = (id: string, update: Partial<CharacterAttribute>) => {
    updateCharacterAttribute(id, update);
  };

  const getCharacterAttribute = (attributeId: string) => {
    return characterAttributes.find((attr) => attr.attributeId === attributeId) ?? null;
  };

  const handleCharacterComponentDataUpdate = (id: string, value: string | boolean | number) => {
    if (!character) return;
    updateCharacter(character.id, {
      componentData: {
        ...character.componentData,
        [id]: value,
      },
    });
  };

  const fireAction = async (actionId: string) => {
    if (!character) return;
    if (isCampaignPlayClientRelayForCampaign(effectiveCampaignId)) {
      try {
        await sendCampaignPlayClientActionRequest({
          campaignId: effectiveCampaignId!,
          campaignSceneId: effectiveCampaignSceneId,
          body: {
            type: 'execute_action',
            actionId,
            characterId: character.id,
            targetId: null,
            eventType: 'on_activate',
          },
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Action failed');
      }
      return;
    }
    await executeActionEvent(
      actionId,
      character.id,
      null,
      'on_activate',
      roll,
      effectiveCampaignId,
      undefined,
      rollSplit,
      effectiveCampaignSceneId,
    );
    void reportPlaytestActionFired(character.rulesetId, actionId);
  };

  const fireActionFromItem = async (actionId: string, inventoryItemId: string) => {
    if (!character) return;
    if (isCampaignPlayClientRelayForCampaign(effectiveCampaignId)) {
      try {
        await sendCampaignPlayClientActionRequest({
          campaignId: effectiveCampaignId!,
          campaignSceneId: effectiveCampaignSceneId,
          body: {
            type: 'execute_action',
            actionId,
            characterId: character.id,
            targetId: null,
            eventType: 'on_activate',
            callerInventoryItemInstanceId: inventoryItemId,
          },
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Action failed');
      }
      return;
    }
    await executeActionEvent(
      actionId,
      character.id,
      null,
      'on_activate',
      roll,
      effectiveCampaignId,
      inventoryItemId,
      rollSplit,
      effectiveCampaignSceneId,
    );
    void reportPlaytestActionFired(character.rulesetId, actionId);
  };

  if (!character) {
    return null;
  }

  return (
    <CharacterProvider
      value={{
        character,
        campaignId: effectiveCampaignId,
        campaignSceneId: effectiveCampaignSceneId,
        characterAttributes,
        getCharacterAttribute,
        updateCharacterAttribute: handleUpdateCharacterAttribute,
        updateCharacterComponentData: handleCharacterComponentDataUpdate,
        inventoryPanelConfig,
        setInventoryPanelConfig,
        inventoryItems,
        addInventoryItem: addItemAndFireEvent,
        updateInventoryItem: updateItemAndFireEvent,
        removeInventoryItem: removeItemAndFireEvent,
        fireAction,
        fireActionFromItem,
        consumeItem,
        activateItem,
      }}>
      <InventoryDragProvider>
        {children}
        <InventoryPanel
          open={inventoryPanelConfig.open ?? false}
          onOpenChange={(open: boolean) => {
            if (!open) setInventoryPanelConfig({});
          }}
          type={inventoryPanelConfig.type as 'attribute' | 'item' | 'action'}
          includeIds={inventoryPanelConfig.includeIds}
          excludeIds={inventoryPanelConfig.excludeIds}
          onSelect={handleSelectInventoryEntity}
        />
        {characterInventoryPanel && (
          <CharacterInventoryPanel
            open={characterInventoryPanel.open}
            onOpenChange={characterInventoryPanel.setOpen}
            characterId={character.id}
          />
        )}
        {characterArchetypesPanel && (
          <CharacterArchetypesPanel
            open={characterArchetypesPanel.open}
            onOpenChange={characterArchetypesPanel.setOpen}
          />
        )}
        <InventoryDragPreview />
        <CharacterAttributeEditPanel />
        {isRemoteCampaignClient && hostActionPendingCount > 0 && (
          <div
            role='status'
            aria-live='polite'
            className='bg-background/95 text-muted-foreground fixed right-4 bottom-4 z-50 flex items-center gap-2 rounded-md border px-3 py-2 text-sm shadow-md backdrop-blur-sm'>
            <Loader2 className='size-4 shrink-0 animate-spin' aria-hidden />
            Communicating with host
          </div>
        )}
      </InventoryDragProvider>
    </CharacterProvider>
  );
}
