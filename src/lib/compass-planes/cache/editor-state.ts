import type { Component } from '@/types';
import debounce from 'lodash.debounce';
import type { Container } from 'pixi.js';
import { drawShape } from '../components';
import type { EditorState } from '../types';
import { addToUndoBuffer } from './interactive-state';

let editorState: EditorState = new Map();

export function setEditorState(state: EditorState, container: Container) {
  // Components deleted
  if (editorState.size > state.size) {
    for (const component of editorState.values()) {
      if (!state.has(component.id)) {
        const element = container.getChildByLabel(`component-${component.id}`);
        if (element) {
          container.removeChild(element);
          element.destroy({ children: true, texture: true });
        }
      }
    }
    // Components added
  } else if (state.size > editorState.size) {
    for (const component of state.values()) {
      if (!editorState.has(component.id)) {
        switch (component.type) {
          case 'shape':
            drawShape(container, component);
            break;
        }
      }
    }
  }
  // else
  // components are responsitioned, scaled or styled
  // no need to take action here, such updates are made optimisitcally in the editor

  editorState = state;
}

export function clearEditorState() {
  editorState = new Map();
}

export function getComponentState(id: string) {
  const state = editorState.get(id);
  if (!state) {
    console.warn(`Component with id ${id} not found in state`);
  }
  return state;
}

const lastComponentChanges = new Map<string, Component>();
const prevComponentState: EditorState = new Map();
let lastIdUpdated = '';

const debouncedBufferAdd = debounce(() => {
  addToUndoBuffer({
    action: 'set',
    state: [...lastComponentChanges.values()],
    prevState: new Map(prevComponentState),
  });
  lastComponentChanges.clear();
}, 200);

const debouncedSetPrevState = debounce((state: Component) => {
  prevComponentState.set(state.id, state);
}, 200);

export function setComponetState(id: string, state: Partial<Component>) {
  const existing = editorState.get(id);

  if (existing) {
    // avoid debouncing if multiple comps are edited together
    if (lastIdUpdated === id) {
      debouncedSetPrevState(existing);
    } else {
      prevComponentState.set(id, existing);
    }

    lastIdUpdated = id;

    if (!lastComponentChanges.get(id)) {
      // Do not overwrite after the first set
      lastComponentChanges.set(id, existing);
    }
    debouncedBufferAdd();
    editorState.set(id, { ...existing, ...state });
  }
}

export function getAllComponents() {
  return Array.from(editorState.values());
}

export { editorState };
