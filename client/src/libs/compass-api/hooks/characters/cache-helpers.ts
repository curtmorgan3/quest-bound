import { generateId } from '@/libs/compass-web-utils';
import { useApolloClient } from "@apollo/client/react";
import { Character, character, CreateCharacter, Sheet, UpdateCharacter } from '../../gql';
import { useAttributes } from '../attributes';
import { useCacheHelpers as useImageCacheHelpers } from '../storage/cache-helpers';
import { useCurrentUser } from '../user';

export const useCacheHelpers = () => {
  const client = useApolloClient();
  const { getCachedImages } = useImageCacheHelpers();
  const { currentUser } = useCurrentUser();
  const { attributes } = useAttributes();

  const createCharacterCacheOnly = (input: CreateCharacter, sheet?: Sheet): Character => {
    const id = `cache-only-${generateId()}`;

    client.writeQuery({
      query: character,
      variables: {
        id,
      },
      data: {
        character: {
          ...input,
          id,
          streamTabId: null,
          archetypes: [],
          attributes: [],
          pages: [],
          itemData: '[]',
          attributeData: JSON.stringify(
            attributes.map((attribute) => ({
              ...attribute,
              value: attribute.defaultValue,
              archetypeSourceId: '',
            })),
          ),
          image: null,
          sheet,
        },
      },
    });

    return {
      __typename: 'Character',
      id,
      ...input,
      username: currentUser?.username ?? '',
      createdFromPublishedRuleset: false,
      rulesetTitle: '',
      attributes: [],
      itemData: '[]',
      pages: [],
      attributeData: '[]',
      sheet,
    };
  };

  /**
   * Updates the character in cache.
   */
  const updateCharacterCacheOnly = (update: UpdateCharacter): Character => {
    const cachedImages = getCachedImages();

    const res = client.readQuery({
      query: character,
      variables: {
        id: update.id,
      },
    }) as any;

    if (!res || !res.character) {
      throw Error('Character not found in cache');
    }

    let image = undefined;

    if (update.imageId) {
      image = cachedImages.find((i) => i.id === update.imageId);
    }

    client.writeQuery({
      query: character,
      variables: {
        id: update.id,
      },
      data: {
        character: {
          ...res.character,
          ...update,
          image: image ?? res.character.image,
        },
      },
    });

    return {
      ...res.character,
      ...update,
    };
  };

  return {
    createCharacterCacheOnly,
    updateCharacterCacheOnly,
  };
};
