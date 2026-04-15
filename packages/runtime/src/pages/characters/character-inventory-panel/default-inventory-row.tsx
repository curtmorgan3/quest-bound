import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { InventoryItemWithData } from '@/stores';
import { GaugeIcon, GripVertical, PackageIcon, PinIcon, ZapIcon } from 'lucide-react';
import { useInventoryDragContext } from '@quest-bound/runtime/context';
import { useInventoryPlacement } from '@/lib/compass-planes/nodes/components/inventory/use-inventory-placement';
import { useRef } from 'react';
import { cn } from '@/lib/utils';

export function DefaultInventoryEntryRow({
  item,
  onItemClick,
  isPinned,
  onTogglePin,
}: {
  item: InventoryItemWithData;
  onItemClick: (e: React.MouseEvent, item: InventoryItemWithData) => void;
  isPinned?: boolean;
  onTogglePin?: (itemId: string) => void;
}) {
  const { beginDrag, updateDragPosition, cancelDrag, resolveDrop, activeDrag } =
    useInventoryDragContext();
  const { placeItemInTargetGrid } = useInventoryPlacement();
  const isPointerDownRef = useRef(false);

  const Icon = item.type === 'item' ? PackageIcon : item.type === 'action' ? ZapIcon : GaugeIcon;
  const image = item.image ?? null;

  let value = item.value ?? '';
  if (item.type === 'attribute' && typeof value === 'string') {
    // Multi-select list attributes
    value = value.replace(';;', ', ');
  }

  return (
    <div className='group w-full px-2 py-1.5 rounded-md text-sm flex items-center gap-2 hover:bg-accent hover:text-accent-foreground transition-colors'>
      <button
        type='button'
        aria-label='Drag to place on sheet'
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          const target = e.currentTarget as HTMLElement;
          try {
            target.setPointerCapture(e.pointerId);
          } catch {
            // ignore
          }
          isPointerDownRef.current = true;
          beginDrag(
            { item, source: 'panel' },
            { clientX: e.clientX, clientY: e.clientY },
          );
        }}
        onPointerMove={(e) => {
          if (!isPointerDownRef.current || e.buttons === 0) return;
          updateDragPosition({ clientX: e.clientX, clientY: e.clientY });
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          e.preventDefault();
          isPointerDownRef.current = false;
          const target = e.currentTarget as HTMLElement;
          try {
            target.releasePointerCapture(e.pointerId);
          } catch {
            // ignore
          }

          const drag = activeDrag;
          if (!drag || drag.source !== 'panel' || drag.item.id !== item.id) {
            cancelDrag();
            return;
          }

          const resolved = resolveDrop(e.clientX, e.clientY);
          if (resolved) {
            placeItemInTargetGrid({
              item: drag.item,
              targetComponentId: resolved.targetComponentId,
              cellX: resolved.cellX,
              cellY: resolved.cellY,
              config: resolved.config,
            });
          }

          cancelDrag();
        }}
        className='h-8 w-6 flex items-center justify-center rounded-md cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground'>
        <GripVertical className='h-4 w-4' />
      </button>
      <Avatar className='h-8 w-8 rounded-md shrink-0'>
        {image ? (
          <AvatarImage src={image} alt={item.title} className='object-cover' />
        ) : (
          <AvatarFallback className='rounded-md bg-muted'>
            <Icon className='h-4 w-4 text-muted-foreground' />
          </AvatarFallback>
        )}
      </Avatar>
      <button
        type='button'
        onClick={(e) => onItemClick(e, item)}
        className='min-w-0 flex-1 text-left'>
        <span className='font-medium'>{item.label ?? item.title}</span>
        {item.quantity > 1 && <span className='text-muted-foreground ml-1'>×{item.quantity}</span>}
      </button>
      {item.type === 'attribute' && (
        <span className='shrink-0 italic text-muted-foreground'>{String(value)}</span>
      )}
      {onTogglePin && (
        <button
          type='button'
          aria-label={isPinned ? 'Unpin item' : 'Pin item'}
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(item.id);
          }}
          className={cn(
            'shrink-0 h-6 w-6 flex items-center justify-center rounded transition-colors',
            isPinned
              ? 'text-primary'
              : 'text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground',
          )}>
          <PinIcon className='h-3.5 w-3.5' />
        </button>
      )}
    </div>
  );
}
