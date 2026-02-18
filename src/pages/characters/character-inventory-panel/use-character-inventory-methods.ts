import type { ContextMenuState } from '@/lib/compass-planes/nodes/components/inventory/item-context-menu';
import { CharacterContext, type InventoryItemWithData } from '@/stores';
import type { InventoryItemType } from '@/types';
import { useContext, useState } from 'react';

interface UseCharacterInventoryMethods {
  typeFilter: InventoryItemType;
}

export const useCharacterInventoryMethods = ({ typeFilter }: UseCharacterInventoryMethods) => {
  const {
    consumeItem,
    setInventoryPanelConfig,
    updateInventoryItem,
    removeInventoryItem,
    addInventoryItem,
  } = useContext(CharacterContext);

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const handleItemClick = (e: React.MouseEvent, item: InventoryItemWithData) => {
    e.stopPropagation();
    setContextMenu((prev) => (prev?.item.id === item.id ? null : { item, x: 0, y: 0 }));
  };

  const handleCloseContextMenu = () => setContextMenu(null);

  const handleUpdateQuantity = (quantity: number) => {
    if (!contextMenu) return;
    updateInventoryItem(contextMenu.item.id, { quantity });
    setContextMenu(null);
  };

  const handleUpdateEquipped = (isEquipped: boolean) => {
    if (!contextMenu) return;
    const item = contextMenu.item;
    updateInventoryItem(item.id, { isEquipped });
  };

  const handleRemoveItem = () => {
    if (!contextMenu) return;
    removeInventoryItem(contextMenu.item.id);
    setContextMenu(null);
  };

  const handleUpdateLabel = (label?: string) => {
    if (!contextMenu) return;
    updateInventoryItem(contextMenu.item.id, { label });
  };

  const handleSplitStack = (splitAmount: number) => {
    if (!contextMenu) return;
    const item = contextMenu.item;
    const remainingQuantity = item.quantity - splitAmount;
    updateInventoryItem(item.id, { quantity: remainingQuantity });
    addInventoryItem({
      type: item.type,
      entityId: item.entityId,
      componentId: '',
      quantity: splitAmount,
      x: 0,
      y: 0,
    });
    setContextMenu(null);
  };

  const handleOpenInventoryPanel = () => {
    setInventoryPanelConfig({
      open: true,
      addToDefaultInventory: true,
      type: typeFilter,
    });
  };

  const handleConsumeItem = () => {
    if (!contextMenu) return;
    const item = contextMenu.item;
    consumeItem(item.id);
    setContextMenu(null);
  };

  return {
    contextMenu,
    setContextMenu,
    handleItemClick,
    handleCloseContextMenu,
    handleUpdateQuantity,
    handleRemoveItem,
    handleOpenInventoryPanel,
    handleSplitStack,
    handleUpdateLabel,
    handleUpdateEquipped,
    handleConsumeItem,
  };
};
