import {
  Button,
  Checkbox,
  DescriptionViewer,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  NumberInput,
} from '@/components';
import { useActions, useAttributes, useCharacterAttributes, useItems } from '@/lib/compass-api';
import { injectCharacterData } from '@/lib/compass-planes/utils';
import { CharacterContext, DiceContext, type InventoryItemWithData } from '@/stores';
import { parseTextForDiceRolls, useKeyListeners } from '@/utils';
import { Check, Drumstick, Shirt, Trash, Zap } from 'lucide-react';
import { useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type ContextMenuState = {
  item: InventoryItemWithData;
  x: number;
  y: number;
};

type ItemContextMenuProps = {
  item: InventoryItemWithData;
  /** Required when inline is false (portal mode). Ignored when inline is true. */
  position?: { x: number; y: number };
  /** When true, render in place (no portal, no fixed position). When false, render via portal at position. */
  inline?: boolean;
  onClose: () => void;
  onUpdateQuantity: (quantity: number) => void;
  onUpdateLabel: (label?: string) => void;
  onRemove: () => void;
  onSplit: (splitAmount: number) => void;
  onToggleEquipped?: () => void;
  onConsume?: () => void;
};

export const ItemContextMenu = ({
  item,
  position = { x: 0, y: 0 },
  inline = false,
  onClose,
  onUpdateQuantity,
  onUpdateLabel,
  onRemove,
  onSplit,
  onToggleEquipped,
  onConsume,
}: ItemContextMenuProps) => {
  const characterContext = useContext(CharacterContext);
  const { characterAttributes, updateCharacterAttribute } = useCharacterAttributes(
    characterContext?.character?.id,
  );

  const { attributes } = useAttributes();
  const { actions } = useActions();
  const { items } = useItems();

  const inventoryAttribute = characterAttributes.find((attr) => attr.attributeId === item.entityId);
  const inventoryAction = actions.find((action) => action.id === item.entityId);
  const inventoryItem = items.find((invItem) => invItem.id === item.entityId);

  const isActionOrItemAndHasScript = Boolean(inventoryAction?.scriptId ?? inventoryItem?.scriptId);

  const [quantity, setQuantity] = useState(item.quantity);

  const [splitAmount, setSplitAmount] = useState(Math.floor(item.quantity / 2));
  const { rollDice } = useContext(DiceContext);
  const menuRef = useRef<HTMLDivElement>(null);
  const maxQuantity = item.stackSize;
  const [computedPosition, setComputedPosition] = useState(position);

  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [labelValue, setLabelValue] = useState(item.label ?? item.title);
  const labelInputRef = useRef<HTMLInputElement>(null);

  const isMultiSelectList =
    inventoryAttribute?.type === 'list' &&
    inventoryAttribute?.allowMultiSelect &&
    (inventoryAttribute?.options?.length ?? 0) > 0;

  const multiSelectValue =
    isMultiSelectList && inventoryAttribute?.value
      ? String(inventoryAttribute.value)
          .split(';;')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
  const [multiSelectDialogOpen, setMultiSelectDialogOpen] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<string[]>([]);

  const openMultiSelectDialog = () => {
    if (!inventoryAttribute) return;
    setPendingSelection([...multiSelectValue]);
    setMultiSelectDialogOpen(true);
  };

  const toggleMultiSelectOption = (option: string) => {
    setPendingSelection((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option],
    );
  };

  const applyMultiSelect = () => {
    if (!inventoryAttribute) return;
    updateCharacterAttribute(inventoryAttribute.id, {
      value: pendingSelection.join(';;'),
    });
    setMultiSelectDialogOpen(false);
  };

  const renderedDescription = injectCharacterData({
    value: item.description ?? '',
    attributes,
    characterData: characterContext?.character,
    getCharacterAttribute: characterContext?.getCharacterAttribute,
  });

  const diceRolls = parseTextForDiceRolls(renderedDescription.toString() ?? '');

  useEffect(() => {
    setLabelValue(item.label ?? item.title);
  }, [item.id, item.label, item.title]);

  useEffect(() => {
    if (isEditingLabel && labelInputRef.current) {
      labelInputRef.current.focus();
      labelInputRef.current.select();
    }
  }, [isEditingLabel]);

  const handleClose = () => {
    setIsEditingLabel(false);
    onUpdateQuantity(quantity);
    onClose();
  };

  const handleRoll = () => {
    if (!diceRolls.length) return;
    rollDice(diceRolls.join(','));
  };

  useKeyListeners({
    onKeyDown: (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    },
  });

  const handleLabelCommit = () => {
    const trimmed = labelValue.trim();
    const current = item.label ?? item.title;

    if (trimmed === current) {
      setIsEditingLabel(false);
      return;
    }

    onUpdateLabel(trimmed || undefined);
    setIsEditingLabel(false);
  };

  const handleSplit = () => {
    if (splitAmount >= 1 && splitAmount < item.quantity) {
      onSplit(splitAmount);
    }
  };

  const handleFireAction = () => {
    characterContext?.fireAction(item.entityId);
  };

  const handleActivateItem = () => {
    characterContext?.activateItem(item.id);
  };

  const handleConsume = () => {
    if (!onConsume) return;
    // Consume is a built-in that always reduces qty by one
    // Do this to keep state in sync here
    setQuantity((prev) => prev - 1);
    onConsume();
  };

  const canSplit = item.quantity > 1;

  useEffect(() => {
    if (inline) return;
    const menuEl = menuRef.current;
    if (!menuEl || typeof window === 'undefined') return;

    const rect = menuEl.getBoundingClientRect();
    const viewportWidth = window.innerWidth;

    let newX = position.x;

    // If the menu would overflow off the right edge, shift it left so it stays on-screen.
    if (position.x + rect.width > viewportWidth) {
      const padding = 8;
      newX = Math.max(padding, viewportWidth - rect.width - padding);
    }

    setComputedPosition((prev) =>
      prev.x === newX && prev.y === position.y ? prev : { x: newX, y: position.y },
    );
  }, [inline, position.x, position.y]);

  const menuStyle: React.CSSProperties = inline
    ? {
        backgroundColor: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: 8,
        padding: 12,
        minWidth: 300,
        maxWidth: 500,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        width: '100%',
        boxSizing: 'border-box',
      }
    : {
        position: 'fixed',
        left: computedPosition.x,
        top: computedPosition.y,
        backgroundColor: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: 8,
        padding: 12,
        minWidth: 300,
        maxWidth: 500,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 100,
      };

  const menuContent = (
    <div
      id='item-context-menu'
      ref={menuRef}
      onPointerDown={(e) => e.stopPropagation()}
      style={menuStyle}
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
        <Check size={16} />
      </button>

      <div
        style={{
          marginBottom: 12,
          fontWeight: 600,
          color: '#fff',
          paddingRight: 24,
          cursor: 'text',
        }}
        onClick={(e) => {
          e.stopPropagation();
          setIsEditingLabel(true);
        }}>
        {isEditingLabel ? (
          <input
            ref={labelInputRef}
            type='text'
            value={labelValue}
            onChange={(e) => setLabelValue(e.target.value)}
            onBlur={handleLabelCommit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleLabelCommit();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setIsEditingLabel(false);
                setLabelValue(item.label ?? item.title);
              }
            }}
            style={{
              width: '100%',
              padding: '4px 6px',
              backgroundColor: '#2a2a2a',
              border: '1px solid #444',
              borderRadius: 4,
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
            }}
          />
        ) : (
          (item.label ?? item.title)
        )}
      </div>

      {item.description && (
        <div
          style={{
            maxHeight: 200,
            minHeight: 0,
            overflowY: 'auto',
            flexShrink: 1,
          }}>
          <DescriptionViewer
            onClick={handleRoll}
            className={diceRolls.length ? 'clickable' : undefined}
            value={renderedDescription.toString()}
          />
        </div>
      )}

      {maxQuantity > 1 && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#999', marginBottom: 4 }}>
            {`Quantity (max: ${maxQuantity})`}
          </label>
          <NumberInput
            value={quantity}
            onChange={(value) => {
              if (typeof value === 'number' && value >= 1) {
                setQuantity(Math.max(1, Math.min(value, maxQuantity)));
              }
            }}
            inputMin={1}
            inputMax={item.stackSize}
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

      <div className='flex gap-2'>
        {item.isEquippable && !!onToggleEquipped && (
          <div style={{ marginBottom: 12 }}>
            <Shirt
              onClick={onToggleEquipped}
              onPointerDown={(e) => e.stopPropagation()}
              size={18}
              className='clickable'
              style={{ color: item.isEquipped ? 'var(--color-primary, #6a9)' : '#999' }}
            />
          </div>
        )}

        {item.isConsumable && !!onConsume && (
          <div style={{ marginBottom: 12 }}>
            <Drumstick
              onClick={handleConsume}
              onPointerDown={(e) => e.stopPropagation()}
              size={18}
              className='clickable'
              style={{ color: '#999' }}
            />
          </div>
        )}
      </div>

      {inventoryAttribute && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#999', marginBottom: 4 }}>
            {inventoryAttribute.title}
          </label>
          {inventoryAttribute.type === 'boolean' ? (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type='checkbox'
                checked={Boolean(inventoryAttribute.value)}
                onChange={(e) =>
                  updateCharacterAttribute(inventoryAttribute.id, {
                    value: e.target.checked,
                  })
                }
                onPointerDown={(e) => e.stopPropagation()}
                style={{ width: 16, height: 16 }}
              />
              <span style={{ color: '#fff', fontSize: 14 }}>
                {inventoryAttribute.value ? 'True' : 'False'}
              </span>
            </label>
          ) : inventoryAttribute.type === 'number' ? (
            <NumberInput
              value={Number(inventoryAttribute.value)}
              onChange={(value) => {
                updateCharacterAttribute(inventoryAttribute.id, { value });
              }}
              inputMin={inventoryAttribute.min}
              inputMax={inventoryAttribute.max}
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
          ) : isMultiSelectList ? (
            <>
              <button
                type='button'
                onClick={openMultiSelectDialog}
                onPointerDown={(e) => e.stopPropagation()}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  backgroundColor: '#2a2a2a',
                  border: '1px solid #444',
                  borderRadius: 4,
                  color: '#fff',
                  fontSize: 14,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}>
                {multiSelectValue.length > 0
                  ? multiSelectValue.join(', ')
                  : (inventoryAttribute.title ?? 'Select…')}
              </button>
              <Dialog open={multiSelectDialogOpen} onOpenChange={setMultiSelectDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{inventoryAttribute.title ?? 'Select options'}</DialogTitle>
                  </DialogHeader>
                  <div className='flex flex-col gap-2 max-h-[60vh] overflow-y-auto py-2'>
                    {inventoryAttribute.options?.map((option) => (
                      <label
                        key={option}
                        className='flex items-center gap-2 cursor-pointer rounded-sm px-2 py-1.5 hover:bg-muted/50'>
                        <Checkbox
                          checked={pendingSelection.includes(option)}
                          onCheckedChange={() => toggleMultiSelectOption(option)}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                  <DialogFooter>
                    <Button onClick={applyMultiSelect}>Done</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          ) : inventoryAttribute.type === 'list' && inventoryAttribute.options?.length ? (
            <select
              value={String(inventoryAttribute.value)}
              onChange={(e) =>
                updateCharacterAttribute(inventoryAttribute.id, {
                  value: e.target.value,
                })
              }
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                padding: '6px 8px',
                backgroundColor: '#2a2a2a',
                border: '1px solid #444',
                borderRadius: 4,
                color: '#fff',
                fontSize: 14,
              }}>
              {inventoryAttribute.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <input
              type='text'
              value={String(inventoryAttribute.value ?? '')}
              onChange={(e) =>
                updateCharacterAttribute(inventoryAttribute.id, {
                  value: e.target.value,
                })
              }
              onPointerDown={(e) => e.stopPropagation()}
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
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={onRemove}
          style={{
            width: '32px',
            display: 'flex',
            padding: '8px',
            justifyContent: 'center',
            backgroundColor: '#4a2a2a',
            border: '1px solid #633',
            borderRadius: 4,
            color: '#ff8888',
            fontSize: 13,
            cursor: 'pointer',
          }}>
          <Trash size={16} />
        </button>
        {isActionOrItemAndHasScript && (
          <button
            type='button'
            onClick={() => {
              if (item.type === 'action') {
                handleFireAction();
              } else {
                handleActivateItem();
              }
            }}
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              width: '32px',
              display: 'flex',
              padding: '8px',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#2a4a2a',
              border: '1px solid #363',
              borderRadius: 4,
              color: '#8f8',
              fontSize: 13,
              cursor: 'pointer',
            }}>
            <Zap size={16} />
          </button>
        )}
      </div>
    </div>
  );

  if (inline) {
    return menuContent;
  }
  return createPortal(menuContent, document.body);
};
