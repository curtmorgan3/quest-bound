import { useCallback } from 'react';
import {
  Character,
  character,
  CharacterQuery,
  CharacterQueryVariables,
  Page,
  Sheet,
  streamCharacter,
  StreamCharacterSubscription,
} from '../../gql';
import { useError } from '../metrics';
import { useQuery } from '../../utils';

export const useStreamCharacter = (id?: string) => {
  const { data, loading, error, subscribeToMore } = useQuery<
    CharacterQuery,
    CharacterQueryVariables
  >(character, {
    variables: {
      id: id ?? '',
    },
    skip: !id,
  });

  const subscribeToUpdates = useCallback(
    subscribeToMore({
      document: streamCharacter,
      variables: { id },
      updateQuery: (prev, { subscriptionData }) => {
        const data = subscriptionData.data as unknown as StreamCharacterSubscription;

        return {
          character: {
            ...data.streamCharacter,
            sheet: (prev.character?.sheet ?? {}) as Sheet,
            pages: (prev.character?.pages ?? []) as Page[],
          },
        };
      },
      onError: (err) => {
        console.error(err.message);
      },
    }),
    [],
  );

  useError({
    error,
    message: 'Failed to get stream',
    location: 'useStream',
  });

  return {
    character: data?.character ? (data.character as Character) : null,
    subscribeToUpdates,
    error,
    loading,
  };
};
