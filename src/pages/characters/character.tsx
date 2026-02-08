import {
  useCharacter,
  useCharacterAttributes,
  useCharacterWindows,
  useInventory,
  type CharacterWindowUpdate,
} from '@/lib/compass-api';
import { SheetViewer } from '@/lib/compass-planes';
import { CharacterInventoryPanelContext, CharacterProvider, type InventoryPanelConfig } from '@/stores';
import { type Action, type Attribute, type CharacterAttribute, type Item } from '@/types';
import { useContext, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CharacterInventoryPanel } from './character-inventory-panel';
import { InventoryPanel } from './inventory-panel';

export const CharacterPage = ({ id, lockByDefault }: { id?: string; lockByDefault?: boolean }) => {
  const { characterId } = useParams<{ characterId: string }>();
  const characterInventoryPanel = useContext(CharacterInventoryPanelContext);

  const { character, updateCharacter } = useCharacter(id ?? characterId);
  const { updateCharacterWindow, deleteCharacterWindow } = useCharacterWindows(character?.id);
  const { characterAttributes, updateCharacterAttribute } = useCharacterAttributes(character?.id);
  const { inventoryItems, addInventoryItem, updateInventoryItem, removeInventoryItem } =
    useInventory(character?.inventoryId ?? '', character?.id ?? '');

  const [inventoryPanelConfig, setInventoryPanelConfig] = useState<InventoryPanelConfig>({});

  const findFirstEmptySlot = (
    componentId: string,
    itemWidthIn20px: number,
    itemHeightIn20px: number,
  ): { x: number; y: number } | null => {
    const { cellWidth, cellHeight, gridCols, gridRows } = inventoryPanelConfig;

    if (!cellWidth || !cellHeight || !gridCols || !gridRows) {
      return null;
    }

    // Calculate item size in cells
    const itemWidthInPixels = itemWidthIn20px * 20;
    const itemHeightInPixels = itemHeightIn20px * 20;
    const itemWidthInCells = Math.ceil(itemWidthInPixels / cellWidth);
    const itemHeightInCells = Math.ceil(itemHeightInPixels / cellHeight);

    // Get existing items in this component
    const existingItems = inventoryItems.filter((item) => item.componentId === componentId);

    // Check if a position collides with existing items
    const hasCollision = (x: number, y: number): boolean => {
      for (const other of existingItems) {
        const otherWidthInPixels = other.inventoryWidth * 20;
        const otherHeightInPixels = other.inventoryHeight * 20;
        const otherWidthInCells = Math.ceil(otherWidthInPixels / cellWidth);
        const otherHeightInCells = Math.ceil(otherHeightInPixels / cellHeight);

        const noOverlap =
          x >= other.x + otherWidthInCells ||
          x + itemWidthInCells <= other.x ||
          y >= other.y + otherHeightInCells ||
          y + itemHeightInCells <= other.y;

        if (!noOverlap) return true;
      }
      return false;
    };

    // Scan row by row, left to right, for the first empty slot
    for (let y = 0; y <= gridRows - itemHeightInCells; y++) {
      for (let x = 0; x <= gridCols - itemWidthInCells; x++) {
        if (!hasCollision(x, y)) {
          return { x, y };
        }
      }
    }

    // No empty slot found
    return null;
  };

  const handleSelectInventoryEntity = (
    entity: Action | Item | Attribute,
    type: 'action' | 'item' | 'attribute',
  ) => {
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
    const slot = findFirstEmptySlot(
      inventoryPanelConfig.inventoryComponentId,
      itemWidth,
      itemHeight,
    );

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

    setInventoryPanelConfig({});
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
