import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Grid,
  Input,
  type CellRendererProps,
  type GridColumn,
} from '@/components';
import { useCharts } from '@/lib/compass-api';
import { ChevronDown, ChevronUp, Pencil, Plus, Trash } from 'lucide-react';
import { useState } from 'react';

interface ChartEditorProps {
  chartId: string;
  /** When true, chart is view-only (e.g. on character chart route). */
  readOnly?: boolean;
  /** Optional ruleset id to load charts from (e.g. character's ruleset when viewing on character page). */
  rulesetId?: string;
}

function normalizeFieldName(name: string) {
  return name.trim().replace(/ /g, '-').toLowerCase();
}

export const ChartEditor = ({ chartId, readOnly = false, rulesetId }: ChartEditorProps) => {
  const { charts, updateChart } = useCharts(rulesetId);
  const [editColumnsOpen, setEditColumnsOpen] = useState(false);
  const [editedHeaders, setEditedHeaders] = useState<string[]>([]);

  const chart = charts.find((c) => c.id === chartId);
  if (!chart) return null;

  const chartData = JSON.parse(chart?.data ?? '[[]]') as string[][];
  const headerRow = chartData[0].filter(Boolean);
  const rows = chartData.slice(1).map((row: any, rowIndex: number) => {
    const data: Record<string, any> = {};

    for (let i = 0; i < headerRow.length; i++) {
      const fieldName = normalizeFieldName(headerRow[i]);
      data[fieldName] = row[i];
    }

    return {
      ...data,
      _id: crypto.randomUUID(),
      _rowIndex: rowIndex,
    };
  });

  const handleDeleteRow = (rowIndex: number) => {
    const dataRows = chartData.slice(1);
    const newDataRows = dataRows.filter((_, i) => i !== rowIndex);
    const updatedChartData = [chartData[0], ...newDataRows];
    updateChart(chartId, { data: JSON.stringify(updatedChartData) });
  };

  const handleAddRow = () => {
    const newRow = Array(headerRow.length).fill('');
    const updatedChartData = [...chartData, newRow];
    updateChart(chartId, { data: JSON.stringify(updatedChartData) });
  };

  const openEditColumns = () => {
    setEditedHeaders([...headerRow]);
    setEditColumnsOpen(true);
  };

  const updateHeaderAt = (index: number, value: string) => {
    setEditedHeaders((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const removeHeaderAt = (index: number) => {
    setEditedHeaders((prev) => prev.filter((_, i) => i !== index));
  };

  const moveHeader = (index: number, direction: 'up' | 'down') => {
    setEditedHeaders((prev) => {
      const next = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const addHeader = () => {
    setEditedHeaders((prev) => [...prev, 'New column']);
  };

  const saveEditedColumns = () => {
    const newHeaders = editedHeaders.map((h) => h.trim() || 'New column');
    const dataRows = chartData.slice(1);
    const newDataRows = dataRows.map((oldRow) =>
      newHeaders.map((newH) => {
        const oldIndex = headerRow.indexOf(newH);
        if (oldIndex >= 0 && oldIndex < oldRow.length) return oldRow[oldIndex];
        return '';
      }),
    );
    const updatedChartData = [newHeaders, ...newDataRows];
    updateChart(chartId, { data: JSON.stringify(updatedChartData) });
    setEditColumnsOpen(false);
  };

  const columns: GridColumn<any>[] = [];
  if (!readOnly) {
    columns.push({
      field: 'controls',
      headerName: '',
      editable: false,
      sortIndex: 0,
      width: 100,
      resizable: false,
      cellRenderer: (params: CellRendererProps<any>) => (
        <button
          type='button'
          className='flex items-center justify-center w-full h-full text-muted-foreground hover:text-foreground'
          aria-label='Delete row'
          onClick={() => handleDeleteRow(params.data._rowIndex ?? 0)}>
          <Trash className='h-4 w-4' />
        </button>
      ),
    });
  }

  for (const header of headerRow) {
    columns.push({
      field: normalizeFieldName(header),
      headerName: header,
      editable: !readOnly,
      resizable: !readOnly,
      filter: true,
    });
  }

  const handleUpdate = (update: any) => {
    if (!update._id) {
      console.error('Cannot determined edited row id');
      return;
    }

    function getDataAsOrderedArray(update: Record<any, any>): any[] {
      const dataAsOrderedArray: any[] = [];
      for (const header of headerRow) {
        const fieldName = normalizeFieldName(header);
        dataAsOrderedArray.push(update[fieldName]);
      }
      return dataAsOrderedArray;
    }

    const updatedChartData = rows.map((data) => {
      if (data._id !== update._id) {
        return getDataAsOrderedArray(data);
      }
      return getDataAsOrderedArray(update);
    });

    updatedChartData.unshift(headerRow);

    updateChart(chartId, {
      data: JSON.stringify(updatedChartData),
    });
  };

  return (
    <div className='flex flex-col gap-2 h-full'>
      {!readOnly && (
        <div className='flex justify-end gap-2'>
          <Button type='button' variant='outline' size='sm' onClick={handleAddRow}>
            <Plus className='h-4 w-4' />
            Add row
          </Button>
          <Button type='button' variant='outline' size='sm' onClick={openEditColumns}>
            <Pencil className='h-4 w-4' />
            Edit columns
          </Button>
        </div>
      )}
      <Dialog open={editColumnsOpen} onOpenChange={setEditColumnsOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>Edit columns</DialogTitle>
          </DialogHeader>
          <div className='flex flex-col gap-2 py-4'>
            {editedHeaders.map((header, index) => (
              <div key={index} className='flex items-center gap-2'>
                <Input
                  value={header}
                  onChange={(e) => updateHeaderAt(index, e.target.value)}
                  placeholder='Column name'
                  className='flex-1'
                />
                <div className='flex items-center gap-0.5'>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='h-8 w-8'
                    onClick={() => moveHeader(index, 'up')}
                    disabled={index === 0}
                    aria-label='Move up'>
                    <ChevronUp className='h-4 w-4' />
                  </Button>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='h-8 w-8'
                    onClick={() => moveHeader(index, 'down')}
                    disabled={index === editedHeaders.length - 1}
                    aria-label='Move down'>
                    <ChevronDown className='h-4 w-4' />
                  </Button>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='h-8 w-8 text-muted-foreground hover:text-destructive'
                    onClick={() => removeHeaderAt(index)}
                    aria-label='Remove column'>
                    <Trash className='h-4 w-4' />
                  </Button>
                </div>
              </div>
            ))}
            <Button type='button' variant='outline' size='sm' onClick={addHeader} className='w-fit'>
              <Plus className='h-4 w-4' />
              Add column
            </Button>
          </div>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => setEditColumnsOpen(false)}>
              Cancel
            </Button>
            <Button type='button' onClick={saveEditedColumns} disabled={editedHeaders.length === 0}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className='flex-1 min-h-0'>
        <Grid
          rowData={rows}
          colDefs={columns}
          onCellValueChanged={readOnly ? undefined : handleUpdate}
        />
      </div>
    </div>
  );
};
