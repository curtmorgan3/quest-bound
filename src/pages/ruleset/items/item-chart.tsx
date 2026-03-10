import {
  Grid,
  type CellRendererProps,
  type GridColumn,
  type GridFilterModel,
  type GridSortModelItem,
} from '@/components';
import { useActiveRuleset, useItems } from '@/lib/compass-api';
import type { Item } from '@/types';
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useRulesetFiltersStore } from '@/stores/ruleset-filters-store';
import { ChartControls } from '../components';
import {
  encodeFilterForUrl,
  encodeSortForUrl,
  FILTER_PARAM,
  parseFilterFromSearchParams,
  parseSortFromSearchParams,
  SORT_PARAM,
} from '../utils/chart-query-params';
import { itemChartColumns } from './item-columns';

export const ItemChart = () => {
  const { activeRuleset } = useActiveRuleset();
  const { items, deleteItem, updateItem } = useItems();
  const [searchParams, setSearchParams] = useSearchParams();
  const setGridFilters = useRulesetFiltersStore((s) => s.setGridFilters);
  const getGridFilters = useRulesetFiltersStore((s) => s.getGridFilters);

  const rulesetId = activeRuleset?.id;

  useEffect(() => {
    if (!rulesetId) return;
    const filter = searchParams.get(FILTER_PARAM);
    const sort = searchParams.get(SORT_PARAM);
    if (filter !== null || sort !== null) {
      setGridFilters(rulesetId, 'items', {
        filter: filter ?? undefined,
        sort: sort ?? undefined,
      });
    }
  }, [rulesetId, searchParams, setGridFilters]);

  useEffect(() => {
    if (!rulesetId) return;
    const stored = getGridFilters(rulesetId, 'items');
    if (!stored?.filter && !stored?.sort) return;
    const urlFilter = searchParams.get(FILTER_PARAM);
    const urlSort = searchParams.get(SORT_PARAM);
    if (urlFilter !== null && urlSort !== null) return;
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (urlFilter === null && stored.filter) p.set(FILTER_PARAM, stored.filter);
        if (urlSort === null && stored.sort) p.set(SORT_PARAM, stored.sort);
        return p;
      },
      { replace: true },
    );
  }, [rulesetId, getGridFilters, setSearchParams]);

  const initialFilterModel = useMemo(
    () => parseFilterFromSearchParams(searchParams),
    [searchParams],
  );
  const initialSortModel = useMemo(
    () => parseSortFromSearchParams(searchParams),
    [searchParams],
  );

  const columns: GridColumn<Item>[] = [...itemChartColumns]
    .map((c) => {
      if (c.field === 'controls') {
        return {
          ...c,
          cellRenderer: (params: CellRendererProps<Item>) => (
            <ChartControls
              id={params.data.id}
              type='item'
              handleDelete={handleDelete}
              handleEdit={(id) =>
                setSearchParams((prev) => {
                  const p = new URLSearchParams(prev);
                  p.set('edit', id);
                  return p;
                })
              }
              item={params.data}
              title={params.data.title}
            />
          ),
        };
      }
      if (c.field === 'image') {
        return {
          ...c,
          cellRenderer: (params: CellRendererProps<Item>) =>
            params.data.image ? (
              <img
                src={params.data.image}
                alt={params.data.title}
                className='w-10 h-10 object-cover rounded'
              />
            ) : null,
        };
      }
      if (c.field === 'title') {
        return {
          ...c,
          cellRenderer: (params: CellRendererProps<Item>) => {
            const value = (params as { value?: string }).value ?? params.data.title;
            return (
              <span className={params.data.moduleId ? 'text-module-origin' : undefined}>
                {value}
              </span>
            );
          },
        };
      }
      return c;
    })
    .sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0));

  const handleUpdate = (data: Partial<Item>) => {
    if (!data.id) {
      console.error('No ID found for item');
      return;
    }

    updateItem(data.id, {
      ...data,
    });
  };

  const handleDelete = (id: string) => {
    deleteItem(id);
  };

  const handleFilterChanged = (filterModel: GridFilterModel) => {
    const filterValue =
      Object.keys(filterModel).length > 0 ? encodeFilterForUrl(filterModel) : null;
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (filterValue) p.set(FILTER_PARAM, filterValue);
      else p.delete(FILTER_PARAM);
      return p;
    }, { replace: true });
    if (rulesetId) setGridFilters(rulesetId, 'items', { filter: filterValue });
  };

  const handleSortChanged = (sortModel: GridSortModelItem[]) => {
    const sortValue = sortModel.length > 0 ? encodeSortForUrl(sortModel) : null;
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (sortValue) p.set(SORT_PARAM, sortValue);
      else p.delete(SORT_PARAM);
      return p;
    }, { replace: true });
    if (rulesetId) setGridFilters(rulesetId, 'items', { sort: sortValue });
  };

  return (
    <Grid
      rowData={items}
      colDefs={columns}
      getRowId={({ data }) => data.id}
      initialFilterModel={initialFilterModel}
      initialSortModel={initialSortModel}
      onCellValueChanged={handleUpdate}
      onFilterChanged={handleFilterChanged}
      onSortChanged={handleSortChanged}
    />
  );
};
