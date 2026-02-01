import { type InventoryItemWithData } from '@/stores';
import { useKeyListeners } from '@/utils';
import { X } from 'lucide-react';
import { useRef, useState } from 'react';

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
        handleClose();
      }
    },
  });

  const handleClose = () => {
    handleQuantityBlur();
    onClose();
  };

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
      }}
      className='relative'>
      <button
        onClick={handleClose}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          background: 'transparent',
          border: 'none',
          color: '#999',
          cursor: 'pointer',
          padding: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 4,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#999')}>
        <X size={16} />
      </button>

      <div style={{ marginBottom: 12, fontWeight: 600, color: '#fff', paddingRight: 24 }}>
        {item.title}
      </div>

      {item.description && (
        <div
          style={{
            marginBottom: 12,
            fontSize: 12,
            color: '#aaa',
            lineHeight: 1.4,
          }}>
          {item.description}
        </div>
      )}

      {maxQuantity > 1 && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#999', marginBottom: 4 }}>
            Quantity
          </label>
          <div className='flex gap-2'>
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
            <div className='flex flex-col'>
              <button onClick={() => setQuantity((prev) => Math.min(prev + 1, maxQuantity))}>
                ^
              </button>
              <button
                onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                style={{ transform: 'rotate(180deg)' }}>
                ^
              </button>
            </div>
          </div>
        </div>
      )}

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
