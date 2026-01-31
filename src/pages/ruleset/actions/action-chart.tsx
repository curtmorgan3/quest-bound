import { Grid, type CellRendererProps, type GridColumn } from '@/components';
import { useActions } from '@/lib/compass-api';
import type { Action } from '@/types';
import { useSearchParams } from 'react-router-dom';
import { ChartControls } from '../components';
import { actionChartColumns } from './action-columns';

export const ActionChart = () => {
  const { actions, deleteAction, updateAction } = useActions();
  const [, setSearchParams] = useSearchParams();

  const columns: GridColumn<Action>[] = [...actionChartColumns]
    .map((c) => {
      if (c.field === 'controls') {
        return {
          ...c,
          cellRenderer: (params: CellRendererProps<Action>) => (
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

  return <Grid rowData={actions} colDefs={columns} onCellValueChanged={handleUpdate} />;
};
