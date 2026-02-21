import { cn } from '@/lib/utils';
import { useState } from 'react';
import Markdown, { defaultUrlTransform } from 'react-markdown';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';

/** Allow data: and blob: URLs (e.g. embedded images) in addition to default safe protocols. */
function urlTransform(url: string): string {
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('data:') || lower.startsWith('blob:')) {
    return trimmed;
  }
  return defaultUrlTransform(url);
}

export type DocumentMarkdownMode = 'view' | 'edit';

interface DocumentMarkdownContentProps {
  /** Current markdown value */
  value?: string;
  /** Called when value changes (edit mode only) */
  onChange?: (value: string) => void;
  /** View-only or editable with edit/preview toggle */
  mode: DocumentMarkdownMode;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Optional title shown above the content (e.g. document title) */
  title?: string;
  /** Called when user triggers save (e.g. Cmd+Enter in edit mode) */
  onSave?: () => void;
}

export function DocumentMarkdownContent({
  value = '',
  onChange,
  mode,
  placeholder = 'No content.',
  disabled = false,
  className,
  title,
  onSave,
}: DocumentMarkdownContentProps) {
  const [editPreview, setEditPreview] = useState<'edit' | 'preview'>('edit');

  if (mode === 'view') {
    return (
      <div className={cn('flex flex-col gap-2 md-content', className)}>
        {title && <h2 className='text-sm font-medium text-muted-foreground'>{title}</h2>}
        <div className='min-h-[120px] w-full flex-1 overflow-y-auto px-3 py-3 text-base md:text-sm'>
          {value ? (
            <Markdown urlTransform={urlTransform}>{value}</Markdown>
          ) : (
            <span className='text-muted-foreground'>{placeholder}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('flex flex-col gap-2 md-content', className)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          onSave?.();
        }
      }}>
      <div className='flex flex-col gap-2'>
        {title && <h2 className='text-sm font-medium text-muted-foreground'>{title}</h2>}
        <div className='flex items-center justify-between gap-2'>
          <Label className='sr-only'>Markdown content</Label>
          <ToggleGroup
            type='single'
            value={editPreview}
            onValueChange={(v) => v && setEditPreview(v as 'edit' | 'preview')}
            className='w-fit'>
            <ToggleGroupItem value='edit' aria-label='Edit'>
              Edit
            </ToggleGroupItem>
            <ToggleGroupItem value='preview' aria-label='Preview'>
              Preview
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        {editPreview === 'edit' ? (
          <Textarea
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className='min-h-[600px] flex-1 resize-y overflow-y-auto'
          />
        ) : (
          <div className='min-h-[600px] w-full flex-1 overflow-y-auto px-3 py-3 text-base md:text-sm'>
            {value ? (
              <Markdown urlTransform={urlTransform}>{value}</Markdown>
            ) : (
              <span className='text-muted-foreground'>{placeholder}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
