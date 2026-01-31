import {
  useCharacter,
  useCharacterAttributes,
  useCharacterWindows,
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

  const [inventoryPanelConfig, setInventoryPanelConfig] = useState<InventoryPanelConfig>({});

  const handleSelectInventoryEntity = (entity: Action | Item, type: 'action' | 'item') => {
    console.log('Add to char inventory: ', entity, type);
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
