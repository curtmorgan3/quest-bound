import {
  rulesetSalesPage,
  RulesetSalesPage,
  RulesetSalesPageQuery,
  RulesetSalesPageQueryVariables,
} from '../../gql';
import { useLazyQuery, useQuery } from '../../utils';
import { useError } from '../metrics';

export const useRulesetSalesPage = (id?: string) => {
  const { data, loading, error } = useQuery<RulesetSalesPageQuery, RulesetSalesPageQueryVariables>(
    rulesetSalesPage,
    {
      variables: {
        id: id ?? '',
      },
      skip: !id,
    },
  );

  const [lazy, { loading: lazyLoading }] = useLazyQuery<
    RulesetSalesPageQuery,
    RulesetSalesPageQueryVariables
  >(rulesetSalesPage, { fetchPolicy: 'network-only'});

  const getRulesetSalesPage = async (id: string) => {
    const res = await lazy({
      variables: {
        id,
      },
    });

    if (!res.data?.rulesetSalesPage) {
      throw Error('Failed to load ruleset');
    }

    return res.data.rulesetSalesPage as RulesetSalesPage;
  };

  useError({
    error,
    message: 'Failed to load ruleset',
  });

  return {
    salesPage: (data?.rulesetSalesPage as RulesetSalesPage) ?? null,
    getRulesetSalesPage,
    loading: loading || lazyLoading,
    error,
  };
};
