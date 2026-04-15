import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export const TITLE_PARAM = 'title';
export const CATEGORY_PARAM = 'category';
export const DEFAULT_CATEGORY = 'all';

export function useListFilterParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const title = useMemo(
    () => searchParams.get(TITLE_PARAM) ?? '',
    [searchParams],
  );

  const category = useMemo(
    () => searchParams.get(CATEGORY_PARAM) ?? DEFAULT_CATEGORY,
    [searchParams],
  );

  const setTitle = useCallback(
    (value: string) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (value.trim()) {
            p.set(TITLE_PARAM, value);
          } else {
            p.delete(TITLE_PARAM);
          }
          return p;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setCategory = useCallback(
    (value: string) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (value && value !== DEFAULT_CATEGORY) {
            p.set(CATEGORY_PARAM, value);
          } else {
            p.delete(CATEGORY_PARAM);
          }
          return p;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return { title, category, setTitle, setCategory };
}
