import { useParams } from 'react-router-dom';
import {
  attributes,
  AttributeType,
  deleteAttribute as deleteAttributeMutation,
  DeleteAttributeMutation,
  DeleteAttributeMutationVariables,
} from '../../gql';
import { useMutation } from '../../utils';
import { useError } from '../metrics';

interface UseDeleteAttribute {
  deleteAttribute: (id: string) => Promise<string>;
  loading: boolean;
  error?: Error;
}

export const useDeleteAttribute = (): UseDeleteAttribute => {
  const { rulesetId } = useParams();

  const [deleteMutation, { loading, error }] = useMutation<
    DeleteAttributeMutation,
    DeleteAttributeMutationVariables
  >(deleteAttributeMutation);

  useError({
    error,
    message: 'Failed to delete attribute.',
    location: 'useDeleteAttribute',
  });

  const deleteAttribute = async (id: string): Promise<string> => {
    if (!rulesetId) return 'failed';
    const res = await deleteMutation({
      variables: {
        input: {
          id,
          rulesetId,
        },
      },
      refetchQueries: [
        { query: attributes, variables: { rulesetId } },
        { query: attributes, variables: { rulesetId, type: AttributeType.ITEM } },
      ],
      awaitRefetchQueries: true,
    });

    if (!res.data?.deleteAttribute) {
      throw Error('Unabled to delete attribute');
    }

    return 'success';
  };

  return {
    deleteAttribute,
    loading,
    error,
  };
};
