import { useCallback } from 'react';
import {
  GetSheetComponents,
  SheetComponent,
  sheetComponents,
  SheetComponentsQuery,
  SheetComponentsQueryVariables,
  streamComponents,
  StreamComponentsSubscription,
} from '../../gql';
import { useError } from '../metrics';
import { useQuery } from '../../utils';

export const useStreamComponents = (input: GetSheetComponents) => {
  const {
    data: data,
    loading,
    error,
    subscribeToMore,
  } = useQuery<SheetComponentsQuery, SheetComponentsQueryVariables>(sheetComponents, {
    variables: {
      input,
    },
  });

  const subscribeToUpdates = useCallback(
    subscribeToMore({
      document: streamComponents,
      variables: { input },
      updateQuery: (_, { subscriptionData }) => {
        const data = subscriptionData.data as unknown as StreamComponentsSubscription;

        return {
          sheetComponents: data.streamComponents,
        };
      },
      onError: (err) => {
        console.error(err.message);
      },
    }),
    [],
  );

  useError({
    error,
    message: 'Failed to get stream',
    location: 'useStream',
  });

  return {
    components: (data?.sheetComponents ?? []) as SheetComponent[],
    subscribeToUpdates,
    error,
    loading,
  };
};
