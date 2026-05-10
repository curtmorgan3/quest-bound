/**
 * Named easing presets for `comp.animate(easing, durationMs?)`.
 * Values are CSS timing-function strings, used directly in the rendered `transition` declaration.
 */
export const EASING_PRESETS = Object.freeze({
  linear: 'linear',
  ease: 'ease',
  easeIn: 'cubic-bezier(0.42, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.58, 1)',
  easeInOut: 'cubic-bezier(0.42, 0, 0.58, 1)',
} as const);

export type EasingName = keyof typeof EASING_PRESETS;

export const DEFAULT_TRANSITION_DURATION_MS = 300;

export function isEasingName(name: string): name is EasingName {
  return Object.prototype.hasOwnProperty.call(EASING_PRESETS, name);
}

export function resolveEasing(name: string): string {
  if (!isEasingName(name)) {
    const supported = Object.keys(EASING_PRESETS).join(', ');
    throw new Error(`comp.animate: unknown easing "${name}". Supported: ${supported}.`);
  }
  return EASING_PRESETS[name];
}

export interface TransitionSpec {
  durationMs: number;
  cubicBezier: string;
}
