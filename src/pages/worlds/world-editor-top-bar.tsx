import { Button } from '@/components';
import type { Location } from '@/types';
import { ArrowUp, ChevronRight, FileText, Plus, Waypoints } from 'lucide-react';

export interface WorldEditorTopBarProps {
  parentStack: Location[];
  onBack: () => void;
  onAddLocation: () => void;
  /** Add a new parent location above the current one (only when viewing inside a location). */
  onAddParentToCurrent?: () => void;
  /** Open the location details panel (document). Shown when truthy. */
  onOpenDetails?: () => void;
  /** Whether a location is selected or in context so details can be shown. */
  hasDetailsContext?: boolean;
}

export function WorldEditorTopBar({
  parentStack,
  onBack,
  onAddLocation,
  onAddParentToCurrent,
  onOpenDetails,
  hasDetailsContext,
}: WorldEditorTopBarProps) {
  return (
    <>
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
        {hasDetailsContext && onOpenDetails && (
          <Button
            variant='outline'
            size='sm'
            onClick={onOpenDetails}
            aria-label='Location details'
            title='Location details'>
            <FileText className='h-4 w-4' />
          </Button>
        )}
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
    </>
  );
}
