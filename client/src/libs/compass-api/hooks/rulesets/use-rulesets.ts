import { useRulesetStore } from '@/stores';
import { useEffect } from 'react';
import { useError } from '../metrics';

export const useRulesets = (pollInterval = 0) => {
  const { rulesets, modules, loading, error, loadRulesets } = useRulesetStore();

  useError({
    error,
    message: 'Failed to load rulesets',
  });

  useEffect(() => {
    if (!loading) return;
    loadRulesets();
  }, [loading]);

  return {
    rulesets,
    modules,
    loading,
    error,
  };
};
