import {
  Grid,
  type CellRendererProps,
  type GridColumn,
  type GridFilterModel,
  type GridSortModelItem,
} from '@/components';
import { useAttributes } from '@/lib/compass-api/hooks/rulesets/use-attributes';
import type { Attribute } from '@/types';
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
import { attributeChartColumns } from './attribute-columns';

const typeLabels = {
  number: 'Number',
  string: 'Text',
  boolean: 'Boolean',
  list: 'List',
};

const valueTypes = {
  Number: 'number',
  Text: 'string',
  Boolean: 'boolean',
  List: 'list',
};

export const AttributeChart = () => {
  const { attributes, deleteAttribute, updateAttribute } = useAttributes();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialFilterModel = useMemo(
    () => parseFilterFromSearchParams(searchParams),
    [searchParams],
  );
  const initialSortModel = useMemo(
    () => parseSortFromSearchParams(searchParams),
    [searchParams],
  );

  const rows: Partial<Attribute>[] = useMemo(
    () =>
      attributes.map((a) => {
        return {
          ...a,
          type: typeLabels[a.type] as keyof typeof typeLabels,
          defaultValue: a.type === 'number' ? parseInt(a.defaultValue.toString()) : a.defaultValue,
        };
      }),
    [attributes],
  );

  const columns: GridColumn<Attribute>[] = [...attributeChartColumns]
    .map((c) => {
      if (c.field === 'controls') {
        return {
          ...c,
          cellRenderer: (params: CellRendererProps<Attribute>) => (
            <ChartControls
              id={params.data.id}
              type='attribute'
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
          cellRenderer: (params: CellRendererProps<Attribute>) =>
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
          cellRenderer: (params: CellRendererProps<Attribute>) => {
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

  const handleUpdate = (data: Partial<Attribute>) => {
    if (!data.id) {
      console.error('No ID found for attribute');
      return;
    }

    const newType = data.type
      ? (valueTypes[data.type as keyof typeof valueTypes] as Attribute['type'])
      : undefined;

    updateAttribute(data.id, {
      ...data,
      defaultValue: newType === 'number' ? Number(data.defaultValue) : data.defaultValue,
      type: newType,
    });
  };

  const handleDelete = (id: string) => {
    deleteAttribute(id);
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
      rowData={rows}
      colDefs={columns}
      initialFilterModel={initialFilterModel}
      initialSortModel={initialSortModel}
      onCellValueChanged={handleUpdate}
      onFilterChanged={handleFilterChanged}
      onSortChanged={handleSortChanged}
    />
  );
};
