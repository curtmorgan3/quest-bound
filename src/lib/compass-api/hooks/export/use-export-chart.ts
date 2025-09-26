import { useErrorHandler } from '@/hooks/use-error-handler';
import { db } from '@/stores';

export const useExportChart = () => {
  const { handleError } = useErrorHandler();

  const exportChartAsCSV = async (chartId: string) => {
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

      // Convert data to CSV format
      const csvContent = convertToCSV(chartData, chart.title);

      // Create and download the file
      downloadCSV(csvContent, `${chart.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`);
    } catch (error) {
      handleError(error as Error, {
        component: 'useExportChart/exportChartAsCSV',
        severity: 'medium',
      });
    }
  };

  return {
    exportChartAsCSV,
  };
};

/**
 * Converts data array to CSV format
 */
const convertToCSV = (data: any[], chartTitle: string): string => {
  if (!data || data.length === 0) {
    return `Chart: ${chartTitle}\nNo data available`;
  }

  // Handle different data structures
  const isArrayOfObjects = data.every((item) => typeof item === 'object' && item !== null);

  if (isArrayOfObjects) {
    // Extract headers from the first object
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            // Escape CSV values that contain commas, quotes, or newlines
            if (
              typeof value === 'string' &&
              (value.includes(',') || value.includes('"') || value.includes('\n'))
            ) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value ?? '';
          })
          .join(','),
      ),
    ];
    return csvRows.join('\n');
  } else {
    // Handle array of primitive values
    const csvRows = [
      ...data.map((value) => {
        if (
          typeof value === 'string' &&
          (value.includes(',') || value.includes('"') || value.includes('\n'))
        ) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }),
    ];
    return csvRows.join('\n');
  }
};

/**
 * Downloads CSV content as a file
 */
const downloadCSV = (csvContent: string, filename: string) => {
  // Create a blob with the CSV content
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

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
