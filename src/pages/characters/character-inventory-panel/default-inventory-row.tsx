import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { InventoryItemWithData } from '@/stores';
import { GaugeIcon, PackageIcon, ZapIcon } from 'lucide-react';

export function DefaultInventoryEntryRow({
  item,
  onItemClick,
}: {
  item: InventoryItemWithData;
  onItemClick: (e: React.MouseEvent, item: InventoryItemWithData) => void;
}) {
  const Icon = item.type === 'item' ? PackageIcon : item.type === 'action' ? ZapIcon : GaugeIcon;
  const image = item.image ?? null;

  let value = item.value ?? '';
  if (item.type === 'attribute' && typeof value === 'string') {
    // Multi-select list attributes
    value = value.replace(';;', ', ');
  }

  return (
    <button
      type='button'
      onClick={(e) => onItemClick(e, item)}
      className='w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center gap-2 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer'>
      <Avatar className='h-8 w-8 rounded-md shrink-0'>
        {image ? (
          <AvatarImage src={image} alt={item.title} className='object-cover' />
        ) : (
          <AvatarFallback className='rounded-md bg-muted'>
            <Icon className='h-4 w-4 text-muted-foreground' />
          </AvatarFallback>
        )}
      </Avatar>
      <div className='min-w-0 flex-1'>
        <span className='font-medium'>{item.label ?? item.title}</span>
        {item.quantity > 1 && <span className='text-muted-foreground ml-1'>×{item.quantity}</span>}
      </div>
      {item.type === 'attribute' && (
        <span className='shrink-0 ml-auto italic text-muted-foreground'>{String(value)}</span>
      )}
    </button>
  );
}
