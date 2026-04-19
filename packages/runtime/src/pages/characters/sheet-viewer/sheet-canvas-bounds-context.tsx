import { createContext, useContext, type ReactNode } from 'react';

export type SheetCanvasBounds = { width: number; height: number };

const SheetCanvasBoundsContext = createContext<SheetCanvasBounds | null>(null);

export function SheetCanvasBoundsProvider({
  value,
  children,
}: {
  value: SheetCanvasBounds | null;
  children: ReactNode;
}) {
  return (
    <SheetCanvasBoundsContext.Provider value={value}>{children}</SheetCanvasBoundsContext.Provider>
  );
}

export function useSheetCanvasBounds(): SheetCanvasBounds | null {
  return useContext(SheetCanvasBoundsContext);
}
