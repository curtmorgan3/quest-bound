import { Button, Label } from '@/components';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Location } from '@/types';
import { ArrowRightToLine, ArrowUpToLine } from 'lucide-react';
import { useState } from 'react';

export interface WorldEditorLocationMoveProps {
  /** Sibling locations (same parent as the selected location). */
  siblingLocations: Location[];
  /** Move the selected location to be a child of the given sibling. */
  onMoveAsChildOf: (siblingId: string) => void;
  /** Move the selected location to be a sibling of its parent (one level up). Omit when already at root. */
  onMoveAsSiblingOfParent?: () => void;
}

export function WorldEditorLocationMove({
  siblingLocations,
  onMoveAsChildOf,
  onMoveAsSiblingOfParent,
}: WorldEditorLocationMoveProps) {
  const [moveTargetSiblingId, setMoveTargetSiblingId] = useState<string>('');

  const hasSiblings = siblingLocations.length > 0;
  const hasMoveUp = onMoveAsSiblingOfParent != null;

  if (!hasSiblings && !hasMoveUp) return null;

  return (
    <div className='grid gap-3'>
      {hasSiblings && (
        <div className='grid gap-2'>
          <Label className='text-xs'>Move to</Label>
          <Select
            value={moveTargetSiblingId || '_none'}
            onValueChange={(v) => setMoveTargetSiblingId(v === '_none' ? '' : v)}>
            <SelectTrigger className='h-8'>
              <SelectValue placeholder='Choose a location' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='_none'>—</SelectItem>
              {siblingLocations.map((sib) => (
                <SelectItem key={sib.id} value={sib.id}>
                  {sib.label || 'Unnamed'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant='outline'
            size='sm'
            className='gap-1'
            disabled={!moveTargetSiblingId}
            onClick={() => {
              if (moveTargetSiblingId) {
                onMoveAsChildOf(moveTargetSiblingId);
                setMoveTargetSiblingId('');
              }
            }}>
            <ArrowRightToLine className='h-4 w-4' />
            Move to
          </Button>
        </div>
      )}
      {hasMoveUp && (
        <div className='grid gap-1'>
          <Button variant='outline' size='sm' className='gap-1' onClick={onMoveAsSiblingOfParent}>
            <ArrowUpToLine className='h-4 w-4' />
            Move up
          </Button>
        </div>
      )}
    </div>
  );
}
