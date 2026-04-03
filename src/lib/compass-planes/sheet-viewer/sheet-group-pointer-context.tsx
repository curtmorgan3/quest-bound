import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type SheetGroupPointerContextValue = {
  hoverAffinity: ReadonlySet<string> | null;
  pressAffinity: ReadonlySet<string> | null;
  onDecoratedPointerEnter: (affinity: Set<string>) => void;
  onDecoratedPointerLeave: (affinity: Set<string>, relatedTarget: EventTarget | null) => void;
  onDecoratedPointerDown: (affinity: Set<string>) => void;
};

const SheetGroupPointerContext = createContext<SheetGroupPointerContextValue | null>(null);

/** True if `relatedTarget` is inside another component whose id is in `affinity`. */
export function pointerRelatedStillInAffinity(
  relatedTarget: EventTarget | null,
  affinity: ReadonlySet<string>,
): boolean {
  let el = relatedTarget as Node | null;
  while (el && el instanceof Element) {
    const cid = el.getAttribute('data-node-state-id');
    if (cid && affinity.has(cid)) return true;
    el = el.parentElement;
  }
  return false;
}

export function SheetGroupPointerProvider({ children }: { children: ReactNode }) {
  const [hoverAffinity, setHoverAffinity] = useState<Set<string> | null>(null);
  const [pressAffinity, setPressAffinity] = useState<Set<string> | null>(null);

  useEffect(() => {
    const endPress = () => setPressAffinity(null);
    window.addEventListener('pointerup', endPress);
    window.addEventListener('pointercancel', endPress);
    return () => {
      window.removeEventListener('pointerup', endPress);
      window.removeEventListener('pointercancel', endPress);
    };
  }, []);

  const onDecoratedPointerEnter = useCallback((aff: Set<string>) => {
    setHoverAffinity(new Set(aff));
  }, []);

  const onDecoratedPointerLeave = useCallback((aff: Set<string>, relatedTarget: EventTarget | null) => {
    if (pointerRelatedStillInAffinity(relatedTarget, aff)) return;
    setHoverAffinity(null);
  }, []);

  const onDecoratedPointerDown = useCallback((aff: Set<string>) => {
    setPressAffinity(new Set(aff));
  }, []);

  const value = useMemo<SheetGroupPointerContextValue>(
    () => ({
      hoverAffinity,
      pressAffinity,
      onDecoratedPointerEnter,
      onDecoratedPointerLeave,
      onDecoratedPointerDown,
    }),
    [
      hoverAffinity,
      pressAffinity,
      onDecoratedPointerEnter,
      onDecoratedPointerLeave,
      onDecoratedPointerDown,
    ],
  );

  return (
    <SheetGroupPointerContext.Provider value={value}>{children}</SheetGroupPointerContext.Provider>
  );
}

export function useSheetGroupPointer(): SheetGroupPointerContextValue | null {
  return useContext(SheetGroupPointerContext);
}
