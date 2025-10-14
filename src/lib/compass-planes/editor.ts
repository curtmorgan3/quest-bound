import type { Component } from '@/types';
import { debugLog } from '@/utils';
import '@pixi/layout';
import { Application, type ApplicationOptions } from 'pixi.js';
import { addToUndoBuffer, editorState, selectComponents, setEditorState } from './cache';
import { EditorStyles } from './constants';
import { drawBackground, drawComponentContainerMenu } from './editor-decorators';
import type { EditorConfiguration, EditorState } from './types';
import {
  addCameraHandlers,
  addDragHandlers,
  addEditorKeyListeners,
  addEditorMouseListeners,
  addResizeHandlers,
  clearEditorKeyListeners,
  clearEditorMouseListeners,
  handleCreateComponents,
} from './utils';
import { handleComponentCrud } from './utils/handle-component-crud';

const { log } = debugLog('planes', 'editor');

interface InitializeEditorOptions {
  elementId: string;
  config?: EditorConfiguration;
  state: EditorState;
  onComponentsUpdated?: (updates: Array<Component>) => void;
  onComponentsCreated?: (updates: Array<Component>) => void;
  onComponentsDeleted?: (ids: Array<string>) => void;
}

let app: Application | null = null;
let initializing = false;

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
  onComponentsDeleted,
}: InitializeEditorOptions) {
  // Prevents extra state set if parent rerenders while app is initializing
  if (app && !initializing) {
    setEditorState(state, app.stage);
    return;
  }

  if (initializing) return;

  initializing = true;
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

  handleComponentCrud.onComponentsUpdated = (updates: Array<Component>) => {
    // Undo buffer set in setEditorState
    onComponentsUpdated?.(updates);
  };

  handleComponentCrud.onComponentsCreated = (components: Array<Component>) => {
    addToUndoBuffer({
      action: 'create',
      state: components,
    });

    onComponentsCreated?.(components);
  };

  handleComponentCrud.onComponentsDeleted = (ids: Array<string>) => {
    const deletedComponentsSnapshot: Array<Component> = [];
    for (const id of ids) {
      const comp = editorState.get(id);
      if (comp && !comp.locked) {
        deletedComponentsSnapshot.push(comp);
      }
    }

    addToUndoBuffer({
      action: 'delete',
      state: deletedComponentsSnapshot,
    });

    onComponentsDeleted?.(deletedComponentsSnapshot.map((c) => c.id));
  };

  addDragHandlers(app);
  addResizeHandlers(app);
  addCameraHandlers(app);
  addEditorKeyListeners();
  addEditorMouseListeners();

  const stageBackground = await drawBackground(app);
  handleCreateComponents({
    backgroundContainer: stageBackground,
  });
  app.stage.addChild(stageBackground);

  const componentMenu = await drawComponentContainerMenu();
  app.stage.addChild(componentMenu);

  // State must be set last so the z-index of the components is higher than editor decorators
  setEditorState(state, app.stage);

  selectComponents([...state.values()].filter((c) => c.selected).map((c) => c.id));

  parentElement.appendChild(app.canvas);
  initializing = false;
}

export function destroyEditor() {
  clearEditorKeyListeners();
  clearEditorMouseListeners();
  if (app && app.renderer) {
    app.destroy();
    app = null;
  }
}
