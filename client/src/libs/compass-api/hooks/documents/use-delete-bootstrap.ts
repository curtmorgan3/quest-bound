
import { useParams } from 'react-router-dom';
import {
  deleteBootstrap as deleteBootstrapMutation,
  DeleteBootstrapMutation,
  DeleteBootstrapMutationVariables,
  pages,
} from '../../gql';
import { useMutation } from '../../utils';
import { useError } from '../metrics';

interface UseDeleteDocument {
  deleteBootstrap: () => Promise<string>;
  loading: boolean;
  error?: Error;
}

export const useDeleteBootstrap = (): UseDeleteDocument => {
  const { rulesetId } = useParams();

  const [deleteMutation, { loading, error }] = useMutation<
    DeleteBootstrapMutation,
    DeleteBootstrapMutationVariables
  >(deleteBootstrapMutation);

  useError({
    error,
    message: 'Failed to delete auto generated pages.',
    location: 'useDeleteDocument',
  });

  const deleteBootstrap = async (): Promise<string> => {
    if (!rulesetId) return 'failed';
    const res = await deleteMutation({
      variables: {
        rulesetId,
      },
      refetchQueries: [{ query: pages, variables: { rulesetId } }],
      awaitRefetchQueries: true,
    });

    if (!res.data?.deleteBootstrap) {
      throw Error('Unabled to delete pages');
    }

    return 'success';
  };

  return {
    deleteBootstrap,
    loading,
    error,
  };
};
