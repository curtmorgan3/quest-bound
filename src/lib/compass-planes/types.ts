type EditorPos = {
  x: number;
  y: number;
  z: number;
  rotation: number;
};

type EditorSize = {
  height: number;
  width: number;
};

type ComponentStyle = {
  backgroundColor?: string;
};

type EditorType = 'shape' | 'input';

export type EditorState = Record<string, EditorComponent>;

export type EditorConfiguration = {
  backgroundColor?: string;
};

export type EditorComponent = {
  id: string;
  type: EditorType;
  position: EditorPos;
  size: EditorSize;
  style: ComponentStyle;
};
