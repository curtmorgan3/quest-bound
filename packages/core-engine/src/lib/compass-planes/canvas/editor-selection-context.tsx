import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react';
import { useStore } from 'zustand';

import {
  createEditorSelectionStore,
  type EditorSelectionStore,
  type EditorSelectionStoreApi,
} from './editor-selection-store';

const EditorSelectionStoreContext = createContext<EditorSelectionStoreApi | null>(null);

export function EditorSelectionStoreProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<EditorSelectionStoreApi | null>(null);
  if (storeRef.current == null) {
    storeRef.current = createEditorSelectionStore();
  }
  return (
    <EditorSelectionStoreContext.Provider value={storeRef.current}>
      {children}
    </EditorSelectionStoreContext.Provider>
  );
}

/** Subscribe to the provider-scoped editor selection store. */
export function useEditorSelectionStore<T>(selector: (state: EditorSelectionStore) => T): T {
  const store = useContext(EditorSelectionStoreContext);
  if (store == null) {
    throw new Error('useEditorSelectionStore must be used within EditorSelectionStoreProvider');
  }
  return useStore(store, selector);
}

/** Access the vanilla store instance (e.g. for marquee handlers outside React). */
export function useEditorSelectionStoreApi(): EditorSelectionStoreApi {
  const store = useContext(EditorSelectionStoreContext);
  if (store == null) {
    throw new Error('useEditorSelectionStoreApi must be used within EditorSelectionStoreProvider');
  }
  return store;
}

/** For tests or hosts that manage the store themselves. */
export function useEditorSelectionStoreFromApi<T>(
  store: EditorSelectionStoreApi,
  selector: (s: EditorSelectionStore) => T,
): T {
  return useStore(store, selector);
}

/** Optional provider: when absent, children can use a store passed explicitly instead. */
export function useOptionalEditorSelectionStoreApi(): EditorSelectionStoreApi | null {
  return useContext(EditorSelectionStoreContext);
}

export function useCreateDetachedEditorSelectionStore(): EditorSelectionStoreApi {
  return useMemo(() => createEditorSelectionStore(), []);
}
