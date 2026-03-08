import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface PageWrapperProps {
  title: string;
  /** When provided, the title becomes clickable to edit; callback is fired on blur. */
  onTitleChange?: (newTitle: string) => void;
  subheader?: string;
  headerActions?: React.ReactNode;
  filterRow?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  /** When true, the header bar stays fixed at the top when scrolling. */
  stickyHeader?: boolean;
}

export function PageWrapper({
  title,
  onTitleChange,
  subheader,
  headerActions,
  filterRow,
  children,
  className,
  contentClassName,
  stickyHeader,
}: PageWrapperProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(title);

  const handleTitleBlur = () => {
    if (editingTitle) {
      const trimmed = titleValue.trim();
      if (trimmed && trimmed !== title) {
        onTitleChange?.(trimmed);
      }
      setEditingTitle(false);
    }
  };

  return (
    <div className={cn('flex h-full w-full flex-col', className)}>
      <div
        className={cn(
          'flex shrink-0 items-center gap-2 border-b bg-background px-4 py-2',
          stickyHeader && 'sticky top-0 z-10',
        )}>
        {editingTitle ? (
          <Input
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                (e.target as HTMLInputElement).blur();
              } else if (e.key === 'Escape') {
                setTitleValue(title);
                setEditingTitle(false);
                (e.target as HTMLInputElement).blur();
              }
            }}
            autoFocus
            className='h-8 max-w-[240px] text-lg font-semibold'
            data-testid='page-wrapper-title-input'
          />
        ) : (
          <h1
            className={cn(
              'truncate text-lg font-semibold',
              onTitleChange && 'cursor-pointer hover:opacity-80',
            )}
            onClick={() => {
              if (onTitleChange) {
                setTitleValue(title);
                setEditingTitle(true);
              }
            }}
            data-testid='page-wrapper-title'>
            {title}
          </h1>
        )}
        {subheader && (
          <>
            <span className='text-muted-foreground'>›</span>
            <h1 className='truncate text-lg font-semibold'>{subheader}</h1>
          </>
        )}
        {headerActions && <div className='ml-auto'>{headerActions}</div>}
      </div>

      {filterRow && <div className='shrink-0 border-b bg-background'>{filterRow}</div>}

      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4',
          contentClassName,
        )}>
        {children}
      </div>
    </div>
  );
}
