import { CharacterContext, WindowEditorContext } from '@/stores';
import type { Component, GraphComponentData, GraphVariant } from '@/types';
import { useEditorItemId } from '@/lib/compass-planes/canvas/editor-item-context';
import { useComponentCanvasDimensions } from '@/lib/compass-planes/canvas/editor-item-layout-context';
import { memo, useContext, useEffect, useState } from 'react';
import {
  getBackgroundStyle,
  getComponentData,
  getFillStyle,
  getSolidFallback,
  parseLinearGradient,
  useComponentStyles,
} from '@/lib/compass-planes/utils';
import { ResizableNode } from '../../decorators';

function toNumber(v: string | number | boolean): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

function useGraphRatio(component: Component): number {
  const characterContext = useContext(CharacterContext);
  const data = getComponentData(component) as GraphComponentData;
  const numeratorId = data.numeratorAttributeId;
  const denominatorId = data.denominatorAttributeId;

  const numerator =
    numeratorId && characterContext
      ? toNumber(characterContext.getCharacterAttribute(numeratorId)?.value ?? 0)
      : 0;
  const denominator =
    denominatorId && characterContext
      ? toNumber(characterContext.getCharacterAttribute(denominatorId)?.value ?? 0)
      : (data.denominatorValue != null ? toNumber(data.denominatorValue) : 0);

  const rawRatio = denominator !== 0 ? numerator / denominator : 0;
  const ratio = Math.min(1, Math.max(0, rawRatio));

  const n = data.segmentCount;
  const oneBasedIndex = data.segmentIndex;
  if (
    typeof n === 'number' &&
    n >= 1 &&
    typeof oneBasedIndex === 'number' &&
    oneBasedIndex >= 1 &&
    oneBasedIndex <= n
  ) {
    const i = oneBasedIndex - 1;
    const segmentFill = ratio * n - i;
    return Math.min(1, Math.max(0, segmentFill));
  }
  return ratio;
}

function useDebouncedRatio(ratio: number, debounceMs: number): number {
  const [debounced, setDebounced] = useState(ratio);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(ratio), debounceMs);
    return () => clearTimeout(t);
  }, [ratio, debounceMs]);

  return debounced;
}

export const EditGraphNode = () => {
  const { getComponent } = useContext(WindowEditorContext);
  const id = useEditorItemId();
  const component = getComponent(id);
  if (!component) return null;

  const data = getComponentData(component) as GraphComponentData;
  const variant = data.graphVariant ?? 'horizontal-linear';
  const { width: cw, height: ch } = useComponentCanvasDimensions(component);

  return (
    <ResizableNode component={component}>
      <div style={{ height: ch, width: cw }}>
        <GraphEditPlaceholder component={component} variant={variant} />
      </div>
    </ResizableNode>
  );
};

const EDIT_FILL_RATIO = 0.1;

// Edit mode: simple shape placeholder based on variant (10% fill so both colors show)
function GraphEditPlaceholder({
  component,
  variant,
}: {
  component: Component;
  variant: GraphVariant;
}) {
  const data = getComponentData(component) as GraphComponentData;
  const css = useComponentStyles(component);
  const fillColor = getSolidFallback((css as { color?: string }).color) ?? '#7BA3C7';
  const { width: w, height: h } = useComponentCanvasDimensions(component);
  const editFillRatio = data.inverseFill ? 1 - EDIT_FILL_RATIO : EDIT_FILL_RATIO;

  const commonContainer = {
    width: w,
    height: h,
    ...getBackgroundStyle(css),
    borderRadius: css.borderRadius,
    border: '1px solid ' + (css.outlineColor || 'transparent'),
    overflow: 'hidden' as const,
  };

  if (variant === 'circular') {
    // Match view geometry: path radius r, stroke 2r → visible radius min(w,h)/2, centered
    const r = Math.min(w, h) / 4;
    const cx = w / 2;
    const cy = h / 2;
    const circumference = 2 * Math.PI * r;
    const strokeDashoffset = circumference * (1 - editFillRatio);
    return (
      <div style={{ width: w, height: h, borderRadius: css.borderRadius, overflow: 'hidden' }}>
        <svg width={w} height={h} style={{ display: 'block', transform: 'rotate(-90deg)' }}>
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill='none'
            stroke={getSolidFallback(css.background ?? css.backgroundColor) ?? 'transparent'}
            strokeWidth={r * 2}
          />
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill='none'
            stroke={fillColor}
            strokeWidth={r * 2}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
      </div>
    );
  }

  const fillStyle = getFillStyle((css as { color?: string }).color);
  const fillDivStyle =
    Object.keys(fillStyle).length > 0
      ? fillStyle
      : { backgroundColor: fillColor };

  const editClipRight = (1 - editFillRatio) * 100;
  const editClipTop = (1 - editFillRatio) * 100;

  if (variant === 'vertical-linear') {
    return (
      <div style={{ ...commonContainer, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            ...fillDivStyle,
            clipPath: `inset(${editClipTop}% 0 0 0)`,
            WebkitClipPath: `inset(${editClipTop}% 0 0 0)`,
          }}
        />
      </div>
    );
  }

  // horizontal-linear (default)
  return (
    <div style={{ ...commonContainer, position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          ...fillDivStyle,
          clipPath: `inset(0 ${editClipRight}% 0 0)`,
          WebkitClipPath: `inset(0 ${editClipRight}% 0 0)`,
        }}
      />
    </div>
  );
}

const DEFAULT_DEBOUNCE_SECONDS = 0.15;
const FILL_TRANSITION_MS = 400;

const ViewGraphNodeComponent = ({ component }: { component: Component }) => {
  const data = getComponentData(component) as GraphComponentData;
  const css = useComponentStyles(component);
  const variant = data.graphVariant ?? 'horizontal-linear';
  const debounceMs = Math.max(
    0,
    (data.animationDebounceSeconds ?? DEFAULT_DEBOUNCE_SECONDS) * 1000,
  );

  return (
    <ViewGraphNodeLive component={component} variant={variant} css={css} debounceMs={debounceMs} />
  );
};

const ViewGraphNodeLive = memo(function ViewGraphNodeLive({
  component,
  variant,
  css,
  debounceMs,
}: {
  component: Component;
  variant: GraphVariant;
  css: ReturnType<typeof useComponentStyles>;
  debounceMs: number;
}) {
  const data = getComponentData(component) as GraphComponentData;
  const ratio = useGraphRatio(component);
  const debouncedRatio = useDebouncedRatio(ratio, debounceMs);
  const displayRatio = data.inverseFill ? 1 - debouncedRatio : debouncedRatio;

  const bgStyle = getBackgroundStyle(css);
  const bg = (css as { background?: string }).background ?? css.backgroundColor;
  const colorValue = (css as { color?: string }).color;
  const fillColor = getSolidFallback(colorValue) ?? '#7BA3C7';
  const fillStyle = getFillStyle(colorValue);
  const fillDivStyle =
    Object.keys(fillStyle).length > 0 ? fillStyle : { backgroundColor: fillColor };
  const fillGradient = parseLinearGradient(colorValue ?? '');

  const { width: w, height: h } = useComponentCanvasDimensions(component);

  const commonContainer = {
    width: w,
    height: h,
    ...bgStyle,
    borderRadius: css.borderRadius,
    overflow: 'hidden' as const,
  };

  // Gradient/fill layer is full component size; clip-path reveals the fill ratio portion
  const clipRight = (1 - displayRatio) * 100;
  const clipTop = (1 - displayRatio) * 100;

  if (variant === 'horizontal-linear') {
    return (
      <div style={{ ...commonContainer, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            ...fillDivStyle,
            clipPath: `inset(0 ${clipRight}% 0 0)`,
            WebkitClipPath: `inset(0 ${clipRight}% 0 0)`,
            transition: `clip-path ${FILL_TRANSITION_MS}ms ease-out`,
          }}
        />
      </div>
    );
  }

  if (variant === 'vertical-linear') {
    return (
      <div style={{ ...commonContainer, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            ...fillDivStyle,
            clipPath: `inset(${clipTop}% 0 0 0)`,
            WebkitClipPath: `inset(${clipTop}% 0 0 0)`,
            transition: `clip-path ${FILL_TRANSITION_MS}ms ease-out`,
          }}
        />
      </div>
    );
  }

  // circular: path radius r so that stroke (width 2r) fills center to edge = visible radius min(w,h)/2
  const r = Math.min(w, h) / 4;
  const cx = w / 2;
  const cy = h / 2;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference * (1 - displayRatio);

  // SVG stroke doesn't accept CSS gradient; use linearGradient in defs when fill is a gradient
  const fillStroke =
    fillGradient &&
    (() => {
      const angleRad = (fillGradient.angle * Math.PI) / 180;
      const x1 = 0.5 - 0.5 * Math.sin(angleRad);
      const y1 = 0.5 + 0.5 * Math.cos(angleRad);
      const x2 = 0.5 + 0.5 * Math.sin(angleRad);
      const y2 = 0.5 - 0.5 * Math.cos(angleRad);
      const gradId = `graph-fill-${component.id}`;
      return {
        gradId,
        defs: (
          <defs>
            <linearGradient id={gradId} x1={x1} y1={y1} x2={x2} y2={y2}>
              <stop offset="0%" stopColor={fillGradient.color1} />
              <stop offset="100%" stopColor={fillGradient.color2} />
            </linearGradient>
          </defs>
        ),
        stroke: `url(#${gradId})`,
      };
    })();

  return (
    <div style={{ ...commonContainer, backgroundColor: 'transparent', position: 'relative' }}>
      <svg width={w} height={h} style={{ display: 'block', transform: 'rotate(-90deg)' }}>
        {fillStroke?.defs}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill='none'
          stroke={getSolidFallback(bg ?? css.backgroundColor) ?? 'transparent'}
          strokeWidth={r * 2}
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill='none'
          stroke={fillStroke?.stroke ?? fillColor}
          strokeWidth={r * 2}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: `stroke-dashoffset ${FILL_TRANSITION_MS}ms ease-out`,
          }}
        />
      </svg>
    </div>
  );
});

export const ViewGraphNode = memo(
  ViewGraphNodeComponent,
  (prev, next) => prev.component === next.component,
);
