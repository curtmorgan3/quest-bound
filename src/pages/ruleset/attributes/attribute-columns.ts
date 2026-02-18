import type { GridColumn } from '@/components';
import type { Attribute } from '@/types';

export const attributeChartColumns: GridColumn<Attribute>[] = [
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
    sortIndex: 1,
    width: 60,
    resizable: false,
  },
  {
    field: 'title',
    headerName: 'Title',
    editable: true,
    filter: true,
    sortIndex: 2,
  },
  {
    field: 'category',
    headerName: 'Category',
    editable: true,
    filter: true,
    width: 150,
    sortIndex: 3,
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
    sortIndex: 4,
  },
  {
    field: 'defaultValue',
    headerName: 'Default',
    cellDataType: false,
    editable: true,
    filter: true,
    width: 100,
    sortIndex: 5,
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
    sortIndex: 6,
  },
  {
    field: 'max',
    headerName: 'Max',
    editable: true,
    filter: true,
    width: 100,
    sortIndex: 7,
  },
  {
    field: 'description',
    headerName: 'Description',
    editable: true,
    cellEditor: 'agLargeTextCellEditor',
    cellEditorPopup: true,
    sortIndex: 8,
    flex: 1,
    minWidth: 80,
  },
];
