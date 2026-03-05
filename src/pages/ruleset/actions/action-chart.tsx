import {
  Grid,
  type CellRendererProps,
  type GridColumn,
  type GridFilterModel,
  type GridSortModelItem,
} from '@/components';
import { useActions } from '@/lib/compass-api';
import type { Action } from '@/types';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChartControls } from '../components';
import {
  encodeFilterForUrl,
  encodeSortForUrl,
  FILTER_PARAM,
  parseFilterFromSearchParams,
  parseSortFromSearchParams,
  SORT_PARAM,
} from '../utils/chart-query-params';
import { actionChartColumns } from './action-columns';

export const ActionChart = () => {
  const { actions, deleteAction, updateAction } = useActions();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialFilterModel = useMemo(
    () => parseFilterFromSearchParams(searchParams),
    [searchParams],
  );
  const initialSortModel = useMemo(
    () => parseSortFromSearchParams(searchParams),
    [searchParams],
  );

  const columns: GridColumn<Action>[] = [...actionChartColumns]
    .map((c) => {
      if (c.field === 'controls') {
        return {
          ...c,
          cellRenderer: (params: CellRendererProps<Action>) => (
            <ChartControls
              id={params.data.id}
              type='action'
              handleDelete={handleDelete}
              handleEdit={(id) =>
                setSearchParams((prev) => {
                  const p = new URLSearchParams(prev);
                  p.set('edit', id);
                  return p;
                })
              }
              title={params.data.title}
            />
          ),
        };
      }
      if (c.field === 'image') {
        return {
          ...c,
          cellRenderer: (params: CellRendererProps<Action>) =>
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
          cellRenderer: (params: CellRendererProps<Action>) => {
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

  const handleUpdate = (data: Partial<Action>) => {
    if (!data.id) {
      console.error('No ID found for action');
      return;
    }

    updateAction(data.id, data);
  };

  const handleDelete = (id: string) => {
    deleteAction(id);
  };

  const handleFilterChanged = (filterModel: GridFilterModel) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (Object.keys(filterModel).length > 0) {
        p.set(FILTER_PARAM, encodeFilterForUrl(filterModel));
      } else {
        p.delete(FILTER_PARAM);
      }
      return p;
    }, { replace: true });
  };

  const handleSortChanged = (sortModel: GridSortModelItem[]) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (sortModel.length > 0) {
        p.set(SORT_PARAM, encodeSortForUrl(sortModel));
      } else {
        p.delete(SORT_PARAM);
      }
      return p;
    }, { replace: true });
  };

  return (
    <Grid
      rowData={actions}
      colDefs={columns}
      initialFilterModel={initialFilterModel}
      initialSortModel={initialSortModel}
      onCellValueChanged={handleUpdate}
      onFilterChanged={handleFilterChanged}
      onSortChanged={handleSortChanged}
    />
  );
};
