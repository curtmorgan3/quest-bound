import { useCharacter, useCharacterWindows, type CharacterWindowUpdate } from '@/lib/compass-api';
import { SheetViewer } from '@/lib/compass-planes';
import { useParams } from 'react-router-dom';

export const CharacterPage = ({ id, lockByDefault }: { id?: string; lockByDefault?: boolean }) => {
  const { characterId } = useParams<{ characterId: string }>();

  const { character } = useCharacter(id ?? characterId);
  const { updateCharacterWindow, deleteCharacterWindow } = useCharacterWindows(character?.id);

  const handleUpdateWindow = (update: CharacterWindowUpdate) => {
    updateCharacterWindow(update.id, update);
  };

  const handleDeleteWindow = (id: string) => {
    deleteCharacterWindow(id);
  };

  return (
    <SheetViewer
      characterId={character?.id}
      lockByDefault={lockByDefault ?? false}
      onWindowUpdated={handleUpdateWindow}
      onWindowDeleted={handleDeleteWindow}
    />
  );
};
