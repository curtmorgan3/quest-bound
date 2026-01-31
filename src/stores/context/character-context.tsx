import type { Character, CharacterAttribute } from '@/types';
import { createContext } from 'react';

type CharacterContext = {
  character: Character;
  characterAttributes: CharacterAttribute[];
  getCharacterAttribute: (attributeId: string) => CharacterAttribute | null;
  updateCharacterAttribute: (id: string, update: Partial<CharacterAttribute>) => void;
  updateCharacterComponentData: (id: string, value: string | boolean | number) => void;
};

export const CharacterContext = createContext<CharacterContext>(null!);
export const CharacterProvider = CharacterContext.Provider;
