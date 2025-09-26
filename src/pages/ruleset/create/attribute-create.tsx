import {
  Button,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components';
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
  min: number;
  max: number;
  setMin: Dispatch<SetStateAction<number>>;
  setMax: Dispatch<SetStateAction<number>>;
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
}: AttributeCreateProps) => {
  const [optionInput, setOptionInput] = useState('');

  const optionsReversed = [...attributeListOptions].reverse();

  useEffect(() => {
    if (typeValue !== 'number') return;
    if (defaultValue === '') return;
    if (min > Number(defaultValue)) {
      setDefaultValue(min);
    } else if (max < Number(defaultValue)) {
      setMax(Number(defaultValue));
    }
  }, [defaultValue, min, max]);

  return (
    <div className='flex flex-col gap-4'>
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
              <SelectItem value='enum'>List</SelectItem>
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
          ) : typeValue === 'enum' ? (
            <Select
              value={defaultValue.toString()}
              onValueChange={(value) => setDefaultValue(value)}>
              <SelectTrigger className='w-[100%]'>
                <SelectValue placeholder='Default Value' />
              </SelectTrigger>
              <SelectContent>
                {attributeListOptions.map((option) => (
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
                if (val === '') {
                  setMin(-Infinity);
                } else {
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
                if (val === '') {
                  setMax(Infinity);
                } else {
                  setMax(Number(val));
                }
              }}
              value={max}
            />
          </div>
        </div>
      )}

      {typeValue === 'enum' && (
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
    </div>
  );
};
