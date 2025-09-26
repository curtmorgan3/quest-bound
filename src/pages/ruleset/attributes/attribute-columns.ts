import type { GridColumn } from '@/components';
import type { Attribute } from '@/types';

export const attributeChartColumns: GridColumn<Attribute>[] = [
  {
    field: 'controls',
    headerName: '',
    editable: false,
    sortIndex: 0,
    width: 100,
    resizable: false,
  },
  {
    field: 'title',
    headerName: 'Title',
    editable: true,
    filter: true,
    sortIndex: 1,
  },
  {
    field: 'category',
    headerName: 'Category',
    editable: true,
    filter: true,
    width: 150,
    sortIndex: 2,
  },
  {
    field: 'type',
    headerName: 'Type',
    editable: true,
    filter: true,
    width: 100,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: {
      values: ['Number', 'Text', 'Boolean', 'List'],
    },
    sortIndex: 3,
  },
  {
    field: 'defaultValue',
    headerName: 'Default',
    cellDataType: false,
    editable: true,
    filter: true,
    width: 100,
    sortIndex: 4,
    cellRendererSelector: (params) => {
      if (params.data.type === 'Boolean') {
        return { component: 'agCheckboxCellRenderer' };
      }
      return undefined;
    },
  },
  {
    field: 'min',
    headerName: 'Min',
    editable: true,
    filter: true,
    width: 100,
    sortIndex: 5,
  },
  {
    field: 'max',
    headerName: 'Max',
    editable: true,
    filter: true,
    width: 100,
    sortIndex: 6,
  },
  {
    field: 'description',
    headerName: 'Description',
    editable: true,
    cellEditor: 'agLargeTextCellEditor',
    cellEditorPopup: true,
    sortIndex: 7,
    flex: 1,
    minWidth: 80,
  },
];
