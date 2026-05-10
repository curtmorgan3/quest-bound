import { useScriptComponentTransitionStore } from '@/stores/script-component-transition-store';

const FLAT_KEY_TO_CSS_PROPERTY: Record<string, string> = {
  rotation: 'transform',
  x: 'left',
  y: 'top',
  width: 'width',
  height: 'height',
  backgroundColor: 'background-color',
  background: 'background',
  opacity: 'opacity',
  outline: 'outline',
  outlineWidth: 'outline-width',
  outlineColor: 'outline-color',
  borderRadius: 'border-radius',
  borderRadiusTopLeft: 'border-top-left-radius',
  borderRadiusTopRight: 'border-top-right-radius',
  borderRadiusBottomLeft: 'border-bottom-left-radius',
  borderRadiusBottomRight: 'border-bottom-right-radius',
  boxShadow: 'box-shadow',
  paddingRight: 'padding-right',
  paddingLeft: 'padding-left',
  paddingTop: 'padding-top',
  paddingBottom: 'padding-bottom',
  gap: 'gap',
  color: 'color',
  fontSize: 'font-size',
  lineHeight: 'line-height',
};

const LAYOUT_KEYS = new Set(['x', 'y', 'width', 'height']);
const ROTATION_KEYS = new Set(['rotation']);

type Slice = 'layout' | 'rotation' | 'style';

function selectTransition(
  byComponent: Map<string, Map<string, { durationMs: number; cubicBezier: string }>>,
  characterId: string | undefined,
  componentId: string | undefined,
  slice: Slice,
): string | null {
  if (!characterId || !componentId) return null;
  const perKey = byComponent.get(`${characterId}:${componentId}`);
  if (!perKey || perKey.size === 0) return null;
  const parts: string[] = [];
  for (const [key, spec] of perKey) {
    const cssProp = FLAT_KEY_TO_CSS_PROPERTY[key];
    if (!cssProp) continue;
    if (slice === 'layout' && !LAYOUT_KEYS.has(key)) continue;
    if (slice === 'rotation' && !ROTATION_KEYS.has(key)) continue;
    if (slice === 'style' && (LAYOUT_KEYS.has(key) || ROTATION_KEYS.has(key))) continue;
    parts.push(`${cssProp} ${spec.durationMs}ms ${spec.cubicBezier}`);
  }
  return parts.length > 0 ? parts.join(', ') : null;
}

/** `transition` CSS for the absolute layout wrapper (left/top/width/height), or null. */
export function useLayoutTransitionCSS(
  characterId: string | undefined,
  componentId: string | undefined,
): string | null {
  return useScriptComponentTransitionStore((s) =>
    selectTransition(s.byComponent, characterId, componentId, 'layout'),
  );
}

/** `transition` CSS for the rotation wrapper (transform), or null. */
export function useRotationTransitionCSS(
  characterId: string | undefined,
  componentId: string | undefined,
): string | null {
  return useScriptComponentTransitionStore((s) =>
    selectTransition(s.byComponent, characterId, componentId, 'rotation'),
  );
}

/** `transition` CSS for the leaf style element (colors, opacity, padding, fontSize, ...), or null. */
export function useStyleTransitionCSS(
  characterId: string | undefined,
  componentId: string | undefined,
): string | null {
  return useScriptComponentTransitionStore((s) =>
    selectTransition(s.byComponent, characterId, componentId, 'style'),
  );
}
