import { Button, Input, Label } from '@/components';
import { useActiveRuleset, useCustomProperties } from '@/lib/compass-api';
import { SlidersHorizontal, X } from 'lucide-react';
import { useContext, useState } from 'react';
import { ComponentEditPanelContext } from './component-edit-panel-context';
import { CustomPropertiesListModal } from './custom-properties-list-modal';

const CUSTOM_PROP_PREFIX = 'custom-prop-';

function isCustomPropValue(value: string | number): value is string {
  return typeof value === 'string' && value.startsWith(CUSTOM_PROP_PREFIX);
}

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
  /** When set, opening custom properties from this input will assign the selected property to this style key (style[key] = `custom-prop-<id>`). */
  styleKeyForCustomProperty?: string;
  /** Value to set when clearing the custom property pill (e.g. '' or 0). Defaults to ''. */
  clearValue?: string | number;
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
  styleKeyForCustomProperty,
  clearValue = '',
}: Props) => {
  const [isFocused, setIsFocused] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const panelContext = useContext(ComponentEditPanelContext);
  const { activeRuleset } = useActiveRuleset();
  const { customProperties } = useCustomProperties(activeRuleset?.id);

  const openModal = () => {
    if (panelContext?.openCustomPropertiesModal) {
      panelContext.openCustomPropertiesModal(styleKeyForCustomProperty);
    } else {
      setModalOpen(true);
    }
  };

  const showCustomPropPill = isCustomPropValue(value);
  const customPropId = showCustomPropPill ? value.slice(CUSTOM_PROP_PREFIX.length) : '';
  const customPropLabel = showCustomPropPill
    ? customProperties.find((p) => p.id === customPropId)?.label
    : '';

  return (
    <div className={`grid w-[${width}]`}>
      <Label htmlFor={`component-edit-${label.toLowerCase()}`} className='text-xs'>
        {label}
      </Label>
      <div className='relative'>
        {showCustomPropPill ? (
          <div className='flex h-[20px] items-center gap-1 rounded-[4px] border border-border bg-muted/50 px-1.5'>
            <span
              className='min-w-0 flex-1 truncate text-xs'
              title={customPropLabel ?? customPropId}>
              {customPropLabel ?? customPropId}
            </span>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='size-4 shrink-0 rounded'
              aria-label='Remove custom property'
              disabled={disabled}
              onClick={() => onChange(clearValue)}>
              <X className='size-3' />
            </Button>
          </div>
        ) : (
          <>
            {isFocused && !!styleKeyForCustomProperty && (
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
          </>
        )}
      </div>
      {!panelContext && <CustomPropertiesListModal open={modalOpen} onOpenChange={setModalOpen} />}
    </div>
  );
};
