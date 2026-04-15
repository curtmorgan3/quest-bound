import { Button } from '@/components/ui/button';
import type { DiceRoll } from '@/types';
import { Dice6, Trash } from 'lucide-react';

export function DiceRollRow({
  roll,
  onDelete,
  onRoll,
}: {
  roll: DiceRoll;
  onDelete: () => void;
  onRoll: (roll: string) => void;
}) {
  return (
    <li className='flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50'>
      <span className='min-w-0 flex-1 truncate text-sm'>
        {roll.label ? (
          <>
            <span className='font-medium'>{roll.label}</span>
            <span className='text-muted-foreground'> — {roll.value}</span>
          </>
        ) : (
          <span className='text-muted-foreground'>{roll.value}</span>
        )}
      </span>
      <Button
        variant='ghost'
        size='icon'
        className='size-8 shrink-0'
        onClick={() => onRoll(roll.value)}
        aria-label={`Roll ${roll.label || roll.value}`}>
        <Dice6 className='size-4' />
      </Button>
      <Button
        variant='ghost'
        size='icon'
        title='Delete'
        className='size-8 shrink-0'
        onClick={onDelete}
        aria-label={`Delete ${roll.label || roll.value}`}>
        <Trash className='size-4' />
      </Button>
    </li>
  );
}
