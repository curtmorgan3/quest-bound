
import { useParams } from 'react-router-dom';
import {
  deleteSheetComponents,
  DeleteSheetComponentsMutation,
  DeleteSheetComponentsMutationVariables,
} from '../../gql';
import { useMutation } from '../../utils';
import { useError } from '../metrics';
import { useCacheHelpers } from '../sheets/cache-helpers';

interface UseDeleteComponent {
  deleteComponents: (ids: string[]) => Promise<string>;
  loading: boolean;
  error?: Error;
}

export const useDeleteComponents = (sheetId: string, cacheOnly?: boolean): UseDeleteComponent => {
  const { rulesetId } = useParams();

  const [mutation, { loading, error }] = useMutation<
    DeleteSheetComponentsMutation,
    DeleteSheetComponentsMutationVariables
  >(deleteSheetComponents);

  useError({
    error,
    message: 'Failed to delete components.',
    location: 'useDeleteComponent',
  });

  const { deleteComponentCacheOnly } = useCacheHelpers();

  const deleteComponents = async (ids: string[]): Promise<string> => {
    if (!rulesetId) return '';
    for (const id of ids) {
      deleteComponentCacheOnly(id, sheetId);
    }

    if (cacheOnly) return '';

    const res = await mutation({
      variables: {
        input: ids.map((id) => ({ id, rulesetId, sheetId })),
      },
      // Avoids collision of optimistic updates and responses
      fetchPolicy: 'no-cache',
    });

    if (!res.data?.deleteSheetComponents) {
      throw Error('Unable to delete components');
    }

    return res.data.deleteSheetComponents;
  };

  return {
    deleteComponents,
    loading,
    error,
  };
};
