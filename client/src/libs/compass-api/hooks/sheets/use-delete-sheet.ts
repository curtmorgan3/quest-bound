
import { useParams } from 'react-router-dom';
import {
  deleteSheet as deleteSheetMutation,
  DeleteSheetMutation,
  DeleteSheetMutationVariables,
  pageTemplates,
  sheetTemplates,
} from '../../gql';
import { useMutation } from '../../utils';
import { useError } from '../metrics';

interface UseDeleteSheet {
  deleteSheet: (id: string) => Promise<string>;
  loading: boolean;
  error?: Error;
}

export const useDeleteSheet = (): UseDeleteSheet => {
  const { rulesetId } = useParams();

  const [deleteMutation, { loading, error }] = useMutation<
    DeleteSheetMutation,
    DeleteSheetMutationVariables
  >(deleteSheetMutation);

  useError({
    error,
    message: 'Failed to delete sheet.',
    location: 'useDeleteSheet',
  });

  const deleteSheet = async (id: string): Promise<string> => {
    if (!rulesetId) return 'failed';
    const res = await deleteMutation({
      variables: {
        input: {
          id,
          rulesetId,
        },
      },
      refetchQueries: [
        { query: sheetTemplates, variables: { rulesetId } },
        { query: pageTemplates, variables: { rulesetId } },
      ],
      awaitRefetchQueries: true,
    });

    if (!res.data?.deleteSheet) {
      throw Error('Unabled to delete sheet');
    }

    return 'success';
  };

  return {
    deleteSheet,
    loading: loading,
    error,
  };
};
