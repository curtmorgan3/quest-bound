import { Stack } from '@chakra-ui/react';
import { focusOnEditor } from 'contenido';
import { EditorState } from 'draft-js';
import React, { useRef } from 'react';
import { LoadingJournalPage } from '../components/loading-journal-page';
import { JournalProvider } from '../providers';
import { Editor } from './editor';
import { JournalTool } from './toolbar';

interface Props {
  content: EditorState;
  onChange: (state: EditorState) => void;
  readOnly?: boolean;
  loading?: boolean;
  style?: React.CSSProperties;
  className?: string;
  disallowedTools?: JournalTool[];
  toolbarId?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const Journal = ({
  content,
  onChange,
  style,
  readOnly = false,
  loading,
  className,
  onFocus,
  onBlur,
}: Props) => {
  const handleChange = (state: EditorState) => {
    onChange(state);
  };

  const editorRef = useRef(null) as React.RefObject<any>

  return (
    <JournalProvider value={{ readOnly }}>
      <Stack
        style={{ height: '100%', width: '100%', ...style }}
        className={className ?? `editor-shell ${readOnly ? '' : 'block-plane-events'}`} // Blocks click events in PlaneEditor
        width='100%'
        height='100%'
        padding={1}
        onClick={() => focusOnEditor(editorRef)}
        onWheelCapture={(e) => {
          if (!readOnly) {
            e.stopPropagation();
          }
        }}
        onWheel={(e) => {
          if (!readOnly) {
            e.stopPropagation();
          }
        }}>
        {loading ? (
          <LoadingJournalPage />
        ) : (
          <Editor
            editorRef={editorRef}
            state={content}
            onChange={handleChange}
            readOnly={readOnly}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        )}
      </Stack>
    </JournalProvider>
  );
};
