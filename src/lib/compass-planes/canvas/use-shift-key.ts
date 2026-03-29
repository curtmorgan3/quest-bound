import { useEffect, useState } from 'react';

/** Tracks whether Shift is held (for aspect-ratio resize, etc.). */
export function useShiftKeyDown(): boolean {
  const [down, setDown] = useState(false);
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setDown(true);
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setDown(false);
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);
  return down;
}
