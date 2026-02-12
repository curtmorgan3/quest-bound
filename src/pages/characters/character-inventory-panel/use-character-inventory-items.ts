import type { ContextMenuState } from '@/lib/compass-planes/nodes/components/inventory/item-context-menu';
import type { InventoryItemWithData } from '@/stores';
import type { InventoryItemType, InventoryListRow } from '@/types';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useMemo, type RefObject } from 'react';

interface UseCharacterInventoryItems {
  titleFilter: string;
  inventoryItems: InventoryItemWithData[];
  parentRef: RefObject<HTMLDivElement | null>;
  typeFilter?: InventoryItemType;
  contextMenu?: ContextMenuState | null;
}

export const useCharacterInventoryItems = ({
  titleFilter,
  typeFilter,
  inventoryItems,
  contextMenu,
  parentRef,
}: UseCharacterInventoryItems) => {
  const filteredItems = useMemo(() => {
    const search = titleFilter.trim().toLowerCase();
    const filtered = inventoryItems.filter((item) => {
      if (item.type !== typeFilter) return false;
      if (search && !item.title.toLowerCase().includes(search)) return false;
      return true;
    });
    return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
  }, [inventoryItems, typeFilter, titleFilter]);

  const rows = useMemo((): InventoryListRow[] => {
    const openItemId = contextMenu?.item.id;
    return filteredItems.map((entry) => {
      const baseSize = entry.description ? 56 : 40;
      const hasMenuOpen = openItemId === entry.id;
      return {
        type: 'entry' as const,
        entry,
        estimatedSize: hasMenuOpen ? 420 : baseSize,
      };
    });
  }, [filteredItems, contextMenu?.item.id]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => rows[index]?.estimatedSize ?? 44,
    overscan: 5,
  });

  return {
    virtualizer,
    rows,
  };
};
