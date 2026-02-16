type BaseComponentStyle = {
  backgroundColor: string;
  opacity: number;
  outline?: string;
  borderRadius?: string;
  borderRadiusTopLeft: number;
  borderRadiusTopRight: number;
  borderRadiusBottomLeft: number;
  borderRadiusBottomRight: number;
  outlineWidth: number;
  outlineColor: string;
};

export type TextComponentStyle = BaseComponentStyle & {
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  textAlign?: 'start' | 'center' | 'end';
  verticalAlign?: 'start' | 'center' | 'end';
  lineHeight?: number;
};

export type ComponentStyle = BaseComponentStyle & TextComponentStyle;

// Component data types should only include optional properties.
export type ShapeComponentData = {
  sides?: number;
};

export type TextComponentData = {
  value?: string | number | boolean;
  showSign?: boolean;
};

export type ContentComponentData = {
  value?: string;
};

export type ImageComponentData = {
  assetId?: string;
  assetUrl?: string;
  /** When true, in view mode show the character's image; fall back to this component's image when no character image. */
  useCharacterImage?: boolean;
};

export type InputComponentData = {
  placeholder?: string;
  type?: 'text' | 'number';
};

export type CheckboxComponentData = {
  label?: string;
  checkedAssetId?: string;
  checkedAssetUrl?: string;
  uncheckedAssetId?: string;
  uncheckedAssetUrl?: string;
};

export type InventoryComponentData = {
  cellHeight: number;
  cellWidth: number;
  typeRestriction?: 'item' | 'action' | 'attribute';
  categoryRestriction?: string;
  itemRestrictionRef?: string;
  actionRestrictionRef?: string;
  showItemAs?: 'image' | 'title';
};

export type GraphVariant = 'horizontal-linear' | 'vertical-linear' | 'circular';

export type GraphComponentData = {
  graphVariant?: GraphVariant;
  numeratorAttributeId?: string | null;
  denominatorAttributeId?: string | null;
  /** Delay in seconds before the fill animation runs (decimal allowed). */
  animationDebounceSeconds?: number;
};

export type FrameComponentData = {
  url?: string;
};

export type ComponentData = ShapeComponentData &
  TextComponentData &
  ImageComponentData &
  InputComponentData &
  InventoryComponentData &
  CheckboxComponentData &
  GraphComponentData &
  FrameComponentData & {
    conditionalRenderAttributeId?: string | null;
    conditionalRenderInverse?: boolean;
    pageId?: string;
    href?: string;
  };
