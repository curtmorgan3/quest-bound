/**
 * CodeMirror 6 wrapper for QBScript editing
 */

import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { useCallback, useEffect, useRef } from 'react';
import { qbscript } from './qbscript-language';
import { qbscriptAutocomplete } from './qbscript-autocomplete';

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
  const initialValueRef = useRef(value);

  onChangeRef.current = onChange;
  onSaveRef.current = onSave;
  initialValueRef.current = value;

  const handleSave = useCallback(() => {
    if (viewRef.current && onSaveRef.current) {
      onSaveRef.current();
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const extensions = [
      qbscript(),
      qbscriptAutocomplete,
      history(),
      keymap.of(defaultKeymap),
      keymap.of(historyKeymap),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString());
        }
      }),
      EditorView.lineWrapping,
      EditorState.readOnly.of(readOnly),
    ];

    if (onSave) {
      extensions.push(
        keymap.of([
          {
            key: 'Mod-s',
            run: () => {
              handleSave();
              return true;
            },
          },
        ]),
      );
    }

    const state = EditorState.create({
      doc: initialValueRef.current,
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
  }, [readOnly, onSave, handleSave]);

  // When value prop changes externally (e.g. switching script), update the doc
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (value !== current) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ minHeight: height }}
    />
  );
}
