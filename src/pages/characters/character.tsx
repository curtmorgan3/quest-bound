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

  const { character } = useCharacter(id ?? characterId);
  const { updateCharacterWindow, deleteCharacterWindow } = useCharacterWindows(character?.id);
  const { characterAttributes } = useCharacterAttributes(character?.id);

  const handleUpdateWindow = (update: CharacterWindowUpdate) => {
    updateCharacterWindow(update.id, update);
  };

  const handleDeleteWindow = (id: string) => {
    deleteCharacterWindow(id);
  };

  const handleUpdateCharacterAttribute = (update: Partial<CharacterAttribute>) => {};
  const getCharacterAttribute = (id: string) => {
    return characterAttributes.find((attr) => attr.id === id) ?? null;
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
