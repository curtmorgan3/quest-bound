import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { MarkdownViewer } from './markdown-viewer';

interface MarkdownPanelProps {
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
}

export function MarkdownPanel({
  value,
  onChange,
  placeholder = '',
  disabled = false,
  readOnly = false,
  className,
}: MarkdownPanelProps) {
  const [previewing, setPreviewing] = useState(false);

  if (readOnly) {
    return (
      <div className={cn('flex flex-1 flex-col gap-2 p-2 md-content', className)}>
        <div className='min-h-0 flex-1 overflow-y-auto px-3 py-3 text-base md:text-sm'>
          {value ? (
            <MarkdownViewer value={value} />
          ) : (
            <span className='text-muted-foreground'>{placeholder || 'Nothing to preview.'}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-1 flex-col gap-2 p-2 md-content', className)}>
      <div className='flex justify-end'>
        <Button variant='outline' size='sm' onClick={() => setPreviewing((p) => !p)}>
          {previewing ? 'Edit' : 'Preview'}
        </Button>
      </div>
      {!previewing && (
        <p className='text-xs text-muted-foreground'>Markdown supported</p>
      )}
      {previewing ? (
        <div className='min-h-0 flex-1 overflow-y-auto px-3 py-3 text-base md:text-sm'>
          {value ? (
            <MarkdownViewer value={value} />
          ) : (
            <span className='text-muted-foreground'>{placeholder || 'Nothing to preview.'}</span>
          )}
        </div>
      ) : (
        <Textarea
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className='min-h-0 flex-1 resize-none'
        />
      )}
    </div>
  );
}
