import { useCharacter, useCharacterWindows, type CharacterWindowUpdate } from '@/lib/compass-api';
import { SheetViewer } from '@/lib/compass-planes';
import { useParams } from 'react-router-dom';

export const CharacterPage = () => {
  const { id } = useParams<{ id: string }>();
  const { character } = useCharacter(id);
  const { windows } = useCharacterWindows(character?.id);

  console.log('Character name:', character?.name, windows);

  const handleUpdateWindow = (update: CharacterWindowUpdate) => {
    console.log(update);
  };

  const handleDeleteWindow = (id: string) => {
    console.log('delete: ', id);
  };

  return (
    <SheetViewer
      characterId={character?.id}
      onWindowUpdated={handleUpdateWindow}
      onWindowDeleted={handleDeleteWindow}
    />
  );
};
