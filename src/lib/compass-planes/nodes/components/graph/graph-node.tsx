import { CharacterContext, WindowEditorContext } from '@/stores';
import type { Component, GraphComponentData, GraphVariant } from '@/types';
import { useNodeId } from '@xyflow/react';
import { useContext, useEffect, useState } from 'react';
import { getComponentData, getComponentStyles } from '../../../utils';
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
      : 0;

  const rawRatio = denominator !== 0 ? numerator / denominator : 0;
  return Math.min(1, Math.max(0, rawRatio));
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
  const id = useNodeId();

  if (!id) return null;
  const component = getComponent(id);
  if (!component) return null;

  const data = getComponentData(component) as GraphComponentData;
  const variant = data.graphVariant ?? 'horizontal-linear';

  return (
    <ResizableNode component={component}>
      <div style={{ height: component.height, width: component.width }}>
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
  const css = getComponentStyles(component);
  const fillColor = (css as { color?: string }).color ?? '#7BA3C7';
  const w = component.width;
  const h = component.height;

  const commonContainer = {
    width: w,
    height: h,
    backgroundColor: css.backgroundColor,
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
    const strokeDashoffset = circumference * (1 - EDIT_FILL_RATIO);
    return (
      <div style={{ width: w, height: h, borderRadius: css.borderRadius, overflow: 'hidden' }}>
        <svg width={w} height={h} style={{ display: 'block', transform: 'rotate(-90deg)' }}>
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill='none'
            stroke={css.backgroundColor}
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

  if (variant === 'vertical-linear') {
    return (
      <div style={{ ...commonContainer, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: `${EDIT_FILL_RATIO * 100}%`,
            backgroundColor: fillColor,
          }}
        />
      </div>
    );
  }

  // horizontal-linear (default)
  return (
    <div style={commonContainer}>
      <div
        style={{
          height: '100%',
          width: `${EDIT_FILL_RATIO * 100}%`,
          backgroundColor: fillColor,
        }}
      />
    </div>
  );
}

const DEFAULT_DEBOUNCE_SECONDS = 0.15;
const FILL_TRANSITION_MS = 400;

export const ViewGraphNode = ({ component }: { component: Component }) => {
  const data = getComponentData(component) as GraphComponentData;
  const css = getComponentStyles(component);
  const variant = data.graphVariant ?? 'horizontal-linear';
  const debounceMs = Math.max(0, (data.animationDebounceSeconds ?? DEFAULT_DEBOUNCE_SECONDS) * 1000);

  return (
    <ViewGraphNodeLive
      component={component}
      variant={variant}
      css={css}
      debounceMs={debounceMs}
    />
  );
};

function ViewGraphNodeLive({
  component,
  variant,
  css,
  debounceMs,
}: {
  component: Component;
  variant: GraphVariant;
  css: ReturnType<typeof getComponentStyles>;
  debounceMs: number;
}) {
  const ratio = useGraphRatio(component);
  const debouncedRatio = useDebouncedRatio(ratio, debounceMs);
  const bg = css.backgroundColor;
  const fillColor = (css as { color?: string }).color ?? '#7BA3C7';

  const w = component.width;
  const h = component.height;

  const commonContainer = {
    width: w,
    height: h,
    backgroundColor: bg,
    borderRadius: css.borderRadius,
    overflow: 'hidden' as const,
  };

  if (variant === 'horizontal-linear') {
    return (
      <div style={commonContainer}>
        <div
          style={{
            height: '100%',
            width: `${debouncedRatio * 100}%`,
            backgroundColor: fillColor,
            transition: `width ${FILL_TRANSITION_MS}ms ease-out`,
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
            bottom: 0,
            left: 0,
            right: 0,
            height: `${debouncedRatio * 100}%`,
            backgroundColor: fillColor,
            transition: `height ${FILL_TRANSITION_MS}ms ease-out`,
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
  const strokeDashoffset = circumference * (1 - debouncedRatio);

  return (
    <div style={{ ...commonContainer, backgroundColor: 'transparent', position: 'relative' }}>
      <svg width={w} height={h} style={{ display: 'block', transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill='none' stroke={bg} strokeWidth={r * 2} />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill='none'
          stroke={fillColor}
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
}
