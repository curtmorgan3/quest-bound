import { useAssets } from '@/lib/compass-api';
import { CharacterContext, WindowEditorContext } from '@/stores';
import type { CharacterAttribute, Component, GraphComponentData, GraphVariant } from '@/types';
import { useEditorItemId } from '@/lib/compass-planes/canvas/editor-item-context';
import { useComponentCanvasDimensions } from '@/lib/compass-planes/canvas/editor-item-layout-context';
import { memo, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  getBackgroundStyle,
  getComponentData,
  getFillStyle,
  getSolidFallback,
  parseLinearGradient,
  useComponentStyles,
} from '@/lib/compass-planes/utils';
import { ResizableNode } from '../../decorators';

function resolveGraphFillImageSrc(
  data: GraphComponentData,
  assets: Array<{ id: string; data?: string | null }>,
): string | undefined {
  if (!data.assetId && !data.assetUrl) return undefined;
  const asset = data.assetId ? assets.find((a) => a.id === data.assetId) : undefined;
  const src = asset?.data ?? data.assetUrl ?? undefined;
  return typeof src === 'string' && src.length > 0 ? src : undefined;
}

function cssUrl(value: string): string {
  return `url(${JSON.stringify(value)})`;
}

function toNumber(v: string | number | boolean): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

function resolveBoundNumeric(
  attributeId: string | null | undefined,
  customPropertyId: string | null | undefined,
  getCharacterAttribute: ((id: string) => CharacterAttribute | null) | undefined,
): number {
  if (!attributeId || !getCharacterAttribute) return 0;
  const ca = getCharacterAttribute(attributeId);
  if (!ca) return 0;
  if (customPropertyId) {
    const v = ca.attributeCustomPropertyValues?.[customPropertyId];
    if (v !== undefined && v !== null) return toNumber(v);
  }
  return toNumber(ca.value ?? 0);
}

function useGraphRatio(component: Component): number {
  const characterContext = useContext(CharacterContext);
  const data = getComponentData(component) as GraphComponentData;
  const numeratorId = data.numeratorAttributeId;
  const denominatorId = data.denominatorAttributeId;

  const getCa = characterContext?.getCharacterAttribute;
  const numerator = resolveBoundNumeric(
    numeratorId,
    data.numeratorAttributeCustomPropertyId,
    getCa,
  );
  const denominator =
    denominatorId && getCa
      ? resolveBoundNumeric(
          denominatorId,
          data.denominatorAttributeCustomPropertyId,
          getCa,
        )
      : data.denominatorValue != null
        ? toNumber(data.denominatorValue)
        : 0;

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
  const { assets } = useAssets(component?.rulesetId ?? undefined);

  const fillImageSrc = useMemo(() => {
    if (!component) return undefined;
    return resolveGraphFillImageSrc(getComponentData(component) as GraphComponentData, assets);
  }, [component?.data, component?.id, assets]);

  if (!component) return null;

  const data = getComponentData(component) as GraphComponentData;
  const variant = data.graphVariant ?? 'horizontal-linear';
  const { widthStyle: cw, heightStyle: ch } = useComponentCanvasDimensions(component);

  return (
    <ResizableNode component={component}>
      <div style={{ height: ch, width: cw }}>
        <GraphEditPlaceholder
          component={component}
          variant={variant}
          fillImageSrc={fillImageSrc}
        />
      </div>
    </ResizableNode>
  );
};

const EDIT_FILL_RATIO = 0.1;

// Edit mode: simple shape placeholder based on variant (10% fill so both colors show)
function GraphEditPlaceholder({
  component,
  variant,
  fillImageSrc,
}: {
  component: Component;
  variant: GraphVariant;
  fillImageSrc?: string;
}) {
  const data = getComponentData(component) as GraphComponentData;
  const css = useComponentStyles(component);
  const fillColor = getSolidFallback((css as { color?: string }).color) ?? '#7BA3C7';
  const { width, height, widthStyle, heightStyle } = useComponentCanvasDimensions(component);
  const editFillRatio = data.inverseFill ? 1 - EDIT_FILL_RATIO : EDIT_FILL_RATIO;

  const commonContainer = {
    width: widthStyle,
    height: heightStyle,
    ...getBackgroundStyle(css),
    borderRadius: css.borderRadius,
    border: '1px solid ' + (css.outlineColor || 'transparent'),
    overflow: 'hidden' as const,
  };

  if (variant === 'circular') {
    // Match view geometry: path radius r, stroke 2r → visible radius min(w,h)/2, centered
    const r = Math.min(width, height) / 4;
    const cx = width / 2;
    const cy = height / 2;
    const circumference = 2 * Math.PI * r;
    const strokeDashoffset = circumference * (1 - editFillRatio);
    const patternId = `graph-edit-fill-img-${component.id}`;
    const progressStroke = fillImageSrc ? `url(#${patternId})` : fillColor;
    return (
      <div
        style={{
          width: widthStyle,
          height: heightStyle,
          borderRadius: css.borderRadius,
          overflow: 'hidden',
        }}>
        <svg
          width='100%'
          height='100%'
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio='xMidYMid meet'
          style={{ display: 'block', transform: 'rotate(-90deg)' }}>
          {fillImageSrc ? (
            <defs>
              <pattern
                id={patternId}
                patternUnits='userSpaceOnUse'
                x={0}
                y={0}
                width={width}
                height={height}>
                <image
                  href={fillImageSrc}
                  x={0}
                  y={0}
                  width={width}
                  height={height}
                  preserveAspectRatio='xMidYMid slice'
                />
              </pattern>
            </defs>
          ) : null}
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
            stroke={progressStroke}
            strokeWidth={r * 2}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
      </div>
    );
  }

  const fillStyle = fillImageSrc
    ? {
        backgroundImage: cssUrl(fillImageSrc),
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    : getFillStyle((css as { color?: string }).color);
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
  const { assets } = useAssets(component.rulesetId ?? undefined);
  const fillImageSrc = useMemo(
    () => resolveGraphFillImageSrc(data, assets),
    [component.data, assets],
  );
  const hasFillImage = Boolean(fillImageSrc);

  const ratio = useGraphRatio(component);
  const debouncedRatio = useDebouncedRatio(ratio, debounceMs);
  const displayRatio = data.inverseFill ? 1 - debouncedRatio : debouncedRatio;

  const bgStyle = getBackgroundStyle(css);
  const bg = (css as { background?: string }).background ?? css.backgroundColor;
  const colorValue = (css as { color?: string }).color;
  const fillColor = getSolidFallback(colorValue) ?? '#7BA3C7';
  const fillStyle = hasFillImage
    ? {
        backgroundImage: cssUrl(fillImageSrc!),
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    : getFillStyle(colorValue);
  const fillDivStyle =
    Object.keys(fillStyle).length > 0 ? fillStyle : { backgroundColor: fillColor };
  const fillGradient = !hasFillImage ? parseLinearGradient(colorValue ?? '') : null;

  const { width, height, widthStyle, heightStyle } = useComponentCanvasDimensions(component);

  const commonContainer = {
    width: widthStyle,
    height: heightStyle,
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
  const r = Math.min(width, height) / 4;
  const cx = width / 2;
  const cy = height / 2;
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

  let fillImagePattern: { defs: ReactNode; stroke: string } | null = null;
  if (hasFillImage && fillImageSrc) {
    const patternId = `graph-fill-img-${component.id}`;
    fillImagePattern = {
      defs: (
        <defs>
          <pattern
            id={patternId}
            patternUnits='userSpaceOnUse'
            x={0}
            y={0}
            width={width}
            height={height}>
            <image
              href={fillImageSrc}
              x={0}
              y={0}
              width={width}
              height={height}
              preserveAspectRatio='xMidYMid slice'
            />
          </pattern>
        </defs>
      ),
      stroke: `url(#${patternId})`,
    };
  }

  const progressStroke =
    fillImagePattern?.stroke ?? fillStroke?.stroke ?? fillColor;

  return (
    <div style={{ ...commonContainer, backgroundColor: 'transparent', position: 'relative' }}>
      <svg
        width='100%'
        height='100%'
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio='xMidYMid meet'
        style={{ display: 'block', transform: 'rotate(-90deg)' }}>
        {fillImagePattern?.defs}
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
          stroke={progressStroke}
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
