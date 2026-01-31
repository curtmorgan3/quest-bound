import {
  useCharacter,
  useCharacterAttributes,
  useCharacterWindows,
  type CharacterWindowUpdate,
} from '@/lib/compass-api';
import { SheetViewer } from '@/lib/compass-planes';
import { CharacterProvider } from '@/stores';
import type { CharacterAttribute } from '@/types';
import { useParams } from 'react-router-dom';

export const CharacterPage = ({ id, lockByDefault }: { id?: string; lockByDefault?: boolean }) => {
  const { characterId } = useParams<{ characterId: string }>();

  const { character, updateCharacter } = useCharacter(id ?? characterId);
  const { updateCharacterWindow, deleteCharacterWindow } = useCharacterWindows(character?.id);
  const { characterAttributes, updateCharacterAttribute } = useCharacterAttributes(character?.id);

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
    const update = new Map(character?.componentData);
    update.set(id, value);
    updateCharacter(character.id, {
      componentData: update,
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
      }}>
      <SheetViewer
        characterId={character?.id}
        lockByDefault={lockByDefault ?? false}
        onWindowUpdated={handleUpdateWindow}
        onWindowDeleted={handleDeleteWindow}
      />
    </CharacterProvider>
  );
};
