import { debugLog } from '@/utils';
import { Application, type ApplicationOptions } from 'pixi.js';
import { editorState, setEditorState } from './cache';
import { drawBackground } from './editor-decorators';
import { EditorStyles } from './styles';
import type { EditorComponent, EditorConfiguration, EditorState } from './types';
import { addCameraHandlers, addDragHandlers, addResizeHandlers, drawComponents } from './utils';

const { log } = debugLog('planes', 'editor');

interface InitializeEditorOptions {
  elementId: string;
  config?: EditorConfiguration;
  state: EditorState;
  onComponentsUpdated?: (updates: Array<EditorComponent>) => void;
}

let app: Application | null = null;

/**
 * Creates an editor instance when component state changes.
 * Should only created a new instance when components are added or removed.
 */
export async function initializeEditor({
  elementId,
  config,
  state,
  onComponentsUpdated,
}: InitializeEditorOptions) {
  setEditorState(state);
  log('new comp state');

  if (app) return;
  log('initialize editor');

  const parentElement = document.getElementById(elementId);
  if (!parentElement) {
    throw new Error(`Element with id ${elementId} not found`);
  }

  app = new Application();

  const configuration: Partial<ApplicationOptions> = {
    ...EditorStyles,
    ...config,
  };

  await app.init({ ...configuration, resizeTo: parentElement, eventMode: 'static' });

  const handleUpdate = (updates: Array<EditorComponent>) => {
    onComponentsUpdated?.(updates);
  };

  addDragHandlers(app, handleUpdate);
  addResizeHandlers(app, handleUpdate);
  addCameraHandlers(app);

  const stageBackground = drawBackground(app);
  app.stage.addChild(stageBackground);

  drawComponents(app.stage, editorState);

  parentElement.appendChild(app.canvas);
}

export function destroyEditor() {
  if (app) {
    app = null;
  }
}
