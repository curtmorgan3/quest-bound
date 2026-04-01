import { useSidebar } from '@/components/ui/sidebar';
import { useCampaignPlayClientForCharacter, useFeatureFlag } from '@/hooks';
import { isCampaignPlayClientRelayForCampaign } from '@/lib/campaign-play/campaign-play-action-relay';
import { CAMPAIGN_REALTIME_PLAY_FEATURE_FLAG } from '@/lib/campaign-play/campaign-play-constants';
import { sendCampaignPlayClientActionRequest } from '@/lib/campaign-play/realtime/campaign-play-client-action-bridge';
import {
  flushDelegatedUiQueueForCharacter,
  registerCampaignPlayDelegatedCharacterSurface,
} from '@/lib/campaign-play/realtime/campaign-play-delegated-ui-client';
import { useCharacter, useCharacterAttributes } from '@/lib/compass-api';
import { useExecuteActionEvent } from '@/lib/compass-logic';
import {
  setCurrentCampaignIdForScripts,
  setCurrentCampaignSceneIdForScripts,
} from '@/lib/compass-logic/worker/current-campaign-ref';
import {
  setCurrentRollHandlerForScripts,
  setCurrentRollSplitHandlerForScripts,
} from '@/lib/compass-logic/worker/current-roll-handler-ref';
import { SheetViewer } from '@/lib/compass-planes';
import { InventoryDragPreview } from '@/lib/compass-planes/nodes/components/inventory/inventory-drag-preview';
import {
  CharacterArchetypesPanelContext,
  CharacterInventoryPanelContext,
  CharacterProvider,
  DiceContext,
  InventoryDragProvider,
  type InventoryPanelConfig,
} from '@/stores';
import { type CharacterAttribute } from '@/types';
import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CharacterArchetypesPanel } from './character-archetypes-panel';
import { CharacterAttributeEditPanel } from './character-attribute-edit-panel';
import { CharacterInventoryPanel } from './character-inventory-panel';
import { GameLog } from './game-log';
import {
  useCharacterInventoryHandlers,
  useCharacterWindowHandlers,
  useSheetPersistence,
} from './hooks';
import { InventoryPanel } from './inventory-panel';

export type CharacterPageFloatingActions = {
  onOpenInventory: () => void;
  onClose: () => void;
};

interface CharacterPage {
  id?: string;
  /** When set (e.g. in campaign play), scripts get Owner.location and other campaign context. */
  campaignId?: string;
  /** When set with campaignId (e.g. character sheet in a scene), action scripts get Scene with advanceTurnOrder. */
  campaignSceneId?: string;
  lockByDefault?: boolean;
  /**
   * If provided, renders just this window in preview mode. Otherwise, it renders all character pages and windows.
   */
  editorWindowId?: string;
  /** When true, the sheet viewer shows only nodes with no background (e.g. for overlay use). */
  transparentBackground?: boolean;
  /** Called when a close action is requested (e.g. from floating actions). */
  onClose?: () => void;
  /** When provided with onClose, renders floating action buttons (e.g. inventory + close) in the top-right. */
  renderFloatingActions?: (actions: CharacterPageFloatingActions) => React.ReactNode;
  /**
   * When set with onClose, does not render floating actions in-page; calls with open/close handlers
   * so the parent can render them (e.g. campaign sheet top bar). Takes precedence over renderFloatingActions.
   */
  onFloatingActionsApi?: (api: CharacterPageFloatingActions | null) => void;
  hideGameLog?: boolean;
  showHiddenWindows?: boolean;
  ignoreCharacterWindowCollapsedState?: boolean;
  forceFitSheetToViewport?: boolean;
}

export const CharacterPage = ({
  id,
  campaignId,
  campaignSceneId,
  lockByDefault,
  editorWindowId,
  transparentBackground,
  onClose,
  renderFloatingActions,
  onFloatingActionsApi,
  hideGameLog = false,
  showHiddenWindows = false,
  ignoreCharacterWindowCollapsedState = false,
  forceFitSheetToViewport = false,
}: CharacterPage) => {
  const { open } = useSidebar();
  const { characterId: routeCharacterId } = useParams<{ characterId: string }>();
  const resolvedCharacterId = id ?? routeCharacterId;
  const campaignRealtimePlayEnabled = useFeatureFlag(CAMPAIGN_REALTIME_PLAY_FEATURE_FLAG);
  const { playCampaignId, playCampaignSceneId } = useCampaignPlayClientForCharacter({
    characterId: resolvedCharacterId,
    propCampaignId: campaignId,
    propCampaignSceneId: campaignSceneId,
    realtimePlayEnabled: campaignRealtimePlayEnabled,
  });
  const effectiveCampaignId = playCampaignId;
  const effectiveCampaignSceneId = playCampaignSceneId;
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

  // Layout effect so the delegated-UI surface is registered before paint and before deferred
  // realtime handlers that would otherwise toast "open their sheet" while this sheet is mounting.
  useLayoutEffect(() => {
    if (!resolvedCharacterId) return;
    const unregister = registerCampaignPlayDelegatedCharacterSurface(resolvedCharacterId);
    flushDelegatedUiQueueForCharacter(resolvedCharacterId);
    return unregister;
  }, [resolvedCharacterId]);

  // When viewing character sheet in campaign play, set campaign and scene refs so scripts
  // get campaignId/campaignSceneId in context (e.g. Scene accessor in reactive/attribute scripts).
  useEffect(() => {
    setCurrentCampaignIdForScripts(effectiveCampaignId ?? undefined);
    setCurrentCampaignSceneIdForScripts(effectiveCampaignSceneId ?? undefined);
    return () => {
      setCurrentCampaignIdForScripts(undefined);
      setCurrentCampaignSceneIdForScripts(undefined);
    };
  }, [effectiveCampaignId, effectiveCampaignSceneId]);

  const { character, updateCharacter } = useCharacter(resolvedCharacterId);

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

  // On character open, sync only attributes created or updated since the last sync.
  useEffect(() => {
    if (!character?.id) return;
    syncWithRuleset();
  }, [character?.id]);
  const { handleUpdateWindow, handleDeleteWindow } = useCharacterWindowHandlers(
    character?.id ?? '',
  );
  const { sheetViewerPersistence } = useSheetPersistence(character?.id);

  const [inventoryPanelConfig, setInventoryPanelConfig] = useState<InventoryPanelConfig>({});

  const { executeActionEvent } = useExecuteActionEvent();

  const openInventory = useCallback(() => {
    if (characterInventoryPanel) {
      characterInventoryPanel.setOpen(true);
    } else {
      setInventoryPanelConfig({ open: true });
    }
  }, [characterInventoryPanel, setInventoryPanelConfig]);

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
    executeActionEvent(
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
  };

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const openInventoryRef = useRef(openInventory);
  openInventoryRef.current = openInventory;

  useEffect(() => {
    if (!onFloatingActionsApi) return;
    if (!character?.id) {
      onFloatingActionsApi(null);
      return;
    }
    onFloatingActionsApi({
      onOpenInventory: () => openInventoryRef.current(),
      onClose: () => onCloseRef.current?.(),
    });
    return () => onFloatingActionsApi(null);
  }, [character?.id, onFloatingActionsApi]);

  if (!character) {
    return null;
  }

  const showInlineFloatingActions =
    onFloatingActionsApi == null && renderFloatingActions != null && onClose != null;

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
        {showInlineFloatingActions && (
          <div className='absolute right-2 top-2 z-40 flex gap-2'>
            {renderFloatingActions!({
              onOpenInventory: openInventory,
              onClose: onClose!,
            })}
          </div>
        )}
        <SheetViewer
          key={character.id}
          characterId={character.id}
          lockByDefault={lockByDefault ?? false}
          initialCurrentPageId={character.lastViewedPageId ?? null}
          initialLocked={
            editorWindowId != null ? (character.sheetLocked ?? lockByDefault ?? false) : true
          }
          onLockedChange={sheetViewerPersistence?.onLockedChange}
          onWindowUpdated={handleUpdateWindow}
          onWindowDeleted={handleDeleteWindow}
          editorWindowId={editorWindowId}
          transparentBackground={transparentBackground}
          showHiddenWindows={showHiddenWindows}
          ignoreCharacterWindowCollapsedState={ignoreCharacterWindowCollapsedState}
          forceFitSheetToViewport={forceFitSheetToViewport}
        />

        {!hideGameLog && (
          <div
            className={`fixed bottom-12 z-30 flex flex-col gap-2 ${open ? 'left-[295px]' : 'left-[45px]'}`}>
            <GameLog characterId={character?.id ?? routeCharacterId} docked />
          </div>
        )}
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
            characterId={id}
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
      </InventoryDragProvider>
    </CharacterProvider>
  );
};
