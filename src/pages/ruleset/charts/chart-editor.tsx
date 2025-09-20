import { Grid, type GridColumn } from '@/components';
import { useCharts } from '@/lib/compass-api';

interface ChartEditorProps {
  chartId: string;
}

function normalizeFieldName(name: string) {
  return name.trim().replace(/ /g, '-').toLowerCase();
}

export const ChartEditor = ({ chartId }: ChartEditorProps) => {
  const { charts, updateChart } = useCharts();

  const chart = charts.find((c) => c.id === chartId);
  if (!chart) return null;

  const chartData = JSON.parse(chart?.data ?? '[[]]') as string[][];

  const headerRow = chartData[0].filter(Boolean);
  const rows = chartData.slice(1).map((row: any) => {
    const data: Record<string, any> = {};

    for (let i = 0; i < headerRow.length; i++) {
      const fieldName = normalizeFieldName(headerRow[i]);
      data[fieldName] = row[i];
    }

    return {
      ...data,
      _id: crypto.randomUUID(),
    };
  });

  const columns: GridColumn<any>[] = [
    {
      field: 'controls',
      headerName: '',
      editable: false,
      sortIndex: 0,
      width: 100,
      resizable: false,
    },
  ];

  for (const header of headerRow) {
    columns.push({
      field: normalizeFieldName(header),
      headerName: header,
      editable: true,
      resizable: true,
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

  return <Grid rowData={rows} colDefs={columns} onCellValueChanged={handleUpdate} />;
};
