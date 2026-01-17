import { useCharacter, useCharacterWindows } from '@/lib/compass-api';
import { SheetViewer } from '@/lib/compass-planes';
import { useParams } from 'react-router-dom';

export const CharacterPage = () => {
  const { id } = useParams<{ id: string }>();
  const { character } = useCharacter(id);
  const { windows } = useCharacterWindows(character?.id);

  console.log('Character name:', character?.name, windows);

  return <SheetViewer windowIds={[]} />;
};
