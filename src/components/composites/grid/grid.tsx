/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  type GridApi as _GridApi,
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { useRef } from 'react';
import './grid.css';

ModuleRegistry.registerModules([AllCommunityModule]);

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface GridColumn<T> extends ColDef {}
export type CellRendererProps<T> = { data: T };
export type GridApi = _GridApi;

/** Filter model from AG Grid (colId -> filter params). */
export type GridFilterModel = Record<string, unknown>;

/** Sort state for a single column. */
export interface GridSortModelItem {
  colId: string;
  sort: 'asc' | 'desc';
  sortIndex?: number;
}

interface Props<T> {
  rowData: T[];
  colDefs: GridColumn<T>[];
  initialFilterModel?: GridFilterModel;
  initialSortModel?: GridSortModelItem[];
  onSelectionChanged?: (selections: T[]) => void;
  onCellValueChanged?: (data: T, columnId: string, rowIndex: number | null) => void;
  onDragEnd?: (api: GridApi) => void;
  onDragStopped?: (api: GridApi) => void;
  onDragLeave?: (api: GridApi) => void;
  onDragEnter?: (api: GridApi) => void;
  onColumnMoved?: (e: GridApi) => void;
  onGridReady?: (api: GridApi) => void;
  onFilterChanged?: (filterModel: GridFilterModel) => void;
  onSortChanged?: (sortModel: GridSortModelItem[]) => void;
}

export const Grid = <T,>({
  rowData,
  colDefs,
  initialFilterModel,
  initialSortModel,
  onSelectionChanged,
  onCellValueChanged,
  onDragEnd,
  onDragLeave,
  onDragEnter,
  onDragStopped,
  onColumnMoved,
  onGridReady,
  onFilterChanged,
  onSortChanged,
}: Props<T>) => {
  const skipNextFilterRef = useRef(false);
  const skipNextSortRef = useRef(false);

  const handleGridReady = (e: { api: GridApi }) => {
    const api = e.api;
    if (initialFilterModel != null && Object.keys(initialFilterModel).length > 0) {
      skipNextFilterRef.current = true;
      api.setFilterModel(initialFilterModel);
    }
    if (initialSortModel != null && initialSortModel.length > 0) {
      skipNextSortRef.current = true;
      api.applyColumnState({
        state: initialSortModel.map((s, i) => ({
          colId: s.colId,
          sort: s.sort,
          sortIndex: s.sortIndex ?? i,
        })),
        applyOrder: true,
      });
    }
    onGridReady?.(api);
  };

  const handleFilterChanged = (e: { api: GridApi; source?: string }) => {
    if (skipNextFilterRef.current) {
      skipNextFilterRef.current = false;
      return;
    }
    if (e.source !== 'api') {
      onFilterChanged?.(e.api.getFilterModel() ?? {});
    }
  };

  const handleSortChanged = (e: { api: GridApi; source?: string }) => {
    if (skipNextSortRef.current) {
      skipNextSortRef.current = false;
      return;
    }
    if (e.source !== 'api') {
      const state = e.api.getColumnState?.() ?? [];
      const sortModel: GridSortModelItem[] = state
        .filter((col): col is { colId: string; sort: 'asc' | 'desc'; sortIndex?: number } => col.sort != null)
        .map((col) => ({ colId: col.colId, sort: col.sort, sortIndex: col.sortIndex }));
      onSortChanged?.(sortModel);
    }
  };

  return (
    <div className='ag-theme-quartz-dark w-full h-full'>
      <AgGridReact
        rowData={rowData}
        columnDefs={colDefs}
        rowDragManaged
        onGridReady={handleGridReady}
        onFilterChanged={handleFilterChanged}
        onSortChanged={handleSortChanged}
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
        onCellValueChanged={(e) => onCellValueChanged?.(e.data, e.column.getColId(), e.rowIndex)}
      />
    </div>
  );
};
