import { Card } from '@/components';
import { MarkdownPanel } from '@/components/composites/markdown-panel';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { systemModules } from '@/content/system-modules';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export interface SelectSystemModuleStepProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function SelectSystemModuleStep({ selectedId, onSelect }: SelectSystemModuleStepProps) {
  const entries = Object.entries(systemModules);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId) {
      setDetailOpen(false);
      setDetailId(null);
    }
  }, [selectedId]);

  const detailMod = detailId ? systemModules[detailId] : undefined;

  const handleCardClick = (id: string) => {
    if (selectedId === id) {
      onSelect(null);
      setDetailOpen(false);
      setDetailId(null);
    } else {
      onSelect(id);
      setDetailId(id);
      setDetailOpen(true);
    }
  };

  return (
    <div className='flex flex-col gap-4'>
      {entries.length === 0 ? (
        <p className='rounded-md border border-dashed bg-muted/30 px-3 py-8 text-center text-sm text-muted-foreground'>
          No system modules are available yet.
        </p>
      ) : (
        <ul className='flex flex-row flex-wrap items-center justify-center gap-3 p-1'>
          {entries.map(([id, mod]) => {
            const isSelected = selectedId === id;
            return (
              <li key={id} className='shrink-0'>
                <Card
                  className={cn(
                    'w-[9rem] gap-0 p-0 py-0 transition-colors',
                    isSelected
                      ? 'ring-2 ring-ring ring-offset-2 ring-offset-background'
                      : 'hover:bg-muted/50',
                  )}>
                  <button
                    type='button'
                    className='flex w-full flex-col rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                    onClick={() => handleCardClick(id)}
                    aria-pressed={isSelected}
                    aria-label={`${mod.title}. Open details`}>
                    <div className='relative aspect-[4/3] overflow-hidden rounded-t-xl bg-muted'>
                      {mod.image ? (
                        <img
                          src={mod.image}
                          alt=''
                          className='h-full w-full object-cover'
                          loading='lazy'
                        />
                      ) : null}
                    </div>
                    <div className='flex flex-col rounded-b-xl border-t bg-card p-2'>
                      <span className='text-center text-xs font-medium leading-tight'>{mod.title}</span>
                    </div>
                  </button>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Sheet
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setDetailId(null);
        }}>
        <SheetContent
          side='right'
          className='flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md md:max-w-lg'>
          <SheetHeader className='shrink-0 border-b px-4 pt-4 pb-3 pr-12'>
            <SheetTitle>{detailMod?.title ?? 'Module'}</SheetTitle>
            <SheetDescription className='sr-only'>
              Markdown description for this system module.
            </SheetDescription>
          </SheetHeader>
          <div className='flex min-h-0 flex-1 flex-col'>
            <MarkdownPanel
              readOnly
              value={(detailMod?.description ?? '').trim()}
              placeholder='No description for this module.'
              className='min-h-0 flex-1 p-0'
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
