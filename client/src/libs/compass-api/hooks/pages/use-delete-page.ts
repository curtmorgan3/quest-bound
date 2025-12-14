
import { useParams } from 'react-router-dom';
import {
  character,
  deletePage as deletePageMutation,
  DeletePageMutation,
  DeletePageMutationVariables,
  pages,
} from '../../gql';
import { useMutation } from '../../utils';
import { useError } from '../metrics';

interface UseDeletePage {
  deletePage: (id: string, rulesetId?: string) => Promise<string>;
  loading: boolean;
  error?: Error;
}

export const useDeletePage = (): UseDeletePage => {
  const { rulesetId, characterId } = useParams();

  const [deleteMutation, { loading, error }] = useMutation<
    DeletePageMutation,
    DeletePageMutationVariables
  >(deletePageMutation);

  useError({
    error,
    message: 'Failed to delete page.',
    location: 'useDeletePage',
  });

  const deletePage = async (id: string): Promise<string> => {
    if (!rulesetId) return 'failed';
    const res = await deleteMutation({
      variables: {
        input: {
          id,
          rulesetId,
        },
      },
      refetchQueries: !characterId
        ? [{ query: pages, variables: { rulesetId } }]
        : [
            { query: pages, variables: { rulesetId } },
            // For character journal pages
            { query: character, variables: { id: characterId } },
          ],
      awaitRefetchQueries: true,
    });

    if (!res.data?.deletePage) {
      throw Error('Unabled to delete page');
    }

    return 'success';
  };

  return {
    deletePage,
    loading,
    error,
  };
};
