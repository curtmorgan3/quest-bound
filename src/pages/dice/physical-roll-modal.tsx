import { NumberInput } from '@/components';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { DiceContext } from '@/stores';
import { buildDiceResultFromPhysicalRolls, getPhysicalRollSlots } from '@/utils/dice-utils';
import { useContext, useEffect, useState } from 'react';

export const PhysicalRollModal = () => {
  const { physicalRollModal, submitPhysicalRollResult, dismissPhysicalRollModal } =
    useContext(DiceContext);
  const notation = physicalRollModal?.notation ?? '';
  const { slots } = getPhysicalRollSlots(notation);
  const [values, setValues] = useState<string[]>([]);

  useEffect(() => {
    if (notation) {
      const { slots: s } = getPhysicalRollSlots(notation);
      setValues(s.map(() => ''));
    }
  }, [notation]);

  const open = Boolean(physicalRollModal);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      dismissPhysicalRollModal();
    }
  };

  const setSlotValue = (index: number, value: string) => {
    setValues((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleAccept = async () => {
    const numericValues = values.map((v) => {
      const n = parseInt(v.trim(), 10);
      return Number.isNaN(n) ? 0 : n;
    });
    const result = buildDiceResultFromPhysicalRolls(notation, numericValues);
    await submitPhysicalRollResult(result);
    setValues(slots.map(() => ''));
  };

  const canAccept = slots.length === 0 || values.every((v) => v.trim() !== '');

  if (!physicalRollModal) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        aria-description='Enter results from physically rolled dice'
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={() => handleOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>Physical roll: {notation}</DialogTitle>
          <DialogDescription>Enter the value of each die you rolled.</DialogDescription>
        </DialogHeader>
        <div className='flex gap-3 py-2 flex-wrap'>
          {slots.map((slot, index) => (
            <div key={index} className='flex flex-col gap-1.5'>
              <Label htmlFor={`physical-roll-${index}`}>{slot.label}</Label>
              <NumberInput
                className='w-[64px] h-[64px]'
                wheelMin={1}
                wheelMax={parseInt(slot.label.slice(1), 10) || 20}
                placeholder={`1–${slot.label.slice(1)}`}
                value={parseInt(values[index] ?? '')}
                onChange={(value) => setSlotValue(index, `${value}`)}
                data-testid={`physical-roll-input-${index}`}
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button data-testid='physical-roll-accept' disabled={!canAccept} onClick={handleAccept}>
            Accept
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
