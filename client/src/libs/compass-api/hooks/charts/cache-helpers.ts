import { useApolloClient } from "@apollo/client/react";
import { Chart, chart, UpdateChart } from '../../gql';

export const useCacheHelpers = () => {
  const client = useApolloClient();

  /**
   * Updates the chart in cache.
   */
  const updateChartCacheOnly = (update: UpdateChart): Chart => {
    const res = client.readQuery({
      query: chart,
      variables: {
        input: {
          id: update.id,
          rulesetId: update.rulesetId,
        },
      },
    }) as any;

    if (!res || !res.chart) {
      throw Error('Chart not found in cache');
    }

    client.writeQuery({
      query: chart,
      variables: {
        input: {
          id: update.id,
          rulesetId: update.rulesetId,
        },
      },
      data: {
        chart: {
          ...res.chart,
          ...update,
          data: update.data ? JSON.parse(update.data) : res.chart.data,
        },
      },
    });

    return {
      ...res.chart,
      ...update,
    };
  };

  return {
    updateChartCacheOnly,
  };
};
