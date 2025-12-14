
import {
  characters,
  deleteCharacter as deleteCharacterMutation,
  DeleteCharacterMutation,
  DeleteCharacterMutationVariables,
} from '../../gql';
import { useMutation } from '../../utils';
import { useError } from '../metrics';

interface UseDeleteCharacter {
  deleteCharacter: (id: string) => Promise<string>;
  loading: boolean;
  error?: Error;
}

export const useDeleteCharacter = (): UseDeleteCharacter => {
  const [deleteMutation, { loading, error }] = useMutation<
    DeleteCharacterMutation,
    DeleteCharacterMutationVariables
  >(deleteCharacterMutation);

  useError({
    error,
    message: 'Failed to delete character.',
    location: 'useDeleteCharacter',
  });

  const deleteCharacter = async (id: string): Promise<string> => {
    const res = await deleteMutation({
      variables: {
        id,
      },
      refetchQueries: [{ query: characters }],
      awaitRefetchQueries: true,
    });

    if (!res.data?.deleteCharacter) {
      throw Error('Unabled to delete character');
    }

    return 'success';
  };

  return {
    deleteCharacter,
    loading,
    error,
  };
};
