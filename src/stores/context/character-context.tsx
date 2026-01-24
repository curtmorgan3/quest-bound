import type { Character, CharacterAttribute } from '@/types';
import { createContext } from 'react';

type CharacterContext = {
  character: Character;
  characterAttributes: CharacterAttribute[];
  getCharacterAttribute: (id: string) => CharacterAttribute | null;
  updateCharacterAttribute: (update: Partial<CharacterAttribute>) => void;
};

export const CharacterContext = createContext<CharacterContext>(null!);
export const CharacterProvider = CharacterContext.Provider;
