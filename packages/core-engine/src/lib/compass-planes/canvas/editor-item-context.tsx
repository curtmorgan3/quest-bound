import { createContext, useContext, type ReactNode } from 'react';

const EditorItemIdContext = createContext<string | null>(null);

export function EditorItemIdProvider({ id, children }: { id: string; children: ReactNode }) {
  return <EditorItemIdContext.Provider value={id}>{children}</EditorItemIdContext.Provider>;
}

/** Required for sheet edit nodes mounted on the native canvas (replaces `useNodeId`). */
export function useEditorItemId(): string {
  const id = useContext(EditorItemIdContext);
  if (id == null) {
    throw new Error('useEditorItemId must be used within EditorItemIdProvider');
  }
  return id;
}

export function useOptionalEditorItemId(): string | null {
  return useContext(EditorItemIdContext);
}
