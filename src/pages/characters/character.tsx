import { useCharacter, useCharacterWindows, type CharacterWindowUpdate } from '@/lib/compass-api';
import { SheetViewer } from '@/lib/compass-planes';
import { useParams } from 'react-router-dom';

export const CharacterPage = () => {
  const { characterId } = useParams<{ characterId: string }>();
  const { character } = useCharacter(characterId);
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
      onWindowUpdated={handleUpdateWindow}
      onWindowDeleted={handleDeleteWindow}
    />
  );
};
