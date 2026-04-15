import { useCharacterWindows, type CharacterWindowUpdate } from '@/lib/compass-api';

export const useCharacterWindowHandlers = (characterId: string) => {
  const { updateCharacterWindow, deleteCharacterWindow } = useCharacterWindows(characterId);

  const handleUpdateWindow = (update: CharacterWindowUpdate) => {
    updateCharacterWindow(update.id, update);
  };

  const handleDeleteWindow = (id: string) => {
    deleteCharacterWindow(id);
  };

  return {
    handleDeleteWindow,
    handleUpdateWindow,
  };
};
