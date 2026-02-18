import { Input, Label } from '@/components';

interface Props {
  label: string;
  value: string | number;
  onChange: (val: string | number) => void;
  width?: string | number;
  number?: boolean;
  disabled?: boolean;
  step?: number;
  min?: number;
  max?: number;
}

export const EditPanelInput = ({
  label,
  value,
  onChange,
  width = '50%',
  number = false,
  disabled = false,
  step = 1,
  min,
  max,
}: Props) => {
  return (
    <div className={`grid w-[${width}]`}>
      <Label htmlFor={`component-edit-${label.toLowerCase()}`} className='text-xs'>
        {label}
      </Label>
      <Input
        disabled={disabled}
        className='h-[20px] rounded-[4px] p-1'
        id={`component-edit-${label.toLowerCase()}`}
        type={number ? 'number' : 'text'}
        name={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        step={step.toString()}
        min={min}
        max={max}
      />
    </div>
  );
};
