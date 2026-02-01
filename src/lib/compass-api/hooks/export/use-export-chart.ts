import { useErrorHandler } from '@/hooks/use-error-handler';
import { db } from '@/stores';

export const useExportChart = () => {
  const { handleError } = useErrorHandler();

  const exportChartAsTSV = async (chartId: string) => {
    try {
      // Fetch the chart from the database
      const chart = await db.charts.get(chartId);

      if (!chart) {
        throw new Error(`Chart with ID ${chartId} not found`);
      }

      // Parse the chart data (assuming it's stored as JSON string)
      let chartData: any[] = [];
      try {
        chartData = JSON.parse(chart.data);
      } catch (parseError) {
        console.error('Failed to parse chart data as JSON:', parseError);
        // If data is not JSON, treat it as a single value or array
        chartData = Array.isArray(chart.data) ? chart.data : [chart.data];
      }

      // Convert data to TSV format
      const tsvContent = convertToTSV(chartData, chart.title);

      // Create and download the file
      downloadTSV(tsvContent, `${chart.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.tsv`);
    } catch (error) {
      handleError(error as Error, {
        component: 'useExportChart/exportChartAsTSV',
        severity: 'medium',
      });
    }
  };

  return {
    exportChartAsTSV,
  };
};

/**
 * Escapes a value for TSV format
 * - Replaces tabs with spaces
 * - Escapes newlines
 */
const escapeTsvValue = (value: unknown): string => {
  if (value === undefined || value === null) {
    return '';
  }
  const str = String(value);
  return str.replace(/\t/g, '    ').replace(/\n/g, '\\n').replace(/\r/g, '');
};

/**
 * Converts data array to TSV format
 */
const convertToTSV = (data: any[], chartTitle: string): string => {
  if (!data || data.length === 0) {
    return `Chart: ${chartTitle}\nNo data available`;
  }

  // Handle different data structures
  const isArrayOfArrays = data.every((item) => Array.isArray(item));

  if (isArrayOfArrays) {
    // Data is already in 2D array format (header row + data rows)
    return data.map((row) => row.map(escapeTsvValue).join('\t')).join('\n');
  }

  const isArrayOfObjects = data.every((item) => typeof item === 'object' && item !== null);

  if (isArrayOfObjects) {
    // Extract headers from the first object
    const headers = Object.keys(data[0]);
    const tsvRows = [
      headers.join('\t'),
      ...data.map((row) => headers.map((header) => escapeTsvValue(row[header])).join('\t')),
    ];
    return tsvRows.join('\n');
  } else {
    // Handle array of primitive values
    return data.map(escapeTsvValue).join('\n');
  }
};

/**
 * Downloads TSV content as a file
 */
const downloadTSV = (tsvContent: string, filename: string) => {
  // Create a blob with the TSV content
  const blob = new Blob([tsvContent], { type: 'text/tab-separated-values;charset=utf-8;' });

  // Create a download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  // Append to body, click, and remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL object
  URL.revokeObjectURL(url);
};
