import type { GridColumn } from '@/components';
import type { Attribute } from '@/types';

export const attributeChartColumns: GridColumn<Attribute>[] = [
  {
    field: 'title',
    headerName: 'Title',
    editable: true,
    filter: true,
    sortIndex: 0,
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
    sortIndex: 1,
  },
  {
    field: 'defaultValue',
    headerName: 'Default',
    cellDataType: false,
    editable: true,
    filter: true,
    width: 100,
    sortIndex: 2,
    cellRendererSelector: (params) => {
      if (params.data.type === 'Boolean') {
        return { component: 'agCheckboxCellRenderer' };
      }
      return undefined;
    },
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
  {
    field: 'controls',
    headerName: 'Controls',
    editable: false,
    sortIndex: 7,
    width: 100,
    resizable: false,
  },
];
