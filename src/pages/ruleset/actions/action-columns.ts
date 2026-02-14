import type { GridColumn } from '@/components';
import type { Action } from '@/types';

export const actionChartColumns: GridColumn<Action>[] = [
  {
    field: 'controls',
    headerName: '',
    editable: false,
    sortIndex: 0,
    width: 120,
    resizable: false,
  },
  {
    field: 'image',
    headerName: '',
    editable: false,
    sortIndex: 0,
    width: 60,
    resizable: false,
  },
  {
    field: 'title',
    headerName: 'Title',
    editable: true,
    filter: true,
    sortIndex: 0,
  },
  {
    field: 'category',
    headerName: 'Category',
    editable: true,
    filter: true,
    width: 150,
    sortIndex: 4,
  },
  {
    field: 'description',
    headerName: 'Description',
    editable: true,
    cellEditor: 'agLargeTextCellEditor',
    cellEditorPopup: true,
    sortIndex: 5,
    flex: 1,
    minWidth: 80,
  },
];
