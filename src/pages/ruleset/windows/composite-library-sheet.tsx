import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useComposites } from '@/lib/compass-api';
import { ChevronDown, ChevronRight, Library, Plus, Stamp, Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';

interface CompositeLibrarySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  windowId: string;
  /** World coordinates for the stamped group root. */
  stampAt: { x: number; y: number };
}

export function CompositeLibrarySheet({
  open,
  onOpenChange,
  windowId,
  stampAt,
}: CompositeLibrarySheetProps) {
  const {
    composites,
    isLoading,
    variantsForComposite,
    stampComposite,
    removeComposite,
    addVariant,
  } = useComposites();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [variantNameDraft, setVariantNameDraft] = useState<Record<string, string>>({});

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleStampDefault = useCallback(
    async (compositeId: string) => {
      await stampComposite({
        targetWindowId: windowId,
        compositeId,
        variantGroupRootId: null,
        rootWorldX: stampAt.x,
        rootWorldY: stampAt.y,
      });
      onOpenChange(false);
    },
    [onOpenChange, stampAt.x, stampAt.y, stampComposite, windowId],
  );

  const handleStampVariant = useCallback(
    async (compositeId: string, groupComponentId: string) => {
      await stampComposite({
        targetWindowId: windowId,
        compositeId,
        variantGroupRootId: groupComponentId,
        rootWorldX: stampAt.x,
        rootWorldY: stampAt.y,
      });
      onOpenChange(false);
    },
    [onOpenChange, stampAt.x, stampAt.y, stampComposite, windowId],
  );

  const handleAddVariant = useCallback(
    async (compositeId: string) => {
      const name = (variantNameDraft[compositeId] ?? '').trim();
      if (!name) return;
      await addVariant(compositeId, name);
      setVariantNameDraft((d) => ({ ...d, [compositeId]: '' }));
    },
    [addVariant, variantNameDraft],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side='right' className='w-full gap-0 overflow-y-auto sm:max-w-sm'>
        <SheetHeader className='border-b pb-4 text-left'>
          <SheetTitle className='flex items-center gap-2'>
            <Library className='size-4' aria-hidden />
            Composite library
          </SheetTitle>
          <SheetDescription>
            Stamp a saved group onto this window. Expand a composite to manage variants.
          </SheetDescription>
        </SheetHeader>

        <div className='flex flex-col gap-1 p-4'>
          {isLoading ? (
            <p className='text-muted-foreground text-sm'>Loading…</p>
          ) : composites.length === 0 ? (
            <p className='text-muted-foreground text-sm'>
              No composites yet. Select a group and use Save as composite in the edit panel.
            </p>
          ) : (
            composites.map((c) => {
              const expanded = expandedId === c.id;
              const variants = variantsForComposite(c.id);
              return (
                <div
                  key={c.id}
                  className='border-border rounded-md border'>
                  <div className='flex items-center gap-1 p-2'>
                    <button
                      type='button'
                      className='text-muted-foreground hover:text-foreground shrink-0 p-0.5'
                      aria-expanded={expanded}
                      aria-label={expanded ? 'Collapse variants' : 'Expand variants'}
                      onClick={() => toggleExpand(c.id)}>
                      {expanded ? (
                        <ChevronDown className='size-4' />
                      ) : (
                        <ChevronRight className='size-4' />
                      )}
                    </button>
                    <span className='min-w-0 flex-1 truncate text-sm font-medium' title={c.name}>
                      {c.name}
                    </span>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='size-8 shrink-0'
                      aria-label={`Stamp ${c.name}`}
                      title='Stamp default'
                      onClick={() => void handleStampDefault(c.id)}>
                      <Stamp className='size-4' />
                    </Button>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='text-destructive size-8 shrink-0'
                      aria-label={`Delete composite ${c.name}`}
                      title='Delete composite and templates'
                      onClick={() => void removeComposite(c.id)}>
                      <Trash2 className='size-4' />
                    </Button>
                  </div>
                  {expanded ? (
                    <div className='border-border space-y-2 border-t px-2 py-2'>
                      <div className='flex gap-1'>
                        <Input
                          placeholder='New variant name'
                          value={variantNameDraft[c.id] ?? ''}
                          onChange={(e) =>
                            setVariantNameDraft((d) => ({ ...d, [c.id]: e.target.value }))
                          }
                          className='h-8 text-sm'
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void handleAddVariant(c.id);
                          }}
                        />
                        <Button
                          type='button'
                          size='sm'
                          variant='secondary'
                          className='h-8 shrink-0 px-2'
                          onClick={() => void handleAddVariant(c.id)}>
                          <Plus className='size-4' />
                        </Button>
                      </div>
                      {variants.length === 0 ? (
                        <p className='text-muted-foreground px-1 text-xs'>No variants yet.</p>
                      ) : (
                        <ul className='space-y-1'>
                          {variants.map((v) => (
                            <li
                              key={v.id}
                              className='flex items-center gap-1 rounded bg-muted/40 px-2 py-1'>
                              <span className='min-w-0 flex-1 truncate text-xs' title={v.name}>
                                {v.name}
                              </span>
                              <Button
                                type='button'
                                variant='ghost'
                                size='icon'
                                className='size-7 shrink-0'
                                aria-label={`Stamp variant ${v.name}`}
                                onClick={() => void handleStampVariant(c.id, v.groupComponentId)}>
                                <Stamp className='size-3.5' />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
