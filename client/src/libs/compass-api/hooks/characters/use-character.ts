import {
  Character,
  character as characterQuery,
  CharacterQuery,
  CharacterQueryVariables,
} from '../../gql';
import { useLazyQuery, useQuery } from '../../utils';
import { useError } from '../metrics';

export const useCharacter = (id?: string, opt?: { cacheOnly?: boolean }) => {
  const { data, loading, error } = useQuery<CharacterQuery, CharacterQueryVariables>(
    characterQuery,
    {
      variables: {
        id: id ?? '',
      },
      skip: !id,
      fetchPolicy: opt?.cacheOnly ? 'cache-only' : undefined,
    },
  );

  useError({
    error,
    message: 'Failed to load character',
    location: 'useCharacter',
  });

  const [query, { error: lazyError, loading: lazyLoading }] = useLazyQuery<
    CharacterQuery,
    CharacterQueryVariables
  >(characterQuery);

  useError({
    error: lazyError,
    message: 'Failed to load character',
    location: 'useCharacters',
  });

  const getCharacter = async (
    id: string,
    opt?: { fetchPolicy?: 'cache-only' | 'network-only' },
  ) => {
    const res = await query({
      variables: {
        id,
      },
    });

    if (opt?.fetchPolicy) {
      console.warn(`Deprecated fetch policy provided to getCharacter: ${opt?.fetchPolicy}`)
    }

    if (!res.data?.character) {
      throw Error('Failed to load character');
    }

    return res.data.character as Character;
  };

  return {
    getCharacter,
    character: data?.character ? (data.character as Character) : null,
    error: error || lazyError,
    loading: loading || lazyLoading,
  };
};
