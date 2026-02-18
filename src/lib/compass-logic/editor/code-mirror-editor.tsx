/**
 * CodeMirror 6 wrapper for QBScript editing
 */

import { colorWhite } from '@/palette';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { indentUnit } from '@codemirror/language';
import { Compartment, EditorState } from '@codemirror/state';
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
  /** CSS color for the text cursor (caret). Defaults to white for the dark editor background. */
  caretColor?: string;
  /** Whether autocomplete is enabled. Defaults to true. */
  autocomplete?: boolean;
}

export function CodeMirrorEditor({
  value,
  onChange,
  onSave,
  height = '400px',
  readOnly = false,
  className,
  caretColor = colorWhite,
  autocomplete = true,
}: CodeMirrorEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const readOnlyCompartmentRef = useRef<Compartment | null>(null);
  const autocompleteCompartmentRef = useRef<Compartment | null>(null);
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);
  const readOnlyRef = useRef(readOnly);
  /** Tracks last value we synced from parent. Undefined = haven't synced yet (always run first sync so script load works). */
  const lastValueFromParentRef = useRef<string | undefined>(undefined);

  onChangeRef.current = onChange;
  onSaveRef.current = onSave;
  readOnlyRef.current = readOnly;

  // Mount effect: run once so we don't destroy/recreate the view on parent re-renders.
  // Parent should use key={scriptId} when switching scripts so the editor remounts with the right value.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const extensions = [
      // Fill container height and scroll content (instead of editor growing with content)
      EditorView.theme({
        '&': { height: '100%' },
        '.cm-scroller': { overflow: 'auto', minHeight: '100%' },
        '.cm-content': { caretColor },
      }),
      (readOnlyCompartmentRef.current = new Compartment()).of([
        EditorView.editable.of(!readOnlyRef.current),
        EditorState.readOnly.of(readOnlyRef.current),
      ]),
      indentUnit.of('    '), // Tab inserts 4 spaces
      qbscript(),
      (autocompleteCompartmentRef.current = new Compartment()).of(
        autocomplete ? [qbscriptAutocomplete] : [],
      ),
      history(),
      keymap.of(defaultKeymap),
      keymap.of([...historyKeymap, indentWithTab]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString());
        }
      }),
      EditorView.lineWrapping,
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

  // Sync value from parent into the view when the value *prop* actually changed (e.g. script loaded).
  // We always run at least once (ref undefined) so initial load works. Then we only sync when value
  // changes from what we last synced, so we don't overwrite with stale state after the user types.
  useEffect(() => {
    if (lastValueFromParentRef.current !== undefined && value === lastValueFromParentRef.current)
      return;
    lastValueFromParentRef.current = value;
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    const next = typeof value === 'string' ? value : '';
    if (current !== next) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: next },
      });
    }
  }, [value]);

  // Update read-only/editable when the prop changes (e.g. test character loads after mount).
  useEffect(() => {
    const view = viewRef.current;
    const compartment = readOnlyCompartmentRef.current;
    if (!view || !compartment) return;
    view.dispatch({
      effects: compartment.reconfigure([
        EditorView.editable.of(!readOnly),
        EditorState.readOnly.of(readOnly),
      ]),
    });
  }, [readOnly]);

  // Update autocomplete when the prop changes.
  useEffect(() => {
    const view = viewRef.current;
    const compartment = autocompleteCompartmentRef.current;
    if (!view || !compartment) return;
    view.dispatch({
      effects: compartment.reconfigure(autocomplete ? [qbscriptAutocomplete] : []),
    });
  }, [autocomplete]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        height: '355px',
        minHeight: height,
        backgroundColor: '#282c34',
      }}
    />
  );
}
