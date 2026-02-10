import { useState } from 'react';
import Markdown from 'react-markdown';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';

interface DescriptionEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  onSave?: () => void;
  className?: string;
}

export const DescriptionEditor = ({
  value = '',
  id,
  onChange,
  placeholder = '',
  disabled = false,
  onSave,
  className = '',
}: DescriptionEditorProps) => {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');

  return (
    <div
      id={id}
      className={`flex flex-col gap-2 md-content ${className}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          onSave?.();
        }
      }}>
      <div className='flex items-center justify-between gap-2'>
        <Label>Description</Label>
        <ToggleGroup
          type='single'
          value={mode}
          onValueChange={(v) => v && setMode(v as 'edit' | 'preview')}
          className='w-fit'>
          <ToggleGroupItem value='edit' aria-label='Edit'>
            Edit
          </ToggleGroupItem>
          <ToggleGroupItem value='preview' aria-label='Preview'>
            Preview
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      {mode === 'edit' ? (
        <Textarea
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className='min-h-24 max-h-[200px] overflow-y-auto'
        />
      ) : (
        <DescriptionViewer value={value} placeholder={placeholder} />
      )}
    </div>
  );
};

export const DescriptionViewer = ({
  value,
  placeholder,
  className,
  onClick,
}: {
  value?: string;
  placeholder?: string;
  className?: string;
  onClick?: () => void;
}) => {
  return (
    <div
      onClick={onClick}
      className={` md-content min-h-24 max-h-[200px] w-full overflow-y-auto bg-transparent px-3 py-2 text-base shadow-xs md:text-sm ${className ?? ''}`}>
      {value ? (
        <Markdown>{value}</Markdown>
      ) : (
        <span className='text-muted-foreground'>{placeholder || 'No description.'}</span>
      )}
    </div>
  );
};
