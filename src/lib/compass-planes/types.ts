type ComponentStyle = {
  backgroundColor?: string;
};

type EditorType = 'shape' | 'input';

export type EditorState = Map<string, EditorComponent>;

export type EditorConfiguration = {
  backgroundColor?: string;
};

export type EditorComponent = {
  id: string;
  type: EditorType;
  x: number;
  y: number;
  z: number;
  rotation: number;
  height: number;
  width: number;
  style: ComponentStyle;
};
