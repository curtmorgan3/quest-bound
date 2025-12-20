import { useParams } from 'react-router-dom';
import { Ruleset, rulesets, RulesetsQuery } from '../../gql';
import { useQuery } from '../../utils';
import { useError } from '../metrics';

export const useRulesets = (pollInterval = 0) => {
  const { data, loading, error } = useQuery<RulesetsQuery>(rulesets, {
    pollInterval,
  });

  useError({
    error,
    message: 'Failed to load rulesets',
  });

  const userContent = (data?.rulesets ?? []) as Ruleset[];
  const modules = userContent.filter((ruleset) => ruleset.isModule);
  const userRulesets = userContent.filter((ruleset) => !ruleset.isModule);

  const { rulesetId } = useParams();
  const lastEditedRulesetId = localStorage.getItem('qb.lastEditedRulesetId');
  const rulesetIdToUse = rulesetId && rulesetId !== 'undefined' ? rulesetId : lastEditedRulesetId;

  const activeRuleset = rulesetId ? userRulesets?.find((r) => r.id === rulesetIdToUse) : null;

  return {
    rulesets: userRulesets,
    activeRuleset,
    modules,
    loading,
    error,
  };
};
