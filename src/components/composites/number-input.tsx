import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export const NumberInput = ({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  className,
  disabled,
}: NumberInputProps) => {
  const [open, setOpen] = useState(false);

  const actualMin = min ?? 0;
  const actualMax = max ?? 100;
  const actualStep = step > 0 ? step : 1;

  const clampToRange = useCallback(
    (raw: number): number => {
      if (Number.isNaN(raw)) return actualMin;
      let next = Math.min(Math.max(raw, actualMin), actualMax);
      if (actualStep > 0) {
        const offset = next - actualMin;
        const steps = Math.round(offset / actualStep);
        next = actualMin + steps * actualStep;
        next = Math.min(Math.max(next, actualMin), actualMax);
      }
      return next;
    },
    [actualMin, actualMax, actualStep],
  );

  const numbers = useMemo(() => {
    const result: number[] = [];
    for (let n = actualMin; n <= actualMax; n += actualStep) {
      result.push(n);
    }
    return result;
  }, [actualMin, actualMax, actualStep]);

  const [wheelValue, setWheelValue] = useState(() => clampToRange(value));

  useEffect(() => {
    setWheelValue(clampToRange(value));
  }, [value, clampToRange]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const firstItemRef = useRef<HTMLDivElement | null>(null);
  const [itemHeight, setItemHeight] = useState<number | null>(null);
  const [containerHeight, setContainerHeight] = useState<number | null>(null);

  useEffect(() => {
    if (firstItemRef.current) {
      const rect = firstItemRef.current.getBoundingClientRect();
      if (rect.height) {
        setItemHeight(rect.height);
      }
    }
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.height) {
        setContainerHeight(rect.height);
      }
    }
  }, [numbers.length, open]);

  const scrollToValue = useCallback(
    (target: number) => {
      if (!containerRef.current || itemHeight == null || containerHeight == null) return;
      const index = numbers.indexOf(target);
      if (index === -1) return;
      const centerOffset = containerHeight / 2 - itemHeight / 2;
      const scrollTop = index * itemHeight - centerOffset;
      containerRef.current.scrollTo({ top: scrollTop, behavior: 'smooth' });
    },
    [containerHeight, itemHeight, numbers],
  );

  useEffect(() => {
    if (open) {
      scrollToValue(wheelValue);
    }
  }, [open, wheelValue, scrollToValue]);

  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (!numbers.length) return;

      const delta = event.deltaY;
      if (delta === 0) return;

      console.log(delta);

      // Move exactly one step per wheel event for finer control
      const direction = delta > 0 ? 1 : -1;

      const currentIndex = numbers.indexOf(wheelValue);
      const safeIndex = currentIndex === -1 ? 0 : currentIndex;
      const nextIndex = Math.min(Math.max(safeIndex + direction * 1, 0), numbers.length - 1);
      const next = numbers[nextIndex];
      setWheelValue(next);
      scrollToValue(next);
    },
    [numbers, wheelValue, scrollToValue],
  );

  const applyChange = (next: number) => {
    const clamped = clampToRange(next);
    onChange(clamped);
  };

  const handleSet = () => {
    applyChange(wheelValue);
    setOpen(false);
  };

  const handleAdd = () => {
    applyChange(value + wheelValue);
  };

  const handleSubtract = () => {
    applyChange(value - wheelValue);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    if (raw === '') {
      onChange(actualMin);
      return;
    }
    const parsed = Number(raw);
    if (!Number.isNaN(parsed)) {
      applyChange(parsed);
    }
  };

  const displayValue = Number.isFinite(value) ? value : '';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Input
          type='number'
          value={displayValue}
          onChange={handleInputChange}
          onFocus={() => !disabled && setOpen(true)}
          className={className}
          disabled={disabled}
        />
      </PopoverTrigger>
      <PopoverContent side='bottom' align='center' className='w-64 p-3'>
        {label && <div className='mb-2 text-xs font-medium text-muted-foreground'>{label}</div>}
        <div className='relative'>
          <div
            ref={containerRef}
            className='relative h-40 overflow-y-auto scroll-smooth snap-y snap-mandatory py-2'
            onWheel={handleWheel}>
            {numbers.map((n, index) => {
              const isActive = n === wheelValue;
              return (
                <div
                  key={n}
                  ref={index === 0 ? firstItemRef : undefined}
                  className={cn(
                    'flex h-8 items-center justify-center snap-center text-sm transition-all',
                    isActive
                      ? 'text-primary font-semibold scale-110'
                      : 'text-muted-foreground scale-95',
                  )}
                  onClick={() => {
                    setWheelValue(n);
                    scrollToValue(n);
                  }}>
                  {n}
                </div>
              );
            })}
          </div>
          <div className='pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-background to-transparent' />
          <div className='pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-background to-transparent' />
          <div className='pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 border-y border-primary/40' />
        </div>
        <div className='mt-3 flex items-center justify-between gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={handleSubtract}
            disabled={disabled}>
            Subtract
          </Button>
          <Button type='button' variant='outline' size='sm' onClick={handleAdd} disabled={disabled}>
            Add
          </Button>
          <Button type='button' size='sm' onClick={handleSet} disabled={disabled}>
            Set
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
