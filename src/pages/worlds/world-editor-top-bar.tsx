import { Button, Input } from '@/components';
import type { Location } from '@/types';
import { ArrowLeft, ArrowUp, ChevronRight, Pencil, Plus, Waypoints } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

export interface WorldEditorTopBarProps {
  worldLabel: string;
  onUpdateWorldLabel: (label: string) => void;
  parentStack: Location[];
  onBack: () => void;
  onAddLocation: () => void;
  /** Add a new parent location above the current one (only when viewing inside a location). */
  onAddParentToCurrent?: () => void;
  onEditBackground: () => void;
}

export function WorldEditorTopBar({
  worldLabel,
  onUpdateWorldLabel,
  parentStack,
  onBack,
  onAddLocation,
  onAddParentToCurrent,
  onEditBackground,
}: WorldEditorTopBarProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(worldLabel);

  const startEditing = () => {
    setTitleInput(worldLabel);
    setIsEditingTitle(true);
  };

  const saveTitle = () => {
    const next = titleInput.trim() || worldLabel;
    setTitleInput(next);
    setIsEditingTitle(false);
    if (next !== worldLabel) onUpdateWorldLabel(next);
  };

  const cancelEditing = () => {
    setTitleInput(worldLabel);
    setIsEditingTitle(false);
  };

  return (
    <div className='flex shrink-0 flex-wrap items-center gap-2 border-b bg-background px-4 py-2'>
      <Button variant='ghost' size='sm' asChild>
        <Link to='/worlds' data-testid='world-editor-back'>
          <ArrowLeft className='h-4 w-4' />
          Back to Worlds
        </Link>
      </Button>
      <span className='text-muted-foreground'>|</span>
      {isEditingTitle ? (
        <Input
          value={titleInput}
          onChange={(e) => setTitleInput(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveTitle();
            if (e.key === 'Escape') cancelEditing();
          }}
          className='h-8 w-48 font-semibold'
          autoFocus
        />
      ) : (
        <button
          type='button'
          onClick={startEditing}
          className='truncate font-semibold hover:underline'
          data-testid='world-editor-title'>
          {worldLabel}
        </button>
      )}
      {parentStack.map((loc) => (
        <span key={loc.id} className='flex items-center gap-1 text-muted-foreground'>
          <ChevronRight className='h-4 w-4' />
          <span className='truncate font-medium text-foreground'>{loc.label}</span>
        </span>
      ))}
      {parentStack.length > 0 && (
        <Button
          variant='ghost'
          size='sm'
          onClick={onBack}
          data-testid='world-editor-back-in'
          className='clickable'>
          <ArrowUp className='h-4 w-4 clickable' />
        </Button>
      )}
      <div className='flex flex-1 justify-end gap-2'>
        <Button
          variant='outline'
          size='sm'
          onClick={onEditBackground}
          data-testid='world-editor-edit-background'>
          <Pencil className='h-4 w-4' />
        </Button>
        {onAddParentToCurrent && (
          <Button
            variant='outline'
            size='sm'
            className='gap-1'
            data-testid='world-editor-add-parent'
            onClick={onAddParentToCurrent}>
            <Waypoints className='h-4 w-4' />
            Add parent
          </Button>
        )}
        <Button
          variant='outline'
          size='sm'
          className='gap-1'
          data-testid='world-editor-add-location'
          onClick={onAddLocation}>
          <Plus className='h-4 w-4' />
          Add location
        </Button>
      </div>
    </div>
  );
}
