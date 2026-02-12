import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useDiceRolls } from '@/lib/compass-api';
import { DiceContext } from '@/stores';
import type { DiceRoll } from '@/types';
import { formatSegmentResult } from '@/utils';
import { Dice6, Trash } from 'lucide-react';
import { useContext, useEffect, useState } from 'react';
import { DddiceAuthModal, DiceThemes } from './dddice';
import { RoomSelect } from './dddice/room-select';

export const DicePanel = () => {
  const { rollDice, isRolling, lastResult, reset, dicePanelOpen, setDicePanelOpen, username } =
    useContext(DiceContext);

  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');

  const { diceRolls, createDiceRoll, deleteDiceRoll } = useDiceRolls();

  useEffect(() => {
    if (value || !lastResult?.notation) return;

    setValue(lastResult.notation);
  }, [lastResult, value]);

  useEffect(() => {
    if (!dicePanelOpen) {
      setValue('');
      reset();
    }
  }, [dicePanelOpen]);

  const handleRoll = (rollValue: string) => {
    rollDice(rollValue, { autoShowResult: !username, delay: 2000 });
  };

  const handleSaveAndRoll = async () => {
    await createDiceRoll({ label, value });
    handleRoll(value);
  };

  return (
    <>
      <Sheet open={dicePanelOpen} onOpenChange={setDicePanelOpen}>
        <SheetContent aria-description='Dice Panel' side='right' className='flex flex-col p-[8px]'>
          <SheetHeader style={{ paddingBottom: 0 }}>
            <SheetTitle>
              <DddiceAuthModal />
            </SheetTitle>
            <SheetDescription style={{ opacity: 0, height: 0 }}>Dice Panel</SheetDescription>
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

            <div className='w-full flex flex-col gap-2 items-center'>
              {isRolling && (
                <div className='flex justify-center items-center' style={{ height: '85px' }}>
                  <h2>Rolling...</h2>
                </div>
              )}
              {lastResult && <h2 className='text-xl'>{lastResult.total}</h2>}
              {lastResult && (
                <div className='rounded-md border bg-muted/30 p-3 text-sm'>
                  <ul className='mt-1 list-inside list-disc text-muted-foreground'>
                    {lastResult.segments.map((s, i) => (
                      <li key={i}>{formatSegmentResult(s)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className='flex gap-8'>
              <Button
                variant='outline'
                onClick={() => handleRoll(value)}
                disabled={isRolling || !value.trim()}>
                {isRolling ? 'Rolling…' : 'Roll'}
              </Button>
              <Button disabled={!label.trim() || isRolling} onClick={handleSaveAndRoll}>
                Save and Roll
              </Button>
            </div>

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

          <SheetFooter>
            {username && (
              <div className='flex flex-col gap-4 w-full'>
                <DiceThemes />
                <RoomSelect />
              </div>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
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
