import {
  useCharacter,
  useCharacterAttributes,
  useCharacterWindows,
  useInventory,
  type CharacterWindowUpdate,
} from '@/lib/compass-api';
import { SheetViewer } from '@/lib/compass-planes';
import { CharacterProvider, type InventoryPanelConfig } from '@/stores';
import { type Action, type CharacterAttribute, type Item } from '@/types';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { InventoryPanel } from './inventory-panel';

export const CharacterPage = ({ id, lockByDefault }: { id?: string; lockByDefault?: boolean }) => {
  const { characterId } = useParams<{ characterId: string }>();

  const { character, updateCharacter } = useCharacter(id ?? characterId);
  const { updateCharacterWindow, deleteCharacterWindow } = useCharacterWindows(character?.id);
  const { characterAttributes, updateCharacterAttribute } = useCharacterAttributes(character?.id);
  const { inventoryItems, addInventoryItem, updateInventoryItem } = useInventory(
    character?.inventoryId ?? '',
  );

  const [inventoryPanelConfig, setInventoryPanelConfig] = useState<InventoryPanelConfig>({});

  const handleSelectInventoryEntity = (entity: Action | Item, type: 'action' | 'item') => {
    if (!inventoryPanelConfig.inventoryComponentId) {
      console.warn('No component ID available when adding item to inventory.');
      return;
    }

    addInventoryItem({
      type,
      entityId: entity.id,
      componentId: inventoryPanelConfig.inventoryComponentId,
      quantity: 1,
      x: 0,
      y: 0,
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
      }}>
      <SheetViewer
        characterId={character?.id}
        lockByDefault={lockByDefault ?? false}
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
    </CharacterProvider>
  );
};
