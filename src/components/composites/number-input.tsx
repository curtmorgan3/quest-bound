import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { diceRollLogger } from '@/lib/dice-roll-logger';
import { cn } from '@/lib/utils';
import { Minus, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

export interface NumberInputProps {
  value: number | '';
  onChange: (value: number | '') => void;
  wheelMin?: number;
  wheelMax?: number;
  step?: number;
  label?: string;
  className?: string;
  disabled?: boolean;
  style?: CSSProperties;
  inputMin?: number;
  inputMax?: number;
  placeholder?: string;
  onBlur?: () => void;
}

export const NumberInput = ({
  value,
  onChange,
  wheelMin,
  wheelMax,
  inputMin,
  inputMax,
  step = 1,
  label,
  className,
  disabled,
  style,
  placeholder,
  onBlur,
}: NumberInputProps) => {
  const [open, setOpen] = useState(false);
  const [lastRollTotal, setLastRollTotal] = useState<number | null>(null);

  const actualMin = wheelMin ?? 0;
  const actualMax = wheelMax ?? 100;
  const actualStep = step > 0 ? step : 1;
  const actualValue = value === '' ? 0 : value;

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

  const [wheelValue, setWheelValue] = useState(() => clampToRange(actualValue));

  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<HTMLDivElement[]>([]);
  const wheelThrottleRef = useRef(false);

  const scrollToValue = useCallback(
    (target: number) => {
      const container = containerRef.current;
      if (!container) return;

      const index = numbers.indexOf(target);
      if (index === -1) return;

      const item = itemRefs.current[index];
      if (!item) return;

      const itemOffsetTop = item.offsetTop;
      const itemHeight = item.offsetHeight;
      const containerHeight = container.clientHeight;

      const targetScrollTop = itemOffsetTop - (containerHeight / 2 - itemHeight / 2);
      container.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
    },
    [numbers],
  );

  useEffect(() => {
    if (open) {
      scrollToValue(wheelValue);
    }
  }, [open, wheelValue, scrollToValue]);

  useEffect(() => {
    const fetchLastRoll = async () => {
      const logs = await diceRollLogger.getRollLogs(1);
      if (logs.length > 0) {
        setLastRollTotal(logs[0].total);
      }
    };
    fetchLastRoll();
  }, [open]);

  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (!numbers.length) return;

      // Simple throttle so we don't queue a ton of updates
      if (wheelThrottleRef.current) {
        return;
      }
      wheelThrottleRef.current = true;
      window.setTimeout(() => {
        wheelThrottleRef.current = false;
      }, 120);

      const delta = event.deltaY;
      if (delta === 0) return;

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
    onChange(next);
  };

  const handleSet = () => {
    applyChange(wheelValue);
    setOpen(false);
  };

  const handleAdd = () => {
    applyChange(actualValue + wheelValue);
  };

  const handleSubtract = () => {
    applyChange(actualValue - wheelValue);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    if (raw === '') {
      onChange('');
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
        <input
          type='number'
          value={displayValue}
          style={style}
          onChange={handleInputChange}
          onClick={() => !disabled && setOpen(true)}
          className={`${className} editor-input`}
          disabled={disabled}
          min={inputMin}
          max={inputMax}
          placeholder={placeholder}
          onBlur={onBlur}
        />
      </PopoverTrigger>
      <PopoverContent side='bottom' align='center' className='w-64 p-3'>
        {label && <div className='mb-2 text-xs font-medium text-muted-foreground'>{label}</div>}
        <div className='flex items-center justify-between gap-1 mb-2 pl-4 pr-4'>
          {[1, 3, 5, lastRollTotal ?? 10].map((preset, i) => (
            <Button
              key={i}
              type='button'
              variant='outline'
              size='sm'
              onClick={() => {
                const clamped = clampToRange(preset);
                setWheelValue(clamped);
                scrollToValue(clamped);
              }}
              disabled={disabled}
              className='h-6 px-2 text-xs'>
              {preset}
            </Button>
          ))}
          {lastRollTotal && <span className='text-xs max-w-[20px]'>Last Roll</span>}
        </div>
        <div className='relative overflow-x-hidden'>
          <div
            ref={containerRef}
            className='relative h-40 overflow-y-auto overflow-x-hidden number-wheel-input scroll-smooth snap-y snap-mandatory py-2'
            onWheel={handleWheel}>
            {numbers.map((n, index) => {
              const isActive = n === wheelValue;
              return (
                <div
                  key={n}
                  ref={(el) => {
                    if (el) itemRefs.current[index] = el;
                  }}
                  className={cn(
                    'flex h-8 items-center justify-center snap-center text-lg transition-all',
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
            size='icon'
            onClick={handleSubtract}
            disabled={disabled}
            aria-label='Subtract'>
            <Minus className='size-4' aria-hidden='true' />
          </Button>
          <Button type='button' size='sm' onClick={handleSet} disabled={disabled}>
            Set
          </Button>
          <Button
            type='button'
            variant='outline'
            size='icon'
            onClick={handleAdd}
            disabled={disabled}
            aria-label='Add'>
            <Plus className='size-4' aria-hidden='true' />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
