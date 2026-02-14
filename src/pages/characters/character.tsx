import { useNotifications } from '@/hooks';
import {
  useCharacter,
  useCharacterAttributes,
  useCharacterWindows,
  useInventory,
  type CharacterWindowUpdate,
} from '@/lib/compass-api';
import { executeActionEvent, useScriptAnnouncements } from '@/lib/compass-logic';
import { SheetViewer } from '@/lib/compass-planes';
import {
  CharacterInventoryPanelContext,
  CharacterProvider,
  db,
  DiceContext,
  type InventoryPanelConfig,
} from '@/stores';
import { type Action, type Attribute, type CharacterAttribute, type Item } from '@/types';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CharacterInventoryPanel, findFirstEmptySlot } from './character-inventory-panel';
import { InventoryPanel } from './inventory-panel';

export const CharacterPage = ({ id, lockByDefault }: { id?: string; lockByDefault?: boolean }) => {
  const { characterId } = useParams<{ characterId: string }>();
  const characterInventoryPanel = useContext(CharacterInventoryPanelContext);
  const { rollDice } = useContext(DiceContext);

  const { character, updateCharacter } = useCharacter(id ?? characterId);
  const { updateCharacterWindow, deleteCharacterWindow } = useCharacterWindows(character?.id);
  const { characterAttributes, updateCharacterAttribute } = useCharacterAttributes(character?.id);
  const { inventoryItems, addInventoryItem, updateInventoryItem, removeInventoryItem } =
    useInventory(character?.inventoryId ?? '', character?.id ?? '');

  const [inventoryPanelConfig, setInventoryPanelConfig] = useState<InventoryPanelConfig>({});
  const [eventAnnouncements, setEventAnnouncements] = useState<string[]>([]);
  const [gameLogs, setGameLogs] = useState<string[]>([]);

  console.log(gameLogs);

  const { addNotification } = useNotifications();

  useScriptAnnouncements((msg: string) => {
    addNotification(msg);
  });

  useEffect(() => {
    if (!eventAnnouncements.length) return;
    eventAnnouncements.map((msg) => {
      addNotification(msg);
      setEventAnnouncements([]);
    });
  }, [eventAnnouncements, addNotification]);

  const handleSelectInventoryEntity = (
    entity: Action | Item | Attribute,
    type: 'action' | 'item' | 'attribute',
  ) => {
    if (inventoryPanelConfig.addToDefaultInventory) {
      addInventoryItem({
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

    addInventoryItem({
      type,
      entityId: entity.id,
      componentId: inventoryPanelConfig.inventoryComponentId,
      quantity: 1,
      x: slot.x,
      y: slot.y,
    });
  };

  const handleUpdateWindow = (update: CharacterWindowUpdate) => {
    updateCharacterWindow(update.id, update);
  };

  const handleDeleteWindow = (id: string) => {
    deleteCharacterWindow(id);
  };

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

  const sheetViewerPersistence = useMemo(() => {
    if (!character) return undefined;
    return {
      onCurrentPageChange: (pageId: string | null) => {
        updateCharacter(character.id, { lastViewedPageId: pageId });
      },
      onLockedChange: (locked: boolean) => {
        updateCharacter(character.id, { sheetLocked: locked });
      },
    };
  }, [
    character?.id,
    character?.lastViewedPageId,
    character?.sheetLocked,
    character,
    updateCharacter,
  ]);

  const fireAction = async (actionId: string) => {
    if (!character) return;
    const rollFn = async (diceString: string) => rollDice(diceString).then((res) => res.total);
    const res = await executeActionEvent(db, actionId, character.id, null, 'on_activate', rollFn);
    setEventAnnouncements(res.announceMessages);
    setGameLogs((prev) => [...prev, ...res.logMessages.map((log) => log[0])]);
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
        updateInventoryItem,
        removeInventoryItem,
        addInventoryItem,
        fireAction,
        gameLogs,
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
