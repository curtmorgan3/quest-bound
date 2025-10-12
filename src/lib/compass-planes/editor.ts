import type { Component } from '@/types';
import { debugLog } from '@/utils';
import '@pixi/layout';
import { Application, type ApplicationOptions } from 'pixi.js';
import { editorState, setEditorState } from './cache';
import { EditorStyles } from './constants';
import { drawBackground, drawComponentContainerMenu } from './editor-decorators';
import type { EditorConfiguration, EditorState } from './types';
import {
  addCameraHandlers,
  addDragHandlers,
  addEditorKeyListeners,
  addResizeHandlers,
  clearEditorListeners,
  drawComponents,
  handleCreateComponents,
} from './utils';

const { log } = debugLog('planes', 'editor');

interface InitializeEditorOptions {
  elementId: string;
  config?: EditorConfiguration;
  state: EditorState;
  onComponentsUpdated?: (updates: Array<Component>) => void;
  onComponentsCreated?: (updates: Array<Component>) => void;
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
  onComponentsCreated,
}: InitializeEditorOptions) {
  setEditorState(state, app?.stage);
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

  const handleUpdate = (updates: Array<Component>) => {
    onComponentsUpdated?.(updates);
  };

  const handleCreate = (components: Array<Component>) => {
    onComponentsCreated?.(components);
  };

  addDragHandlers(app, handleUpdate);
  addResizeHandlers(app, handleUpdate);
  addCameraHandlers(app);
  addEditorKeyListeners();

  const stageBackground = await drawBackground(app);
  handleCreateComponents({
    backgroundContainer: stageBackground,
    onCreated: handleCreate,
  });
  app.stage.addChild(stageBackground);

  const componentMenu = await drawComponentContainerMenu();
  app.stage.addChild(componentMenu);

  drawComponents(app.stage, editorState);

  parentElement.appendChild(app.canvas);
}

export function destroyEditor() {
  clearEditorListeners();
  if (app && app.renderer) {
    app.destroy();
    app = null;
  }
}
