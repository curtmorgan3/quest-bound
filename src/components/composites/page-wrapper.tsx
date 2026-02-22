import { cn } from '@/lib/utils';

interface PageWrapperProps {
  title: string;
  subheader?: string;
  headerActions?: React.ReactNode;
  filterRow?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function PageWrapper({
  title,
  subheader,
  headerActions,
  filterRow,
  children,
  className,
  contentClassName,
}: PageWrapperProps) {
  return (
    <div className={cn('flex h-full w-full flex-col', className)}>
      <div className='flex shrink-0 items-center gap-2 border-b bg-background px-4 py-2'>
        <h1 className='truncate text-lg font-semibold'>{title}</h1>
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
