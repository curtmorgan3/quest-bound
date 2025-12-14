
import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  SheetComponent,
  sheetComponents,
  SheetComponentsQuery,
  SheetComponentsQueryVariables,
} from '../../gql';
import { useLazyQuery, useQuery } from '../../utils';
import { useError } from '../metrics';

interface UseComponents {
  components: SheetComponent[];
  getComponents: (sheetId: string) => Promise<SheetComponent[]>;
  loading: boolean;
  error?: Error;
}

export const useComponents = (
  sheetId?: string,
  cacheOnly?: boolean,
  tabId?: string,
): UseComponents => {
  const { rulesetId } = useParams();

  const attempted = useRef<boolean>(false);

  const { data, loading, error } = useQuery<SheetComponentsQuery, SheetComponentsQueryVariables>(
    sheetComponents,
    {
      variables: {
        input: {
          sheetId: sheetId ?? '',
          rulesetId: rulesetId ?? '',
          tabId,
        },
      },
      skip: !sheetId || attempted.current || !rulesetId,
      fetchPolicy: cacheOnly ? 'cache-only' : undefined,
    },
  );

  useEffect(() => {
    if (error) {
      attempted.current = true;
    }

    if (data) {
      attempted.current = false;
    }
  }, [data, error]);

  useError({
    error,
    message: 'Error retrieving sheet components',
  });

  const [query, { loading: lazyLoading, error: lazyError }] = useLazyQuery<
    SheetComponentsQuery,
    SheetComponentsQueryVariables
  >(sheetComponents, {
    fetchPolicy: cacheOnly ? 'cache-only' : undefined,
  });

  const getComponents = async (sheetId: string, tabId?: string) => {
    if (!rulesetId) return [];
    const res = await query({
      variables: {
        input: {
          sheetId,
          rulesetId,
          tabId,
        },
      },
    });

    return (res.data?.sheetComponents ?? []) as SheetComponent[];
  };

  return {
    components: (data?.sheetComponents ?? []) as SheetComponent[],
    getComponents,
    loading: loading || lazyLoading,
    error: error || lazyError,
  };
};
