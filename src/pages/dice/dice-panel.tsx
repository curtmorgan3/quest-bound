import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useDiceRolls } from '@/lib/compass-api';
import { useState } from 'react';

type DicePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const DicePanel = ({ open, onOpenChange }: DicePanelProps) => {
  const { createDiceRoll } = useDiceRolls();
  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');

  const handleRoll = () => {
    // TODO: Implement roll logic
  };

  const handleSaveAndRoll = async () => {
    await createDiceRoll({ label, value });
    handleRoll();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side='right' className='flex flex-col p-[8px]'>
        <SheetHeader>
          <SheetTitle>Dice Roller</SheetTitle>
          <SheetDescription>Enter a dice notation to roll.</SheetDescription>
        </SheetHeader>

        <div className='flex flex-col gap-4 py-4'>
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
        </div>

        <SheetFooter>
          <Button variant='outline' onClick={handleRoll}>
            Roll
          </Button>
          <Button onClick={handleSaveAndRoll}>Save and Roll</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
