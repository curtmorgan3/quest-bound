import { Grid, type CellRendererProps, type GridColumn } from '@/components';
import { useItems } from '@/lib/compass-api';
import type { Attribute, Item } from '@/types';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChartControls } from '../components';
import { itemChartColumns } from './item-columns';

export const ItemChart = () => {
  const { items, deleteItem, updateItem } = useItems();
  const [, setSearchParams] = useSearchParams();

  const rows: Partial<Item>[] = useMemo(
    () =>
      items.map((a) => {
        return {
          ...a,
        };
      }),
    [items],
  );

  const columns: GridColumn<Item>[] = [...itemChartColumns]
    .map((c) => {
      if (c.field !== 'controls') return c;
      return {
        ...c,
        cellRenderer: (params: CellRendererProps<Attribute>) => (
          <ChartControls
            id={params.data.id}
            handleDelete={handleDelete}
            handleEdit={(id) => setSearchParams({ edit: id })}
          />
        ),
      };
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

  return <Grid rowData={rows} colDefs={columns} onCellValueChanged={handleUpdate} />;
};
