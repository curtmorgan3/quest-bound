
import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Sheet, sheet, SheetQuery, SheetQueryVariables } from '../../gql';
import { QueryFunction } from '../../types';
import { useLazyQuery, useQuery } from '../../utils';
import { useError } from '../metrics';

interface UseGetSheets {
  getSheet: QueryFunction<string, Sheet>;
  sheet?: Sheet;
  loading: boolean;
  error?: Error;
}

export const useGetSheet = (id?: string, cacheOnly?: boolean): UseGetSheets => {
  const { rulesetId } = useParams();

  const attempted = useRef<boolean>(false);

  const { data, loading, error } = useQuery<SheetQuery, SheetQueryVariables>(sheet, {
    variables: {
      input: {
        id: id || '',
        rulesetId: rulesetId || '',
      },
    },
    skip: !id || !rulesetId || attempted.current,
    fetchPolicy: cacheOnly ? 'cache-only' : undefined,
  });

  useEffect(() => {
    if (error) {
      attempted.current = true;
    }

    if (data) {
      attempted.current = false;
    }
  }, [data, error]);

  useError({
    error: error,
    message: 'Error retrieving sheet',
  });

  const [query, { loading: lazyLoading, error: lazyError }] = useLazyQuery<
    SheetQuery,
    SheetQueryVariables
  >(sheet, {
    fetchPolicy: cacheOnly ? 'cache-only' : undefined,
  });

  const getSheet = async (id: string): Promise<Sheet> => {
    if (!rulesetId) throw Error('Ruleset not found');
    const res = await query({
      variables: { input: { id, rulesetId } },
      
    });

    if (!res.data?.sheet) {
      throw Error('Sheet not found');
    }

    return res.data.sheet;
  };

  return {
    getSheet,
    sheet: data?.sheet,
    loading: loading || lazyLoading,
    error: error || lazyError,
  };
};
