import { useSidebar } from '@/components/ui/sidebar';
import { useNotifications } from '@/hooks';
import { useCharacter, useCharacterAttributes } from '@/lib/compass-api';
import { useExecuteActionEvent, useScriptAnnouncements } from '@/lib/compass-logic';
import { SheetViewer } from '@/lib/compass-planes';
import {
  CharacterInventoryPanelContext,
  CharacterProvider,
  DiceContext,
  type InventoryPanelConfig,
} from '@/stores';
import { type CharacterAttribute } from '@/types';
import { useContext, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CharacterInventoryPanel } from './character-inventory-panel';
import { GameLog } from './game-log';
import {
  useCharacterInventoryHandlers,
  useCharacterWindowHandlers,
  useSheetPersistence,
} from './hooks';
import { InventoryPanel } from './inventory-panel';

export const CharacterPage = ({ id, lockByDefault }: { id?: string; lockByDefault?: boolean }) => {
  const { open } = useSidebar();
  const { characterId } = useParams<{ characterId: string }>();
  const { addNotification } = useNotifications();
  const characterInventoryPanel = useContext(CharacterInventoryPanelContext);

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
    executeActionEvent(actionId, character.id, null, 'on_activate', roll);
  };

  if (!character) {
    return null;
  }

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
      <SheetViewer
        key={character.id}
        characterId={character.id}
        lockByDefault={lockByDefault ?? false}
        initialCurrentPageId={character.lastViewedPageId ?? null}
        initialLocked={character.sheetLocked}
        onCurrentPageChange={sheetViewerPersistence?.onCurrentPageChange}
        onLockedChange={sheetViewerPersistence?.onLockedChange}
        onWindowUpdated={handleUpdateWindow}
        onWindowDeleted={handleDeleteWindow}
      />
      <GameLog className={`fixed bottom-[50px] left-${open ? '265' : '65'} z-30`} />
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
        />
      )}
    </CharacterProvider>
  );
};
