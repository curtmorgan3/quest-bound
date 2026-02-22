import { useSidebar } from '@/components/ui/sidebar';
import { useNotifications } from '@/hooks';
import { useCharacter, useCharacterAttributes } from '@/lib/compass-api';
import { useExecuteActionEvent, useScriptAnnouncements } from '@/lib/compass-logic';
import { SheetViewer } from '@/lib/compass-planes';
import {
  CharacterArchetypesPanelContext,
  CharacterInventoryPanelContext,
  CharacterProvider,
  DiceContext,
  type InventoryPanelConfig,
} from '@/stores';
import { type CharacterAttribute } from '@/types';
import { useContext, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CharacterArchetypesPanel } from './character-archetypes-panel';
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
}

export const CharacterPage = ({
  id,
  campaignId,
  lockByDefault,
  editorWindowId,
  transparentBackground,
  onClose,
  renderFloatingActions,
}: CharacterPage) => {
  const { open } = useSidebar();
  const { characterId } = useParams<{ characterId: string }>();
  const { addNotification } = useNotifications();
  const characterInventoryPanel = useContext(CharacterInventoryPanelContext);
  const characterArchetypesPanel = useContext(CharacterArchetypesPanelContext);

  const { rollDice } = useContext(DiceContext);
  const roll = async (diceString: string) => rollDice(diceString).then((res) => res.total);

  const { character, updateCharacter } = useCharacter(id ?? characterId);

  const { characterAttributes, updateCharacterAttribute } = useCharacterAttributes(character?.id);
  const { handleUpdateWindow, handleDeleteWindow } = useCharacterWindowHandlers(
    character?.id ?? '',
  );
  const { sheetViewerPersistence } = useSheetPersistence(character?.id);

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
    campaignId,
    inventoryPanelConfig,
    setInventoryPanelConfig,
  });

  useScriptAnnouncements((msg: string) => {
    addNotification(msg);
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
    executeActionEvent(actionId, character.id, null, 'on_activate', roll, campaignId);
  };

  if (!character) {
    return null;
  }

  const openInventory = () => {
    if (characterInventoryPanel) {
      characterInventoryPanel.setOpen(true);
    } else {
      setInventoryPanelConfig({ open: true });
    }
  };
  const showFloatingActions = renderFloatingActions != null && onClose != null;

  return (
    <CharacterProvider
      value={{
        character,
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
        consumeItem,
        activateItem,
      }}>
      {showFloatingActions && (
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
        initialLocked={character.sheetLocked}
        onLockedChange={sheetViewerPersistence?.onLockedChange}
        onWindowUpdated={handleUpdateWindow}
        onWindowDeleted={handleDeleteWindow}
        editorWindowId={editorWindowId}
        transparentBackground={transparentBackground}
      />
      {!editorWindowId && (
        <GameLog className={`fixed bottom-[50px] left-${open ? '265' : '65'} z-30`} />
      )}
      <InventoryPanel
        open={inventoryPanelConfig.open ?? false}
        onOpenChange={(open: boolean) => {
          if (!open) setInventoryPanelConfig({});
        }}
        type={inventoryPanelConfig.type}
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
    </CharacterProvider>
  );
};
