import { useCharts } from '@/lib/compass-api';
import { useEffect, useState } from 'react';

interface UseActionValueProps {
  id?: string;
  baseProperties: {
    title: string;
    description: string;
    category: string;
  };
  onCreate?: () => void;
  setTitle: (title: string) => void;
  setDescription: (description: string) => void;
  setCategory: (category: string) => void;
}

export const useChartValues = ({
  id = '',
  baseProperties,
  onCreate,
  setTitle,
  setDescription,
  setCategory,
}: UseActionValueProps) => {
  const { charts, createChart, updateChart } = useCharts();
  const isEditMode = !!id;

  const activeChart = charts.find((a) => a.id === id);

  useEffect(() => {
    if (isEditMode && activeChart) {
      setTitle(activeChart.title);
      setDescription(activeChart.description);
      setCategory(activeChart.category || '');
    }
  }, [activeChart]);

  const [chartData, setChartData] = useState<string[][] | null>(null);

  const saveChart = () => {
    const updatedChartData = chartData
      ? JSON.stringify(chartData)
      : activeChart
        ? activeChart?.data
        : '[[]]';

    const data = {
      ...baseProperties,
      data: updatedChartData,
    };

    if (isEditMode) {
      updateChart(id, data);
    } else {
      createChart(data);
    }

    onCreate?.();
  };

  return {
    saveChart,
    chartData,
    setChartData,
  };
};
