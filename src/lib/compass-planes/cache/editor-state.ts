import type { Component } from '@/types';
import type { Container } from 'pixi.js';
import { drawShape } from '../components';
import type { EditorState } from '../types';

let editorState: EditorState = new Map();

export function setEditorState(state: EditorState, container?: Container) {
  if (!container) {
    editorState = state;
    return;
  }

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

export function getComponentState(id: string) {
  const state = editorState.get(id);
  if (!state) {
    console.warn(`Component with id ${id} not found in state`);
  }
  return state;
}

export function setComponetState(id: string, state: Partial<Component>) {
  const existing = editorState.get(id);
  if (existing) {
    editorState.set(id, { ...existing, ...state });
  }
}

export function getAllComponents() {
  return Array.from(editorState.values());
}

export { editorState };
