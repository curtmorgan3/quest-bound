import type { ComponentUpdate } from '@/lib/compass-api';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { WindowEditorContext } from '@/stores';
import type { Component, Coordinates } from '@/types';
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from 'react';

import { EditorItemIdProvider, EditorItemLayoutProvider } from '../canvas';
import { injectDefaultComponent } from '../utils/inject-defaults';
import { sheetNodeTypes, type EditorMenuOption } from '../nodes';
import { ComponentTypes } from '../nodes/node-types';

const PREVIEW_MAX_W = 120;
const PREVIEW_MAX_H = 80;

function buildPreviewStub(nodeType: ComponentTypes, template: Component | null): Component | null {
  const id = `__canvasAddPreview:${nodeType}`;
  const draft = injectDefaultComponent({
    type: nodeType,
    x: 0,
    y: 0,
    id,
    rulesetId: template?.rulesetId ?? '',
    windowId: template?.windowId ?? '',
    selected: false,
    locked: true,
    createdAt: template?.createdAt ?? new Date(0).toISOString(),
    updatedAt: template?.updatedAt ?? new Date(0).toISOString(),
  });
  return draft ? (draft as Component) : null;
}

function AddComponentPreviewRow({
  option,
  stub,
  onPick,
}: {
  option: EditorMenuOption;
  stub: Component;
  onPick: () => void;
}) {
  const parent = useContext(WindowEditorContext);
  const Edit = sheetNodeTypes[option.nodeType] as ComponentType | undefined;

  const mergedGetComponent = useCallback(
    (id: string) => (id === stub.id ? stub : parent.getComponent(id)),
    [parent, stub],
  );

  const previewContext = useMemo(
    () => ({
      ...parent,
      getComponent: mergedGetComponent,
      updateComponent: (_id: string, _data: Partial<Component>) => {},
      updateComponents: (_updates: ComponentUpdate[]) => {},
    }),
    [mergedGetComponent, parent],
  );

  const scale = Math.min(
    PREVIEW_MAX_W / Math.max(stub.width, 1),
    PREVIEW_MAX_H / Math.max(stub.height, 1),
    1,
  );

  if (!Edit) return null;

  return (
    <button
      type='button'
      onClick={onPick}
      data-testid={`context-menu-option-${option.nodeType}`}
      className={cn(
        'border-border hover:bg-muted/60 flex w-full items-center gap-3 rounded-md border bg-transparent p-2 text-left transition-colors',
      )}>
      <div
        className='bg-muted/40 relative shrink-0 overflow-hidden rounded border'
        style={{ width: PREVIEW_MAX_W, height: PREVIEW_MAX_H }}>
        <div
          className='pointer-events-none absolute left-0 top-0'
          style={{
            width: stub.width,
            height: stub.height,
            transform: `scale(${scale})`,
            transformOrigin: '0 0',
          }}>
          <WindowEditorContext.Provider value={previewContext}>
            <EditorItemLayoutProvider value={{ width: stub.width, height: stub.height }}>
              <EditorItemIdProvider id={stub.id}>
                <Edit />
              </EditorItemIdProvider>
            </EditorItemLayoutProvider>
          </WindowEditorContext.Provider>
        </div>
      </div>
      <div className='min-w-0 flex-1'>
        <div className='text-foreground text-sm font-medium'>{option.name}</div>
        {option.description ? (
          <div className='text-muted-foreground line-clamp-2 text-xs'>{option.description}</div>
        ) : null}
      </div>
    </button>
  );
}

export type AddComponentPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: EditorMenuOption[];
  /** Canvas coordinates where the new component should be placed. */
  placement: Coordinates;
  onPick: (option: EditorMenuOption, coordinates: Coordinates) => void;
  /** Use ruleset/window ids from an existing component for preview stubs. */
  templateComponent: Component | null;
};

export function AddComponentPanel({
  open,
  onOpenChange,
  options,
  placement,
  onPick,
  templateComponent,
}: AddComponentPanelProps) {
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (open) setFilter('');
  }, [open]);

  const filtered = useMemo(
    () => options.filter((o) => o.name.toLowerCase().includes(filter.toLowerCase())),
    [filter, options],
  );

  const stubs = useMemo(() => {
    const map = new Map<ComponentTypes, Component | null>();
    for (const o of options) {
      if (!map.has(o.nodeType)) {
        map.set(o.nodeType, buildPreviewStub(o.nodeType, templateComponent));
      }
    }
    return map;
  }, [options, templateComponent]);

  const handlePick = (option: EditorMenuOption) => {
    onPick(option, placement);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side='right'
        className='flex h-full w-full min-h-0 flex-col gap-0 p-0 sm:max-w-md'>
        <SheetHeader className='border-border shrink-0 border-b px-4 py-3 text-left'>
          <SheetTitle>Add component</SheetTitle>
          <SheetDescription>
            Choose a component to place at the point you right-clicked on the canvas.
          </SheetDescription>
        </SheetHeader>
        <div className='shrink-0 px-4 pt-3'>
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder='Filter'
            aria-label='Filter components'
          />
        </div>
        <ScrollArea className='min-h-0 flex-1 px-3 py-3'>
          <div className='flex flex-col gap-2 pr-2'>
            {filtered.length === 0 ? (
              <p className='text-muted-foreground text-sm italic'>No components match.</p>
            ) : (
              filtered.map((option) => {
                const stub = stubs.get(option.nodeType);
                if (!stub) return null;
                return (
                  <AddComponentPreviewRow
                    key={option.nodeType}
                    option={option}
                    stub={stub}
                    onPick={() => handlePick(option)}
                  />
                );
              })
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
