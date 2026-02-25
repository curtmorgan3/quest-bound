import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { InventoryItemWithData } from '@/stores';
import { GaugeIcon, GripVertical, PackageIcon, ZapIcon } from 'lucide-react';
import { useInventoryDragContext } from '@/stores';

export function DefaultInventoryEntryRow({
  item,
  onItemClick,
}: {
  item: InventoryItemWithData;
  onItemClick: (e: React.MouseEvent, item: InventoryItemWithData) => void;
}) {
  const { beginDrag, updateDragPosition, cancelDrag } = useInventoryDragContext();

  const Icon = item.type === 'item' ? PackageIcon : item.type === 'action' ? ZapIcon : GaugeIcon;
  const image = item.image ?? null;

  let value = item.value ?? '';
  if (item.type === 'attribute' && typeof value === 'string') {
    // Multi-select list attributes
    value = value.replace(';;', ', ');
  }

  return (
    <div className='w-full px-2 py-1.5 rounded-md text-sm flex items-center gap-2 hover:bg-accent hover:text-accent-foreground transition-colors'>
      <button
        type='button'
        aria-label='Drag to place on sheet'
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          beginDrag(
            { item, source: 'panel' },
            { clientX: e.clientX, clientY: e.clientY },
          );
        }}
        onPointerMove={(e) => {
          if (e.buttons === 0) return;
          updateDragPosition({ clientX: e.clientX, clientY: e.clientY });
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          e.preventDefault();
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
        <span className='shrink-0 ml-auto italic text-muted-foreground'>{String(value)}</span>
      )}
    </div>
  );
}
