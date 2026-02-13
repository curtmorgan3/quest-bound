/**
 * CodeMirror 6 wrapper for QBScript editing
 */

import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { useEffect, useRef } from 'react';
import { qbscriptAutocomplete } from './qbscript-autocomplete';
import { qbscript } from './qbscript-language';

export interface CodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  height?: string;
  readOnly?: boolean;
  className?: string;
}

export function CodeMirrorEditor({
  value,
  onChange,
  onSave,
  height = '400px',
  readOnly = false,
  className,
}: CodeMirrorEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);
  const readOnlyRef = useRef(readOnly);

  onChangeRef.current = onChange;
  onSaveRef.current = onSave;
  readOnlyRef.current = readOnly;

  // Mount effect: run once so we don't destroy/recreate the view on parent re-renders.
  // Parent should use key={scriptId} when switching scripts so the editor remounts with the right value.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const extensions = [
      qbscript(),
      qbscriptAutocomplete,
      history(),
      keymap.of(defaultKeymap),
      keymap.of([...historyKeymap, indentWithTab]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString());
        }
      }),
      EditorView.lineWrapping,
      EditorState.readOnly.of(readOnlyRef.current),
      keymap.of([
        {
          key: 'Mod-s',
          run: () => {
            if (viewRef.current && onSaveRef.current) {
              onSaveRef.current();
              return true;
            }
            return false;
          },
        },
      ]),
    ];

    const state = EditorState.create({
      doc: value,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: container,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- intentional: only mount once to avoid losing focus on every keystroke

  // Sync value from parent into the view when it changes (e.g. script loaded from DB after mount).
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ minHeight: height, backgroundColor: '#282c34' }}
    />
  );
}
