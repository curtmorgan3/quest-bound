import { Button } from '@/components/ui/button';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { diceRollLogger, PopoverScrollContainerContext } from '@/stores';
import { Minus, Plus } from 'lucide-react';
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';

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
  onOpenChange?: (open: boolean) => void;
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
  onOpenChange,
}: NumberInputProps) => {
  const [open, setOpen] = useState(false);
  const [lastRollTotal, setLastRollTotal] = useState<number | null>(null);

  const actualMin = Number(wheelMin ?? 0);
  const actualMax = Number(wheelMax ?? 100);
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
  const scrollDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollContainerRef = useContext(PopoverScrollContainerContext);

  const LONG_PRESS_MS = 500;

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const openWheelFromLongPress = useCallback(() => {
    setWheelValue(clampToRange(actualValue));
    setOpen(true);
    onOpenChange?.(true);
  }, [clampToRange, actualValue, onOpenChange]);

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

  useEffect(() => {
    if (!open || disabled) return;

    const digitBufferRef = { current: '' };
    let bufferClearTimerId: ReturnType<typeof setTimeout> | null = null;
    const BUFFER_CLEAR_MS = 1000;

    const maxDigitLen = Math.max(
      1,
      String(Math.floor(Math.max(Math.abs(actualMin), Math.abs(actualMax)))).length,
    );

    const scheduleBufferClear = () => {
      if (bufferClearTimerId !== null) {
        clearTimeout(bufferClearTimerId);
      }
      bufferClearTimerId = setTimeout(() => {
        bufferClearTimerId = null;
        digitBufferRef.current = '';
      }, BUFFER_CLEAR_MS);
    };

    const keyDigit = (e: KeyboardEvent): string | null => {
      if (e.key.length === 1 && e.key >= '0' && e.key <= '9') return e.key;
      const m = /^Numpad([0-9])$/.exec(e.code);
      return m ? m[1]! : null;
    };

    const applyParsedToWheel = (raw: number) => {
      const clamped = clampToRange(raw);
      setWheelValue(clamped);
      scrollToValue(clamped);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const digit = keyDigit(e);
      if (digit !== null) {
        e.preventDefault();
        e.stopPropagation();
        digitBufferRef.current = (digitBufferRef.current + digit).slice(-maxDigitLen);
        const parsed = parseInt(digitBufferRef.current, 10);
        if (!Number.isNaN(parsed)) {
          applyParsedToWheel(parsed);
        }
        scheduleBufferClear();
        return;
      }

      if (e.key === 'Backspace') {
        e.preventDefault();
        e.stopPropagation();
        digitBufferRef.current = digitBufferRef.current.slice(0, -1);
        scheduleBufferClear();
        if (digitBufferRef.current === '') {
          return;
        }
        const parsed = parseInt(digitBufferRef.current, 10);
        if (!Number.isNaN(parsed)) {
          applyParsedToWheel(parsed);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      if (bufferClearTimerId !== null) {
        clearTimeout(bufferClearTimerId);
      }
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open, disabled, actualMin, actualMax, clampToRange, scrollToValue]);

  useEffect(() => {
    return () => {
      if (scrollDebounceRef.current) {
        clearTimeout(scrollDebounceRef.current);
      }
      clearLongPressTimer();
    };
  }, [clearLongPressTimer]);

  const handleScroll = useCallback(() => {
    if (!numbers.length) return;

    // Clear existing debounce timer
    if (scrollDebounceRef.current) {
      clearTimeout(scrollDebounceRef.current);
    }

    // Set new debounce timer
    scrollDebounceRef.current = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;

      const containerHeight = container.clientHeight;
      const containerScrollTop = container.scrollTop;
      const containerCenter = containerScrollTop + containerHeight / 2;

      // Find the number closest to the center
      let closestIndex = 0;
      let closestDistance = Infinity;

      itemRefs.current.forEach((item, index) => {
        if (!item) return;

        const itemOffsetTop = item.offsetTop;
        const itemHeight = item.offsetHeight;
        const itemCenter = itemOffsetTop + itemHeight / 2;
        const distance = Math.abs(itemCenter - containerCenter);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      const centerNumber = numbers[closestIndex];
      setWheelValue(centerNumber);
    }, 200);
  }, [numbers]);

  const applyChange = (next: number) => {
    onChange(next);
  };

  const handleSet = () => {
    applyChange(wheelValue);
    setOpen(false);
    onOpenChange?.(false);
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

  const handlePointerDown = (event: React.PointerEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      openWheelFromLongPress();
    }, LONG_PRESS_MS);
  };

  const handlePointerEnd = () => {
    clearLongPressTimer();
  };

  return (
    <Popover
      open={open}
      onOpenChange={(open) => {
        setOpen(open);
        onOpenChange?.(open);
      }}>
      <PopoverAnchor asChild>
        <input
          type='number'
          value={displayValue}
          style={style}
          onChange={handleInputChange}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onPointerLeave={handlePointerEnd}
          className={`${className} editor-input`}
          disabled={disabled}
          min={inputMin}
          max={inputMax}
          placeholder={placeholder}
          onBlur={onBlur}
        />
      </PopoverAnchor>
      <PopoverContent
        container={scrollContainerRef?.current ?? undefined}
        side='bottom'
        align='center'
        className='w-64 p-3'
        style={{ zIndex: 9999 }}>
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
            style={{ touchAction: 'pan-y' }}
            onScroll={handleScroll}>
            <div
              key={'start-one'}
              className='flex h-8 items-center justify-center snap-center text-lg transition-all text-muted-foreground scale-95'
            />
            <div
              key={'start-two'}
              className='flex h-8 items-center justify-center snap-center text-lg transition-all text-muted-foreground scale-95'
            />
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
            <div
              key={'end-one'}
              className='flex h-8 items-center justify-center snap-center text-lg transition-all text-muted-foreground scale-95'
            />
            <div
              key={'end-two'}
              className='flex h-8 items-center justify-center snap-center text-lg transition-all text-muted-foreground scale-95'
            />
          </div>
          <div className='pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-background to-transparent' />
          <div className='pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-background to-transparent' />
          <div className='pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 border-y border-primary/40' />
        </div>
        <div className='mt-3 flex items-center justify-between gap-2'>
          <Button
            type='button'
            className='number-input-subtract'
            variant='outline'
            size='icon'
            onClick={handleSubtract}
            disabled={disabled}
            aria-label='Subtract'>
            <Minus className='size-4' aria-hidden='true' />
          </Button>
          <Button
            type='button'
            size='sm'
            onClick={handleSet}
            disabled={disabled}
            className='number-input-set'>
            Set
          </Button>
          <Button
            className='number-input-add'
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
