import type { ScriptParamValue } from './data-model-types';

type BaseComponentStyle = {
  /** Solid color or custom-prop reference. When a gradient, use `background` instead. */
  backgroundColor?: string;
  /** Set when backgroundColor is a linear-gradient; use this for the style. */
  background?: string;
  /** When backgroundColor is a custom-prop reference, opacity to apply (0–1). */
  backgroundColorCustomPropOpacity?: number;
  /** When backgroundColor is a gradient and stop 1 is a custom prop, opacity to apply (0–1). */
  backgroundColorGradientStop1CustomPropOpacity?: number;
  /** When backgroundColor is a gradient and stop 2 is a custom prop, opacity to apply (0–1). */
  backgroundColorGradientStop2CustomPropOpacity?: number;
  opacity: number;
  outline?: string;
  borderRadius?: string;
  borderRadiusTopLeft: number;
  borderRadiusTopRight: number;
  borderRadiusBottomLeft: number;
  borderRadiusBottomRight: number;
  outlineWidth: number;
  outlineColor: string;
  /** When outlineColor is a custom-prop reference, opacity to apply (0–1). */
  outlineColorCustomPropOpacity?: number;
  /** Computed CSS `box-shadow` from `boxShadowOffsetX` etc. (set in applyStyleEnrichment). */
  boxShadow?: string;
  boxShadowOffsetX?: number;
  boxShadowOffsetY?: number;
  boxShadowBlur?: number;
  boxShadowSpread?: number;
  boxShadowColor?: string;
  /** When boxShadowColor is a custom-prop reference, opacity to apply (0–1). */
  boxShadowColorCustomPropOpacity?: number;
  paddingRight?: number;
  paddingLeft?: number;
  paddingTop?: number;
  paddingBottom?: number;
  /** Group nodes: flex container (when `layoutMode` in data is `flex`). */
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  gap?: number;
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
  justifyContent?:
    | 'flex-start'
    | 'flex-end'
    | 'center'
    | 'space-between'
    | 'space-around'
    | 'space-evenly';
};

export type TextComponentStyle = BaseComponentStyle & {
  /** Solid color or linear-gradient string. When gradient, use colorStyle for gradient text. */
  color?: string;
  /** When color is a custom-prop reference, opacity to apply (0–1). */
  colorCustomPropOpacity?: number;
  /** When color is a gradient and stop 1 is a custom prop, opacity to apply (0–1). */
  colorGradientStop1CustomPropOpacity?: number;
  /** When color is a gradient and stop 2 is a custom prop, opacity to apply (0–1). */
  colorGradientStop2CustomPropOpacity?: number;
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

export type GroupLayoutMode = 'absolute' | 'flex';

/** Layout for group-like roots (`group`, `container`) in `data` JSON. Flex details live in `style`. */
export type GroupComponentData = {
  layoutMode?: GroupLayoutMode;
  /**
   * When true or omitted, hover/pressed visual state is shared across the group subtree.
   * When false, each descendant handles pointer events only for itself.
   */
  shareHoverPressedWithGroup?: boolean;
};

export type TextComponentData = {
  value?: string | number | boolean;
  showSign?: boolean;
};

export type ContentComponentData = {
  value?: string;
  /** When true, players cannot open edit mode on the sheet (view mode only). */
  readOnly?: boolean;
};

export type ImageComponentData = {
  assetId?: string;
  assetUrl?: string;
  customPropertyId?: string;
  /** When true, in view mode show the character's image; fall back to this component's image when no character image. */
  useCharacterImage?: boolean;
  /** Accessible description for the image (`<img alt>`). */
  altText?: string;
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
  /** When `showItemAs` is `image`, show entity label in a tooltip on hover. */
  showLabelTooltip?: boolean;
};

export type GraphVariant = 'horizontal-linear' | 'vertical-linear' | 'circular';

export type GraphComponentData = {
  graphVariant?: GraphVariant;
  /** When true, the fill is inverted (empty portion shown as fill, fill as empty). */
  inverseFill?: boolean;
  /** When set with a resolvable URL, the progress fill uses this image instead of `color` / gradient. */
  assetId?: string | null;
  /** Cached image URL for the fill (e.g. synced from the asset); used when the asset is not in memory. */
  assetUrl?: string | null;
  numeratorAttributeId?: string | null;
  /** When set, numerator is read from this ruleset attribute custom field (number) instead of the main attribute value. */
  numeratorAttributeCustomPropertyId?: string | null;
  denominatorAttributeId?: string | null;
  /** When set, denominator is read from this ruleset attribute custom field (number) instead of the main attribute value. */
  denominatorAttributeCustomPropertyId?: string | null;
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
  | 'notContains'
  | 'isEmpty'
  | 'isNotEmpty';

export type ConditionalRenderLogic = {
  operator: ConditionalRenderOperator;
  value: string | number | boolean;
};

/** How a click-opened child window is placed on the sheet canvas. */
export type ChildWindowPlacementMode = 'fixed' | 'relative';

/** Anchor alignment for opening a child window (see click event modal). */
export type ChildWindowAnchor =
  | 'center'
  | 'topLeft'
  | 'topCenter'
  | 'topRight'
  | 'leftCenter'
  | 'rightCenter'
  | 'bottomLeft'
  | 'bottomCenter'
  | 'bottomRight'
  /** Fixed placement only: use `childWindowX` / `childWindowY`. */
  | 'positioned';

export type ComponentData = ShapeComponentData &
  TextComponentData &
  ContentComponentData &
  ImageComponentData &
  InputComponentData &
  InventoryComponentData &
  CheckboxComponentData &
  GraphComponentData &
  FrameComponentData &
  GroupComponentData & {
    referenceLabel?: string | null;
    conditionalRenderAttributeId?: string | null;
    conditionalRenderInverse?: boolean;
    conditionalRenderLogic?: ConditionalRenderLogic | null;
    pageId?: string;
    href?: string;
    viewAttributeId?: string | null;
    viewAttributeReadOnly?: boolean;
    /** Per-component values for Script.parameters, keyed by ScriptParameterDefinition.id. */
    scriptParameterValues?: Record<string, ScriptParamValue>;
    animationColor?: string | null;
    animation?: string | null;
    tooltipValue?: string | null;
    tooltipAttributeId?: string | null;
    /** When `component.attributeId` is set, optional ruleset attribute custom property id (`EntityCustomPropertyDef.id`). */
    attributeCustomPropertyId?: string | null;
    tooltipPlacement?: 'top' | 'right' | 'bottom' | 'left';
    childWindowX?: number;
    childWindowY?: number;
    childWindowCollapse?: boolean;
    childWindowPlacementMode?: ChildWindowPlacementMode;
    childWindowAnchor?: ChildWindowAnchor;
    /** When true (character sheet only), click removes the character window instance that contains this component. */
    closeCharacterWindowOnClick?: boolean;
    /**
     * Per-state click overlay: when set on merged `data` (including explicit `null`), overrides
     * `Component.actionId` for that visual state layer.
     */
    clickActionId?: string | null;
    /** Same pattern for `Component.childWindowId`. */
    clickChildWindowId?: string | null;
    /** Same pattern for `Component.scriptId` (visible click scripts). */
    clickScriptId?: string | null;
    /**
     * When true, render width as `100dvw` on the sheet root or `100%` under a parent group,
     * while keeping stored `width` for layout math.
     */
    takeFullWidth?: boolean;
    /**
     * When true, render height as `100dvh` on the sheet root or `100%` under a parent group,
     * while keeping stored `height` for layout math.
     */
    takeFullHeight?: boolean;
    /**
     * When true, the sheet does not run component-level click handlers (scripts, navigation,
     * actions, dice-from-text, attribute panel, and primary control clicks). Set from scripts via
     * `SheetComponentAccessor.setDisabled` or `set('disabled', value)`.
     */
    disabled?: boolean;
  };
