
import { useParams } from 'react-router-dom';
import {
  deleteDocument as deleteDocumentMutation,
  DeleteDocumentMutation,
  DeleteDocumentMutationVariables,
  documents,
} from '../../gql';
import { useMutation } from '../../utils';
import { useError } from '../metrics';
import { useRuleset, useUpdateRuleset } from '../rulesets';

interface UseDeleteDocument {
  deleteDocument: (id: string) => Promise<string>;
  loading: boolean;
  error?: Error;
}

export const useDeleteDocument = (): UseDeleteDocument => {
  const { rulesetId } = useParams();
  const { ruleset, details } = useRuleset(rulesetId);
  const { documentFileId } = details;

  const { updateRuleset, loading: updatingRuleset } = useUpdateRuleset();

  const [deleteMutation, { loading, error }] = useMutation<
    DeleteDocumentMutation,
    DeleteDocumentMutationVariables
  >(deleteDocumentMutation);

  useError({
    error,
    message: 'Failed to delete document.',
    location: 'useDeleteDocument',
  });

  const deleteDocument = async (id: string): Promise<string> => {
    if (!rulesetId) return 'failed';
    if (documentFileId === id) {
      await updateRuleset({
        id: rulesetId,
        details: JSON.stringify({
          ...JSON.parse(ruleset?.details || '{}'),
          documentFileId: null,
        }),
      });
    }

    const res = await deleteMutation({
      variables: {
        input: {
          id,
          rulesetId,
        },
      },
      refetchQueries: [{ query: documents, variables: { rulesetId } }],
      awaitRefetchQueries: true,
    });

    if (!res.data?.deleteDocument) {
      throw Error('Unabled to delete document');
    }

    return 'success';
  };

  return {
    deleteDocument,
    loading: loading || updatingRuleset,
    error,
  };
};
