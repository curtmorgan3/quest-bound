import { type InventoryItemWithData } from '@/stores';
import { useKeyListeners } from '@/utils';
import { useEffect, useRef, useState } from 'react';

export type ContextMenuState = {
  item: InventoryItemWithData;
  x: number;
  y: number;
};

type ItemContextMenuProps = {
  item: InventoryItemWithData;
  position: { x: number; y: number };
  onClose: () => void;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
  onSplit: (splitAmount: number) => void;
};

export const ItemContextMenu = ({
  item,
  position,
  onClose,
  onUpdateQuantity,
  onRemove,
  onSplit,
}: ItemContextMenuProps) => {
  const [quantity, setQuantity] = useState(item.quantity);
  const [splitAmount, setSplitAmount] = useState(Math.floor(item.quantity / 2));
  const menuRef = useRef<HTMLDivElement>(null);
  const maxQuantity = item.stackSize;

  useKeyListeners({
    onKeyDown: (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        handleQuantityBlur();
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1) {
      setQuantity(Math.max(1, Math.min(value, maxQuantity)));
    }
  };

  const handleQuantityBlur = () => {
    if (quantity !== item.quantity && quantity >= 1) {
      onUpdateQuantity(quantity);
    }
  };

  const handleSplit = () => {
    if (splitAmount >= 1 && splitAmount < item.quantity) {
      onSplit(splitAmount);
    }
  };

  const canSplit = item.quantity > 1;

  return (
    <div
      id='item-context-menu'
      ref={menuRef}
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        left: 40,
        top: 40,
        backgroundColor: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: 8,
        padding: 12,
        minWidth: 200,
        zIndex: 1000,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      }}>
      <div style={{ marginBottom: 12, fontWeight: 600, color: '#fff' }}>{item.title}</div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 12, color: '#999', marginBottom: 4 }}>
          Quantity
        </label>
        <input
          type='number'
          min={1}
          max={item.stackSize}
          value={quantity}
          onPointerMove={(e) => {
            e.preventDefault();
            return;
          }}
          onChange={handleQuantityChange}
          onBlur={handleQuantityBlur}
          onKeyDown={(e) => e.key === 'Enter' && handleQuantityBlur()}
          style={{
            width: '100%',
            padding: '6px 8px',
            backgroundColor: '#2a2a2a',
            border: '1px solid #444',
            borderRadius: 4,
            color: '#fff',
            fontSize: 14,
          }}
        />
      </div>

      {canSplit && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#999', marginBottom: 4 }}>
            Split Stack ({splitAmount} / {item.quantity - splitAmount})
          </label>
          <input
            type='range'
            onPointerDown={(e) => e.stopPropagation()}
            min={1}
            max={item.quantity - 1}
            value={splitAmount}
            onChange={(e) => setSplitAmount(parseInt(e.target.value, 10))}
            style={{ width: '100%', marginBottom: 8 }}
          />
          <button
            onClick={handleSplit}
            style={{
              width: '100%',
              padding: '6px 12px',
              backgroundColor: '#3a3a3a',
              border: '1px solid #555',
              borderRadius: 4,
              color: '#fff',
              fontSize: 13,
              cursor: 'pointer',
            }}>
            Split Stack
          </button>
        </div>
      )}

      <button
        onClick={onRemove}
        style={{
          width: '100%',
          padding: '6px 12px',
          backgroundColor: '#4a2a2a',
          border: '1px solid #633',
          borderRadius: 4,
          color: '#ff8888',
          fontSize: 13,
          cursor: 'pointer',
        }}>
        Remove Item
      </button>
    </div>
  );
};
