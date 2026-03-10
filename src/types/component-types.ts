import type { ScriptParamValue } from './data-model-types';

type BaseComponentStyle = {
  /** Solid color or custom-prop reference. When a gradient, use `background` instead. */
  backgroundColor?: string;
  /** Set when backgroundColor is a linear-gradient; use this for the style. */
  background?: string;
  opacity: number;
  outline?: string;
  borderRadius?: string;
  borderRadiusTopLeft: number;
  borderRadiusTopRight: number;
  borderRadiusBottomLeft: number;
  borderRadiusBottomRight: number;
  outlineWidth: number;
  outlineColor: string;
  paddingRight?: number;
  paddingLeft?: number;
  paddingTop?: number;
  paddingBottom?: number;
};

export type TextComponentStyle = BaseComponentStyle & {
  /** Solid color or linear-gradient string. When gradient, use colorStyle for gradient text. */
  color?: string;
  /** When color is a gradient, use this object for the text element (background + backgroundClip + color). */
  colorStyle?: Record<string, string | number>;
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
  customPropertyId?: string;
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
  /** When true, the fill is inverted (empty portion shown as fill, fill as empty). */
  inverseFill?: boolean;
  numeratorAttributeId?: string | null;
  denominatorAttributeId?: string | null;
  denominatorValue?: number | null;
  /** When set with segmentCount, this node shows only segment segmentIndex of segmentCount (1-based). */
  segmentIndex?: number | null;
  /** Total segments; e.g. 3 = one bar split into three. Use 1 or leave unset for single full bar. */
  segmentCount?: number | null;
  /** Delay in seconds before the fill animation runs (decimal allowed). */
  animationDebounceSeconds?: number;
};

export type FrameComponentData = {
  url?: string;
};

export type ConditionalRenderOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'notContains';

export type ConditionalRenderLogic = {
  operator: ConditionalRenderOperator;
  value: string | number | boolean;
};

export type ComponentData = ShapeComponentData &
  TextComponentData &
  ImageComponentData &
  InputComponentData &
  InventoryComponentData &
  CheckboxComponentData &
  GraphComponentData &
  FrameComponentData & {
    referenceLabel?: string | null;
    conditionalRenderAttributeId?: string | null;
    conditionalRenderInverse?: boolean;
    conditionalRenderLogic?: ConditionalRenderLogic | null;
    pageId?: string;
    href?: string;
    /** Per-component values for Script.parameters, keyed by ScriptParameterDefinition.id. */
    scriptParameterValues?: Record<string, ScriptParamValue>;
    animationColor?: string | null;
    animation?: string | null;
  };
