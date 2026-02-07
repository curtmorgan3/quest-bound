import { useAttributes } from '@/lib/compass-api/hooks/rulesets/use-attributes';
import { useCharts } from '@/lib/compass-api/hooks/rulesets/use-charts';
import type { Attribute } from '@/types';
import { useEffect, useState } from 'react';

interface UseAttributeValuesProps {
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

export const useAttributeValues = ({
  id = '',
  baseProperties,
  onCreate,
  setTitle,
  setDescription,
  setCategory,
}: UseAttributeValuesProps) => {
  const { attributes, createAttribute, updateAttribute } = useAttributes();
  const { charts } = useCharts();
  const isEditMode = !!id;

  const activeAttribute = attributes.find((a) => a.id === id);

  const [defaultValue, setDefaultValue] = useState<string | number>('');
  const [typeValue, setTypeValue] = useState('number');
  const [defaultBoolean, setDefaultBoolean] = useState(false);
  const [attributeListOptions, setAttributeListOptions] = useState<string[]>([]);
  const [min, setMin] = useState<number>();
  const [max, setMax] = useState<number>();
  const [useChartForOptions, setUseChartForOptions] = useState(false);
  const [optionsChartId, setOptionsChartId] = useState('');
  const [optionsChartColumnHeader, setOptionsChartColumnHeader] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [inventoryWidth, setInventoryWidth] = useState(2);
  const [inventoryHeight, setInventoryHeight] = useState(2);

  useEffect(() => {
    if (isEditMode && activeAttribute) {
      setTitle(activeAttribute.title);
      setDescription(activeAttribute.description);
      setCategory(activeAttribute.category || '');
      setTypeValue(activeAttribute.type);
      setAttributeListOptions(activeAttribute.options || []);
      setMin(activeAttribute.min);
      setMax(activeAttribute.max);
      setImage(activeAttribute.image ?? null);
      setAssetId(activeAttribute.assetId ?? null);
      setInventoryHeight(activeAttribute.inventoryHeight ?? 2);
      setInventoryWidth(activeAttribute.inventoryWidth ?? 2);
      // Handle chart reference for list options
      setUseChartForOptions(!!activeAttribute.optionsChartRef);
      setOptionsChartId(activeAttribute.optionsChartRef?.toString() || '');
      setOptionsChartColumnHeader(activeAttribute.optionsChartColumnHeader || '');
      // Handle default value based on type
      if (activeAttribute.type === 'boolean') {
        setDefaultBoolean(!!activeAttribute.defaultValue);
      } else {
        setDefaultValue(activeAttribute.defaultValue.toString());
      }
    } else {
      resetAll();
    }
  }, [activeAttribute]);

  const addListOption = (opt: string) => {
    setAttributeListOptions((prev) => [...prev, opt]);
  };

  const removeListOption = (opt: string) => {
    setAttributeListOptions((prev) => prev.filter((o) => o !== opt));
  };

  const resetAll = () => {
    setDefaultBoolean(false);
    setDefaultValue('');
    setTypeValue('number');
    setUseChartForOptions(false);
    setOptionsChartId('');
    setOptionsChartColumnHeader('');
    setImage(null);
    setAssetId(null);
    setInventoryHeight(2);
    setInventoryWidth(2);
  };

  const attributeProperties: Partial<Attribute> = {
    type: typeValue as 'string' | 'number' | 'boolean' | 'list',
    image,
    assetId,
    defaultValue:
      typeValue === 'boolean'
        ? defaultBoolean
        : typeValue === 'number'
          ? (defaultValue ?? 0)
          : defaultValue,
    options: typeValue === 'list' && !useChartForOptions ? attributeListOptions : undefined,
    optionsChartRef:
      typeValue === 'list' && useChartForOptions && optionsChartId
        ? (optionsChartId as unknown as number)
        : undefined,
    optionsChartColumnHeader:
      typeValue === 'list' && useChartForOptions && optionsChartColumnHeader
        ? optionsChartColumnHeader
        : undefined,
    min: typeValue === 'number' ? min : undefined,
    max: typeValue === 'number' ? max : undefined,
    inventoryHeight,
    inventoryWidth,
  };

  const saveAttribute = () => {
    const data = {
      ...baseProperties,
      ...attributeProperties,
    };

    if (data.type === 'number' && data.defaultValue === '') {
      data.defaultValue = 0;
    }

    if (isEditMode) {
      updateAttribute(id, data);
    } else {
      createAttribute(data);
      resetAll();
    }

    onCreate?.();
  };

  // Get column headers from selected chart
  const selectedChart = charts.find((c) => c.id === optionsChartId);
  const chartColumnHeaders: string[] = selectedChart?.data
    ? (JSON.parse(selectedChart.data) as string[][])[0] || []
    : [];

  // Get list options from chart column when using chart reference
  const chartListOptions: string[] =
    useChartForOptions && selectedChart?.data && optionsChartColumnHeader
      ? (() => {
          const data = JSON.parse(selectedChart.data) as string[][];
          const columnIndex = data[0]?.indexOf(optionsChartColumnHeader) ?? -1;
          if (columnIndex === -1) return [];
          return data
            .slice(1)
            .map((row) => row[columnIndex] || '')
            .filter(Boolean);
        })()
      : [];

  return {
    saveAttribute,
    defaultValue,
    typeValue,
    defaultBoolean,
    setDefaultValue,
    setTypeValue,
    setDefaultBoolean,
    addListOption,
    attributeListOptions,
    removeListOption,
    min,
    max,
    setMin,
    setMax,
    useChartForOptions,
    setUseChartForOptions,
    optionsChartId,
    setOptionsChartId,
    optionsChartColumnHeader,
    setOptionsChartColumnHeader,
    charts,
    chartColumnHeaders,
    chartListOptions,
    image,
    assetId,
    setImage,
    setAssetId,
    inventoryWidth,
    inventoryHeight,
    setInventoryWidth,
    setInventoryHeight,
  };
};
