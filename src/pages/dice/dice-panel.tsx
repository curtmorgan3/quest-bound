import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useDiceRolls } from '@/lib/compass-api';
import type { DiceRoll } from '@/types';
import { Dice6, Trash } from 'lucide-react';
import { useState } from 'react';

type DicePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const DicePanel = ({ open, onOpenChange }: DicePanelProps) => {
  const { diceRolls, createDiceRoll, deleteDiceRoll } = useDiceRolls();
  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');

  const handleRoll = (roll: string) => {
    // TODO: Implement roll logic
    console.log('Rolling ', roll);
  };

  const handleSaveAndRoll = async () => {
    await createDiceRoll({ label, value });
    handleRoll(value);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side='right' className='flex flex-col p-[8px]'>
        <SheetHeader>
          <SheetTitle>Dice Roller</SheetTitle>
        </SheetHeader>

        <div className='flex flex-1 flex-col gap-4 overflow-hidden py-4'>
          <div className='flex flex-col gap-2'>
            <Label htmlFor='label'>Label</Label>
            <Input
              id='label'
              placeholder='Attack roll, Damage, etc.'
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          <div className='flex flex-col gap-2'>
            <Label htmlFor='value'>Roll Value</Label>
            <Input
              id='value'
              placeholder='2d6+3'
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>

          <Button variant='outline' onClick={() => handleRoll(value)}>
            Roll
          </Button>
          <Button disabled={!label} onClick={handleSaveAndRoll}>
            Save and Roll
          </Button>
          <div className='flex min-h-0 flex-1 flex-col gap-2'>
            <Label>Saved rolls</Label>
            <ScrollArea className='flex-1 rounded-md border'>
              <ul className='flex flex-col p-2'>
                {diceRolls.length === 0 ? (
                  <li className='py-4 text-center text-muted-foreground text-sm'>
                    No saved rolls yet.
                  </li>
                ) : (
                  diceRolls.map((roll: DiceRoll) => (
                    <DiceRollRow
                      key={roll.id}
                      roll={roll}
                      onRoll={handleRoll}
                      onDelete={() => deleteDiceRoll(roll.id)}
                    />
                  ))
                )}
              </ul>
            </ScrollArea>
          </div>
        </div>

        <SheetFooter></SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

function DiceRollRow({
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
