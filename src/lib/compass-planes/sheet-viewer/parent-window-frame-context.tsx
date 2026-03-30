import { createContext, useContext, type ReactNode } from 'react';

export type ParentWindowFrame = { x: number; y: number; width: number; height: number };

const ParentWindowFrameContext = createContext<ParentWindowFrame | null>(null);

export function ParentWindowFrameProvider({
  value,
  children,
}: {
  value: ParentWindowFrame;
  children: ReactNode;
}) {
  return (
    <ParentWindowFrameContext.Provider value={value}>
      {children}
    </ParentWindowFrameContext.Provider>
  );
}

export function useParentWindowFrame(): ParentWindowFrame | null {
  return useContext(ParentWindowFrameContext);
}
