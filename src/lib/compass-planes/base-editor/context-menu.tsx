import { Input, Tooltip } from '@/components';
import type { Coordinates } from '@/types';
import { useKeyListeners } from '@/utils';
import { useViewport } from '@xyflow/react';
import { useEffect, useRef, useState } from 'react';
import type { EditorMenuOption } from '../nodes/node-types';

interface ContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  x: number;
  y: number;
  options: EditorMenuOption[];
  onSelect: (option: EditorMenuOption, coordinates: Coordinates) => void;
}

export const ContextMenu = ({
  isOpen,
  onClose,
  onSelect,
  options,
  x: _x,
  y: _y,
}: ContextMenuProps) => {
  const sidebarCollapsed = localStorage.getItem('qb.sidebarCollapsed') === 'true';

  const [filterValue, setFilterValue] = useState<string>('');

  const filteredOptions = options.filter((option) =>
    option.name.toLowerCase().includes(filterValue.toLowerCase()),
  );

  const selection = filteredOptions[0];

  const { x: viewportX, y: viewportY } = useViewport();
  const x = _x - (sidebarCollapsed ? 47 : 255);
  const y = _y;

  const rightWindowBoundary = window.innerWidth - 350; // Account for width of menu
  const bottomWindowBoundary = window.innerHeight - 250; // Account for max height of menu
  const leftWindowBoundary = 350;

  const relativeX = x - viewportX;
  const relativeY = y - viewportY;

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleClose = () => {
    setFilterValue('');
    onClose();
  };

  const handleSelect = (option: EditorMenuOption) => {
    onSelect(option, { x: relativeX, y: relativeY });
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
      style={{
        padding: '8px',
        width: '300px',
        maxHeight: '350px',
        position: 'absolute',
        top: _y > bottomWindowBoundary ? undefined : y,
        bottom: _y > bottomWindowBoundary ? 0 : undefined,
        left: _x > rightWindowBoundary ? undefined : _x < leftWindowBoundary ? 0 : x,
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
          <div key={i}>
            <Tooltip key={i}>
              <p
                className='clickable'
                onClick={() => {
                  handleSelect(option);
                }}>
                {option.name}
              </p>
            </Tooltip>
          </div>
        ))}
      </div>
    </div>
  );
};
