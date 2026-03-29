import { Input } from '@/components';
import type { Coordinates } from '@/types';
import { useKeyListeners } from '@/utils';
import { useEffect, useRef, useState } from 'react';
import type { EditorMenuOption } from '../nodes/node-types';

interface ContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  x: number;
  y: number;
  options: EditorMenuOption[];
  onSelect: (option: EditorMenuOption, coordinates: Coordinates) => void;
  /** Canvas / flow space coordinates for placing a new component (parent computes). */
  addComponentCoordinates: Coordinates;
}

export const ContextMenu = ({
  isOpen,
  onClose,
  onSelect,
  options,
  x: _x,
  y: _y,
  addComponentCoordinates,
}: ContextMenuProps) => {
  const [filterValue, setFilterValue] = useState<string>('');

  const filteredOptions = options.filter((option) =>
    option.name.toLowerCase().includes(filterValue.toLowerCase()),
  );

  const selection = filteredOptions[0];

  const rightWindowBoundary = window.innerWidth - 350;
  const bottomWindowBoundary = window.innerHeight - 250;
  const leftWindowBoundary = 350;

  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickAway = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setFilterValue('');
      onClose();
    };
    document.addEventListener('mousedown', handleClickAway);
    return () => document.removeEventListener('mousedown', handleClickAway);
  }, [isOpen, onClose]);

  const handleClose = () => {
    setFilterValue('');
    onClose();
  };

  const handleSelect = (option: EditorMenuOption) => {
    onSelect(option, addComponentCoordinates);
    handleClose();
  };

  useKeyListeners({
    disabled: !isOpen,
    onKeyDown: (e) => {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'Enter') {
        if (filteredOptions.length > 0) {
          handleSelect(selection);
        }
      }
    },
  });

  if (!isOpen) return null;
  return (
    <div
      ref={menuRef}
      style={{
        padding: '8px',
        width: '300px',
        maxHeight: '350px',
        position: 'fixed',
        top: _y > bottomWindowBoundary ? undefined : _y,
        bottom: _y > bottomWindowBoundary ? 0 : undefined,
        left: _x > rightWindowBoundary ? undefined : _x < leftWindowBoundary ? 0 : _x,
        right: _x > rightWindowBoundary ? 0 : undefined,
        zIndex: 10,
        backgroundColor: '#42403D',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
      <Input
        ref={inputRef}
        value={filterValue}
        onChange={(e) => setFilterValue(e.target.value)}
        placeholder='Filter'
        style={{ position: 'sticky', top: 0, zIndex: 1 }}
      />

      <div style={{ overflowY: 'scroll', flexGrow: 1 }}>
        {!filteredOptions.length && <p style={{ fontStyle: 'italic' }}>No options found</p>}
        {filteredOptions.map((option, i) => (
          <div role='button' key={i} data-testid={`context-menu-option-${option.nodeType}`}>
            <p
              className='clickable'
              onClick={() => {
                handleSelect(option);
              }}>
              {option.name}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
