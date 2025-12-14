
import {
  characters,
  deleteRuleset as deleteRulesetMutation,
  DeleteRulesetMutation,
  DeleteRulesetMutationVariables,
  rulesets,
} from '../../gql';
import { useMutation } from '../../utils';
import { useError } from '../metrics';

interface UseDeleteRuleset {
  deleteRuleset: (id: string) => Promise<string>;
  loading: boolean;
  error?: Error;
}

export const useDeleteRuleset = (): UseDeleteRuleset => {
  const [deleteMutation, { loading, error }] = useMutation<
    DeleteRulesetMutation,
    DeleteRulesetMutationVariables
  >(deleteRulesetMutation, {
    refetchQueries: [{ query: characters }],
  });

  useError({
    error,
    message: 'Failed to delete ruleset.',
    location: 'useDeleteSheet',
  });

  const deleteRuleset = async (id: string): Promise<string> => {
    const res = await deleteMutation({
      variables: {
        input: {
          id,
        },
      },
      refetchQueries: [{ query: rulesets }],
      awaitRefetchQueries: true,
    });

    if (!res.data?.deleteRuleset) {
      throw Error('Unabled to delete ruleset');
    }

    return 'success';
  };

  return {
    deleteRuleset,
    loading,
    error,
  };
};
