import { Grid, type CellRendererProps, type GridColumn } from '@/components';
import { useItems } from '@/lib/compass-api';
import type { Item } from '@/types';
import { useSearchParams } from 'react-router-dom';
import { ChartControls } from '../components';
import { itemChartColumns } from './item-columns';

export const ItemChart = () => {
  const { items, deleteItem, updateItem } = useItems();
  const [, setSearchParams] = useSearchParams();

  const columns: GridColumn<Item>[] = [...itemChartColumns]
    .map((c) => {
      if (c.field === 'controls') {
        return {
          ...c,
          cellRenderer: (params: CellRendererProps<Item>) => (
            <ChartControls
              id={params.data.id}
              handleDelete={handleDelete}
              handleEdit={(id) => setSearchParams({ edit: id })}
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

  return <Grid rowData={items} colDefs={columns} onCellValueChanged={handleUpdate} />;
};
