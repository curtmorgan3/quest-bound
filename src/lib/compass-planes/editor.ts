import { Application } from 'pixi.js';
import { defaultEditorConfig } from './components/default';
import { drawComponents } from './helpers';
import type { EditorConfiguration, EditorState } from './types';

interface InitializeEditorOptions {
  elementId: string;
  config?: EditorConfiguration;
  state: EditorState;
}

export let editorState: EditorState;
let appInstance: Application | null = null;

/**
 * Creates an editor instance when component state changes.
 * Should only created a new instance when components are added or removed.
 */
export async function initializeEditor({ elementId, config, state }: InitializeEditorOptions) {
  editorState = state;
  console.log('new comp state');

  if (appInstance) return;
  console.log('initialize editor');

  const parentElement = document.getElementById(elementId);
  if (!parentElement) {
    throw new Error(`Element with id ${elementId} not found`);
  }

  appInstance = new Application();

  const configuration = {
    ...defaultEditorConfig,
    ...config,
  };

  await appInstance.init({ ...configuration, resizeTo: parentElement });

  drawComponents(appInstance.stage, editorState);

  parentElement.appendChild(appInstance.canvas);
}

export function destroyEditor() {
  if (appInstance) {
    appInstance = null;
  }
}
