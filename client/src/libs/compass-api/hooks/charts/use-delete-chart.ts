
import { useParams } from 'react-router-dom';
import {
  Chart,
  charts,
  deleteChart as deleteChartMutation,
  DeleteChartMutation,
  DeleteChartMutationVariables,
} from '../../gql';
import { useMutation } from '../../utils';
import { useError } from '../metrics';

interface UseDeleteChart {
  deleteChart: (chart: Chart) => Promise<string>;
  loading: boolean;
  error?: Error;
}

export const useDeleteChart = (): UseDeleteChart => {
  const { rulesetId } = useParams();
  const [deleteMutation, { loading, error }] = useMutation<
    DeleteChartMutation,
    DeleteChartMutationVariables
  >(deleteChartMutation);

  useError({
    error,
    message: 'Failed to delete chart.',
    location: 'useDeleteChart',
  });

  const deleteChart = async (chart: Chart): Promise<string> => {
    if (!rulesetId) return 'failed';
    const res = await deleteMutation({
      variables: {
        input: {
          id: chart.id,
          rulesetId,
        },
      },
      refetchQueries: [{ query: charts, variables: { rulesetId: chart.rulesetId } }],
      awaitRefetchQueries: true,
    });

    if (!res.data?.deleteChart) {
      throw Error('Unabled to delete chart');
    }

    return 'success';
  };

  return {
    deleteChart,
    loading,
    error,
  };
};
