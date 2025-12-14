import { useApolloClient } from "@apollo/client/react";
import { useParams } from 'react-router-dom';
import { ruleset, RulesetQuery, RulesetQueryVariables, UpdateRuleset } from '../../gql';

export const useCacheHelpers = () => {
  const client = useApolloClient();
  const { rulesetId } = useParams();

  const updateRulesetCacheOnly = (update: UpdateRuleset): string => {
    const res = client.readQuery<RulesetQuery, RulesetQueryVariables>({
      query: ruleset,
      variables: {
        id: update.id ?? rulesetId,
      },
    });

    if (!res || !res.ruleset) {
      throw Error('Ruleset not found in cache');
    }

    client.writeQuery({
      query: ruleset,
      variables: {
        id: rulesetId,
      },
      data: {
        ruleset: {
          ...res.ruleset,
          ...update,
          details: JSON.stringify({
            ...JSON.parse(res.ruleset.details),
            ...JSON.parse(update?.details ?? '{}'),
          }),
        },
      },
    });

    return 'success';
  };

  return {
    updateRulesetCacheOnly,
  };
};
