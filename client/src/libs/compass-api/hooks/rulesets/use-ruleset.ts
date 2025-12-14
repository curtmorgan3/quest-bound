import { Ruleset, ruleset, RulesetQuery, RulesetQueryVariables } from '../../gql';
import { PermissionType } from '../../types';
import { useLazyQuery, useQuery } from '../../utils';
import { useError } from '../metrics';

export const useRuleset = (id?: string) => {
  const { data, loading, error } = useQuery<RulesetQuery, RulesetQueryVariables>(ruleset, {
    variables: {
      id: id ?? '',
    },
    skip: !id,
  });

  const [lazy] = useLazyQuery<RulesetQuery, RulesetQueryVariables>(ruleset);

  useError({
    error,
    message: 'Failed to load ruleset',
  });

  const getRuleset = async (id: string, fetchPolicy?: 'network-only' | 'cache-only') => {
    const res = await lazy({
      variables: {
        id,
      },
    });

    if (fetchPolicy) {
      console.warn(`Deprecated fetch policy passed to getRuleset: ${fetchPolicy}`)
    }

    if (!res.data?.ruleset) {
      throw Error('Failed to load ruleset');
    }

    return res.data.ruleset as Ruleset;
  };

  const canEdit = data?.ruleset?.permissions.includes(PermissionType.WRITE) ?? false;
  const canPublish = Boolean(data?.ruleset) && !data?.ruleset?.publishedRulesetId;
  const details = JSON.parse(data?.ruleset?.details ?? '{}');

  return {
    ruleset: (data?.ruleset as Ruleset) ?? null,
    details,
    getRuleset,
    canEdit,
    canPublish,
    loading,
    error,
  };
};
