import { useParams } from 'react-router-dom';
import { Chart, charts, ChartsQuery, ChartsQueryVariables } from '../../gql';
import { useLazyQuery, useQuery } from '../../utils';
import { useError } from '../metrics';

export const useCharts = (_rulesetId?: string, skip?: boolean) => {
  const { rulesetId } = useParams();
  const { data, loading, error } = useQuery<ChartsQuery, ChartsQueryVariables>(charts, {
    variables: {
      rulesetId: _rulesetId ?? rulesetId ?? '',
    },
    skip: (!_rulesetId && !rulesetId) || skip,
  });

  useError({
    error,
    message: 'Failed to load charts',
  });

  const [query] = useLazyQuery<ChartsQuery, ChartsQueryVariables>(charts, { fetchPolicy: 'network-only' });

  const getCharts = async (providedRulesetId?: string) => {
    if (!rulesetId) return;
    const res = await query({
      variables: {
        rulesetId: providedRulesetId ?? rulesetId,
      },
    });

    if (!res || !res.data?.charts) {
      throw Error('Failed to load charts');
    }

    return [...res.data.charts].sort((a, b) => a.title.localeCompare(b.title));
  };

  const sortedCharts = [...((data?.charts ?? []) as Chart[])].sort((a, b) =>
    a.title.localeCompare(b.title),
  );

  return {
    getCharts,
    charts: sortedCharts,
    loading,
    error,
  };
};
