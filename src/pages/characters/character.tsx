import { useCharacter } from '@/lib/compass-api';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

export const Character = () => {
  const { id } = useParams<{ id: string }>();
  const { getCharacter } = useCharacter();

  useEffect(() => {
    const fetchCharacter = async () => {
      if (!id) return;

      const character = await getCharacter(id);
      if (character) {
        console.log('Character name:', character.name);
        console.log('Character inventories:', character.inventories);
      }
    };

    fetchCharacter();
  }, [id, getCharacter]);

  return <p>Character</p>;
};
