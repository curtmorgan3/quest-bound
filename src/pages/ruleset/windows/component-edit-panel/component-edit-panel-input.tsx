import { Button, Input, Label } from '@/components';
import { SlidersHorizontal } from 'lucide-react';
import { useContext, useState } from 'react';
import { ComponentEditPanelContext } from './component-edit-panel-context';
import { CustomPropertiesListModal } from './custom-properties-list-modal';

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
  const [isFocused, setIsFocused] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const panelContext = useContext(ComponentEditPanelContext);

  const openModal = () => {
    if (panelContext?.openCustomPropertiesModal) {
      panelContext.openCustomPropertiesModal();
    } else {
      setModalOpen(true);
    }
  };

  return (
    <div className={`grid w-[${width}]`}>
      <Label htmlFor={`component-edit-${label.toLowerCase()}`} className='text-xs'>
        {label}
      </Label>
      <div className='relative'>
        {isFocused && (
          <Button
            type='button'
            variant='default'
            size='icon'
            style={{ left: 0, top: -25 }}
            className='absolute size-6 -translate-y-1/2 rounded'
            aria-label='Custom properties'
            onMouseDown={(e) => e.preventDefault()}
            onClick={openModal}>
            <SlidersHorizontal className='size-3.5' />
          </Button>
        )}
        <Input
          disabled={disabled}
          className='h-[20px] rounded-[4px] p-1'
          id={`component-edit-${label.toLowerCase()}`}
          type={number ? 'number' : 'text'}
          name={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          step={step.toString()}
          min={min}
          max={max}
        />
      </div>
      {!panelContext && (
        <CustomPropertiesListModal open={modalOpen} onOpenChange={setModalOpen} />
      )}
    </div>
  );
};
