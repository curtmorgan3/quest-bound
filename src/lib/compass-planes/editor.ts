import { debugLog } from '@/utils';
import { Application, Container, type ApplicationOptions } from 'pixi.js';
import { editorState, setEditorState } from './cache';
import { defaultEditorConfig } from './defaults';
import { drawComponents } from './helpers';
import type { EditorConfiguration, EditorState } from './types';

const { log } = debugLog('planes', 'editor');

interface InitializeEditorOptions {
  elementId: string;
  config?: EditorConfiguration;
  state: EditorState;
}

let app: Application | null = null;

/**
 * Creates an editor instance when component state changes.
 * Should only created a new instance when components are added or removed.
 */
export async function initializeEditor({ elementId, config, state }: InitializeEditorOptions) {
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
    ...defaultEditorConfig,
    ...config,
  };

  await app.init({ ...configuration, resizeTo: parentElement, eventMode: 'static' });

  const stageBackground = new Container({
    label: 'editor-background',
    eventMode: 'static',
    hitArea: app.renderer.screen,
  });

  stageBackground.on('pointerdown', () => {
    console.log('background click');
  });

  app.stage.addChild(stageBackground);

  drawComponents(app.stage, editorState);

  parentElement.appendChild(app.canvas);
}

export function destroyEditor() {
  if (app) {
    app = null;
  }
}
