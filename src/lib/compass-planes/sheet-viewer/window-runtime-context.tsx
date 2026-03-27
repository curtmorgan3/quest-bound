import { createContext, useContext, type ReactNode } from 'react';

export type WindowRuntimeContextValue = {
  /** Ruleset page editor: toggle a template child window from a component click. */
  openRulesetChildWindow?: (childWindowId: string) => void;
};

const WindowRuntimeContext = createContext<WindowRuntimeContextValue>({});

export function WindowRuntimeProvider({
  value,
  children,
}: {
  value: WindowRuntimeContextValue;
  children: ReactNode;
}) {
  return <WindowRuntimeContext.Provider value={value}>{children}</WindowRuntimeContext.Provider>;
}

export function useWindowRuntime(): WindowRuntimeContextValue {
  return useContext(WindowRuntimeContext);
}
