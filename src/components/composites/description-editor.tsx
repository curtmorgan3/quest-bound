import { useState } from 'react';
import Markdown from 'react-markdown';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../ui/sheet';
import { MarkdownPanel } from './markdown-panel';

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
  className = '',
}: DescriptionEditorProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div id={id} className={`flex flex-col gap-2 md-content ${className}`}>
        <div className='flex items-center justify-between gap-2'>
          <Label>Description</Label>
          {!disabled && (
            <Button variant='outline' size='sm' onClick={() => setOpen(true)}>
              Edit
            </Button>
          )}
        </div>
        <DescriptionViewer value={value} placeholder={placeholder} />
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side='right' className='flex w-full flex-col gap-4 sm:max-w-lg'>
          <SheetHeader>
            <SheetTitle>Description</SheetTitle>
          </SheetHeader>
          <MarkdownPanel
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            className='min-h-0 flex-1'
          />
        </SheetContent>
      </Sheet>
    </>
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
