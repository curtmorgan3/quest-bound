import type { GridFilterModel, GridSortModelItem } from '@/components';

export const FILTER_PARAM = 'filter';
export const SORT_PARAM = 'sort';

export function parseFilterFromSearchParams(searchParams: URLSearchParams): GridFilterModel {
  const raw = searchParams.get(FILTER_PARAM);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as GridFilterModel;
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function parseSortFromSearchParams(searchParams: URLSearchParams): GridSortModelItem[] {
  const raw = searchParams.get(SORT_PARAM);
  if (!raw) return [];
  return raw.split(',').reduce<GridSortModelItem[]>((acc, part) => {
    const [colId, sort] = part.trim().split(':');
    if (colId && (sort === 'asc' || sort === 'desc')) {
      acc.push({ colId, sort, sortIndex: acc.length });
    }
    return acc;
  }, []);
}

export function encodeFilterForUrl(model: GridFilterModel): string {
  return encodeURIComponent(JSON.stringify(model));
}

export function encodeSortForUrl(sortModel: GridSortModelItem[]): string {
  return sortModel.map((s) => `${s.colId}:${s.sort}`).join(',');
}
