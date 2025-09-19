/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  type GridApi as _GridApi,
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import './grid.css';

ModuleRegistry.registerModules([AllCommunityModule]);

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface GridColumn<T> extends ColDef {}
export type CellRendererProps<T> = { data: T };
export type GridApi = _GridApi;

interface Props<T> {
  rowData: T[];
  colDefs: GridColumn<T>[];
  onSelectionChanged?: (selections: T[]) => void;
  onCellValueChanged?: (data: T, columnId: string) => void;
  onDragEnd?: (api: GridApi) => void;
  onDragStopped?: (api: GridApi) => void;
  onDragLeave?: (api: GridApi) => void;
  onDragEnter?: (api: GridApi) => void;
  onColumnMoved?: (e: GridApi) => void;
}

export const Grid = <T,>({
  rowData,
  colDefs,
  onSelectionChanged,
  onCellValueChanged,
  onDragEnd,
  onDragLeave,
  onDragEnter,
  onDragStopped,
  onColumnMoved,
}: Props<T>) => {
  return (
    <div className='ag-theme-quartz-dark w-full h-full'>
      <AgGridReact
        rowData={rowData}
        columnDefs={colDefs}
        rowDragManaged
        onColumnMoved={(e) => {
          onColumnMoved?.(e.api);
        }}
        onRowDragEnd={(e) => {
          onDragEnd?.(e.api);
        }}
        onDragStopped={(e) => {
          onDragStopped?.(e.api);
        }}
        onRowDragLeave={(e) => {
          onDragLeave?.(e.api);
        }}
        onRowDragEnter={(e) => {
          onDragEnter?.(e.api);
        }}
        onSelectionChanged={(e) => onSelectionChanged?.(e.api.getSelectedRows())}
        onCellValueChanged={(e) => onCellValueChanged?.(e.data, e.column.getColId())}
      />
    </div>
  );
};
