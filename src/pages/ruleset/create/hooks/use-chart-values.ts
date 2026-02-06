import { useCharts } from '@/lib/compass-api';
import { useEffect, useState } from 'react';

interface UseChartValueProps {
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
}: UseChartValueProps) => {
  const { charts, createChart, updateChart } = useCharts();
  const isEditMode = !!id;

  const activeChart = charts.find((a) => a.id === id);

  useEffect(() => {
    if (isEditMode && activeChart) {
      setTitle(activeChart.title);
      setDescription(activeChart.description);
      setCategory(activeChart.category || '');
      setImage(activeChart.image ?? null);
      setAssetId(activeChart.assetId ?? null);
    } else {
      resetAll();
    }
  }, [activeChart]);

  const [chartData, setChartData] = useState<string[][] | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);

  const resetAll = () => {
    setImage(null);
    setAssetId(null);
  };

  const saveChart = () => {
    const updatedChartData = chartData
      ? JSON.stringify(chartData)
      : activeChart
        ? activeChart?.data
        : '[[]]';

    const data = {
      ...baseProperties,
      data: updatedChartData,
      image,
      assetId,
    };

    if (isEditMode) {
      updateChart(id, data);
    } else {
      createChart(data);
      resetAll();
    }

    onCreate?.();
  };

  return {
    saveChart,
    chartData,
    setChartData,
    image,
    assetId,
    setImage,
    setAssetId,
  };
};
