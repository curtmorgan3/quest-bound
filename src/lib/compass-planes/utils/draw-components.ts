import type { Container } from 'pixi.js';
import { drawShape } from '../components';
import type { EditorState } from '../types';

export function drawComponents(parent: Container, components: EditorState) {
  const componentsArray = [...components.values()];
  const shapes = componentsArray.filter((c) => c.type === 'shape');

  for (const shape of shapes) {
    drawShape(parent, shape);
  }
}
