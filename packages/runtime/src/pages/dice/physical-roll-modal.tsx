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
import { DiceContext } from '@quest-bound/runtime/context';
import { PopoverScrollContainerContext } from '@/stores/context/popover-scroll-container-context';
import {
  buildDiceResultFromPhysicalRolls,
  getPhysicalRollSlots,
  rollDie,
} from '@/utils/dice-utils';
import { Undo2 } from 'lucide-react';
import { useContext, useEffect, useRef, useState } from 'react';

export const PhysicalRollModal = () => {
  const { physicalRollModal, submitPhysicalRollResult, dismissPhysicalRollModal } =
    useContext(DiceContext);
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const notation = physicalRollModal?.notation ?? '';
  const { slots } = getPhysicalRollSlots(notation);
  const [values, setValues] = useState<string[]>([]);
  /** Per-slot previous value before the user clicked Roll (for revert). */
  const [previousValues, setPreviousValues] = useState<(string | null)[]>([]);

  useEffect(() => {
    if (notation) {
      const { slots: s } = getPhysicalRollSlots(notation);
      const initial = physicalRollModal?.initialValues;
      setValues(
        initial && initial.length === s.length ? initial.map((n) => `${n}`) : s.map(() => ''),
      );
      setPreviousValues(s.map(() => null));
    }
  }, [notation, physicalRollModal?.initialValues]);

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

  const handleRollSlot = (index: number) => {
    const slot = slots[index];
    if (!slot) return;
    const current = values[index]?.trim() ?? '';
    setPreviousValues((prev) => {
      const next = [...prev];
      next[index] = current !== '' ? current : null;
      return next;
    });
    const sides = parseInt(slot.label.slice(1), 10) || 20;
    const rolled = rollDie(sides);
    setSlotValue(index, `${rolled}`);
  };

  const handleRevertSlot = (index: number) => {
    const prev = previousValues[index];
    if (prev != null) {
      setSlotValue(index, prev);
      setPreviousValues((p) => {
        const next = [...p];
        next[index] = null;
        return next;
      });
    }
  };

  const handleRollRemainder = () => {
    setValues((prev) => {
      const next = [...prev];
      slots.forEach((slot, index) => {
        const current = next[index] ?? '';
        if (current.trim() === '') {
          const sides = parseInt(slot.label.slice(1), 10) || 20;
          next[index] = `${rollDie(sides)}`;
        }
      });
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
        onEscapeKeyDown={() => handleOpenChange(false)}
        className='z-[1001]'
        overlayClassName='z-[1001]'>
        <div ref={dialogContentRef} className='contents'>
          <PopoverScrollContainerContext.Provider value={dialogContentRef}>
            <DialogHeader>
              <DialogTitle>
                {physicalRollModal.rerollMessage ? 'Re-Roll' : `Physical roll: ${notation}`}
              </DialogTitle>
              <DialogDescription>
                {physicalRollModal.rerollMessage ? '' : 'Enter the value of each die you rolled.'}
              </DialogDescription>
              {physicalRollModal.rerollMessage ? (
                <p
                  className='text-sm text-muted-foreground mt-1'
                  data-testid='physical-roll-reroll-message'>
                  {physicalRollModal.rerollMessage}
                </p>
              ) : null}
            </DialogHeader>
            <div className='flex gap-3 py-2 flex-wrap'>
              {slots.map((slot, index) => (
                <div key={index} className='flex flex-col gap-1.5 items-center'>
                  <Label htmlFor={`physical-roll-${index}`}>{slot.label}</Label>
                  <NumberInput
                    className='w-[64px] h-[64px] border'
                    wheelMin={1}
                    wheelMax={parseInt(slot.label.slice(1), 10) || 20}
                    value={parseInt(values[index] ?? '')}
                    onChange={(value) => setSlotValue(index, `${value}`)}
                    data-testid={`physical-roll-input-${index}`}
                  />
                  <div className='flex items-center gap-1'>
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      className='h-7 text-xs'
                      onClick={() => handleRollSlot(index)}
                      data-testid={`physical-roll-roll-${index}`}>
                      Roll
                    </Button>
                    {values[index]?.trim() !== '' && previousValues[index] != null ? (
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        className='h-7 w-7 shrink-0'
                        onClick={() => handleRevertSlot(index)}
                        aria-label='Revert to previous value'
                        data-testid={`physical-roll-revert-${index}`}>
                        <Undo2 className='h-4 w-4' />
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button
                variant='outline'
                onClick={handleRollRemainder}
                data-testid='physical-roll-remainder'>
                Roll Remainder
              </Button>
              <Button
                data-testid='physical-roll-accept'
                disabled={!canAccept}
                onClick={handleAccept}>
                Accept
              </Button>
            </DialogFooter>
          </PopoverScrollContainerContext.Provider>
        </div>
      </DialogContent>
    </Dialog>
  );
};
