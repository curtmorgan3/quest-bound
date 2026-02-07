import {
  Button,
  Checkbox,
  Input,
  ImageUpload,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components';
import { useAssets } from '@/lib/compass-api';
import type { Chart } from '@/types';
import { Plus, Trash } from 'lucide-react';
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

interface AttributeCreateProps {
  typeValue: string;
  setTypeValue: Dispatch<SetStateAction<string>>;
  defaultValue: string | number;
  setDefaultValue: Dispatch<SetStateAction<string | number>>;
  defaultBoolean: boolean;
  setDefaultBoolean: Dispatch<SetStateAction<boolean>>;
  attributeListOptions?: string[];
  addListOption: (opt: string) => void;
  removeListOption: (opt: string) => void;
  min?: number;
  max?: number;
  setMin: Dispatch<SetStateAction<number | undefined>>;
  setMax: Dispatch<SetStateAction<number | undefined>>;
  useChartForOptions: boolean;
  setUseChartForOptions: Dispatch<SetStateAction<boolean>>;
  optionsChartId: string;
  setOptionsChartId: Dispatch<SetStateAction<string>>;
  optionsChartColumnHeader: string;
  setOptionsChartColumnHeader: Dispatch<SetStateAction<string>>;
  charts: Chart[];
  chartColumnHeaders: string[];
  chartListOptions: string[];
  image: string | null;
  assetId: string | null;
  setImage: Dispatch<SetStateAction<string | null>>;
  setAssetId: Dispatch<SetStateAction<string | null>>;
}

export const AttributeCreate = ({
  typeValue,
  setTypeValue,
  defaultValue,
  setDefaultValue,
  defaultBoolean,
  setDefaultBoolean,
  attributeListOptions = [],
  addListOption,
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
}: AttributeCreateProps) => {
  const [optionInput, setOptionInput] = useState('');
  const { assets, deleteAsset } = useAssets();

  const getImageFromAssetId = (id: string | null) => {
    if (!id) return null;
    const asset = assets.find((a) => a.id === id);
    return asset?.data ?? null;
  };

  const handleImageUpload = (uploadedAssetId: string) => {
    setAssetId(uploadedAssetId);
    const imageData = getImageFromAssetId(uploadedAssetId);
    if (imageData) {
      setImage(imageData);
    }
  };

  const handleSetUrl = (url: string) => {
    setAssetId(null);
    setImage(url);
  };

  const handleImageRemove = async () => {
    if (assetId) {
      await deleteAsset(assetId);
    }
    setAssetId(null);
    setImage(null);
  };

  const displayImage = image || getImageFromAssetId(assetId);

  const optionsReversed = [...attributeListOptions].reverse();
  
  // Options to display in the default value dropdown
  const displayOptions = useChartForOptions ? chartListOptions : attributeListOptions;

  useEffect(() => {
    if (typeValue !== 'number') return;
    if (defaultValue === '') return;
    if (min && min > Number(defaultValue)) {
      setDefaultValue(min);
    } else if (max && max < Number(defaultValue)) {
      setMax(Number(defaultValue));
    }
  }, [defaultValue, min, max]);

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-2'>
        <Label>Image</Label>
        <ImageUpload
          image={displayImage}
          alt='Attribute image'
          onUpload={handleImageUpload}
          onRemove={handleImageRemove}
          onSetUrl={handleSetUrl}
        />
      </div>
      <div className='w-full flex flex-row gap-4'>
        <div className='grid gap-3 w-[50%]'>
          <Label htmlFor='create-type'>Type</Label>
          <Select value={typeValue} onValueChange={setTypeValue}>
            <SelectTrigger className='w-[100%]'>
              <SelectValue placeholder='Type' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='number'>Number</SelectItem>
              <SelectItem value='string'>Text</SelectItem>
              <SelectItem value='boolean'>Boolean</SelectItem>
              <SelectItem value='list'>List</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='grid gap-3 w-[50%]'>
          <Label htmlFor='create-category'>Default</Label>
          {typeValue === 'boolean' ? (
            <Checkbox
              checked={defaultBoolean}
              onCheckedChange={(checked) => setDefaultBoolean(!!checked)}
            />
          ) : typeValue === 'list' ? (
            <Select
              value={defaultValue.toString()}
              onValueChange={(value) => setDefaultValue(value)}>
              <SelectTrigger className='w-[100%]'>
                <SelectValue placeholder='Default Value' />
              </SelectTrigger>
              <SelectContent>
                {displayOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id='create-default'
              name='default'
              type={typeValue === 'number' ? 'number' : 'text'}
              onChange={(e) => setDefaultValue(e.target.value)}
              value={defaultValue}
            />
          )}
        </div>
      </div>
      {typeValue === 'number' && (
        <div className='w-full flex flex-row gap-4'>
          <div className='grid gap-3 w-[50%]'>
            <Label htmlFor='create-min'>Min</Label>
            <Input
              id='create-min'
              name='min'
              type='number'
              onChange={(e) => {
                const val = e.target.value;
                if (val !== '') {
                  setMin(Number(val));
                }
              }}
              value={min}
            />
          </div>
          <div className='grid gap-3 w-[50%]'>
            <Label htmlFor='create-max'>Max</Label>
            <Input
              id='create-max'
              name='max'
              type='number'
              onChange={(e) => {
                const val = e.target.value;
                if (val !== '') {
                  setMax(Number(val));
                }
              }}
              value={max}
            />
          </div>
        </div>
      )}

      {typeValue === 'list' && (
        <>
          <div className='flex items-center gap-2'>
            <Checkbox
              id='use-chart-options'
              checked={useChartForOptions}
              onCheckedChange={(checked) => setUseChartForOptions(!!checked)}
            />
            <Label htmlFor='use-chart-options'>Read options from chart</Label>
          </div>

          {useChartForOptions ? (
            <div className='w-full flex flex-row gap-4'>
              <div className='grid gap-3 w-[50%]'>
                <Label htmlFor='chart-select'>Chart</Label>
                <Select
                  value={optionsChartId}
                  onValueChange={(value) => {
                    setOptionsChartId(value);
                    setOptionsChartColumnHeader('');
                  }}>
                  <SelectTrigger className='w-[100%]'>
                    <SelectValue placeholder='Select a chart' />
                  </SelectTrigger>
                  <SelectContent>
                    {charts.map((chart) => (
                      <SelectItem key={chart.id} value={chart.id}>
                        {chart.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='grid gap-3 w-[50%]'>
                <Label htmlFor='column-select'>Column</Label>
                <Select
                  value={optionsChartColumnHeader}
                  onValueChange={setOptionsChartColumnHeader}
                  disabled={!optionsChartId}>
                  <SelectTrigger className='w-[100%]'>
                    <SelectValue placeholder='Select a column' />
                  </SelectTrigger>
                  <SelectContent>
                    {chartColumnHeaders.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className='w-full flex flex-row gap-4 items-end'>
              <div className='grid gap-3 w-[50%]'>
                <Label htmlFor='create-category'>List Option</Label>
                <Input
                  id='create-list-options'
                  name='list-options'
                  value={optionInput}
                  onChange={(e) => setOptionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addListOption(optionInput);
                      setOptionInput('');
                    }
                  }}
                />
              </div>
              <div className='flex flex-row gap-3 w-[50%] items-end'>
                <Button
                  variant='outline'
                  className='mt-6 w-[50px]'
                  data-testid='add-list-option-button'
                  onClick={() => {
                    addListOption(optionInput);
                    setOptionInput('');
                  }}>
                  <Plus />
                </Button>
                {optionsReversed.length > 0 && (
                  <div className='flex flex-col gap-2 max-h-[100px] w-full overflow-y-auto p-2 border rounded-md bg-secondary'>
                    {optionsReversed.map((option) => (
                      <div key={option} className='flex justify-between items-center'>
                        <span>{option}</span>
                        <Button onClick={() => removeListOption(option)} variant='ghost' size='icon'>
                          <Trash />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {useChartForOptions && chartListOptions.length > 0 && (
            <div className='flex flex-col gap-2 max-h-[100px] w-full overflow-y-auto p-2 border rounded-md bg-secondary'>
              <Label className='text-muted-foreground text-xs'>Preview ({chartListOptions.length} options)</Label>
              <div className='flex flex-wrap gap-1'>
                {chartListOptions.slice(0, 10).map((option, idx) => (
                  <span key={idx} className='text-sm bg-background px-2 py-0.5 rounded'>
                    {option}
                  </span>
                ))}
                {chartListOptions.length > 10 && (
                  <span className='text-sm text-muted-foreground'>+{chartListOptions.length - 10} more</span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
