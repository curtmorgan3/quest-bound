import { Grid, type CellRendererProps, type GridColumn } from '@/components';
import { useActions } from '@/lib/compass-api';
import type { Action, Attribute } from '@/types';
import { useSearchParams } from 'react-router-dom';
import { ChartControls } from '../components';
import { actionChartColumns } from './action-columns';

export const ActionChart = () => {
  const { actions, deleteAction, updateAction } = useActions();
  const [, setSearchParams] = useSearchParams();

  const columns: GridColumn<Attribute>[] = [...actionChartColumns]
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
