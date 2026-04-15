import type { Component, ComponentData } from '@/types';

/**
 * Optional per-state overrides (stored in state entry `data` JSON) for click behavior.
 * Base components still use top-level `actionId` / `childWindowId` / `scriptId` on `Component`.
 * When a key is present on merged `data` (even `null`), it overrides inherited row values for that layer.
 */
export function resolveEffectiveActionId(component: Component, data: ComponentData): string | null {
  if (Object.hasOwn(data, 'clickActionId')) {
    const v = data.clickActionId;
    return v == null || v === '' ? null : String(v);
  }
  return component.actionId ?? null;
}

export function resolveEffectiveChildWindowId(
  component: Component,
  data: ComponentData,
): string | null {
  if (Object.hasOwn(data, 'clickChildWindowId')) {
    const v = data.clickChildWindowId;
    return v == null || v === '' ? null : String(v);
  }
  return component.childWindowId ?? null;
}

export function resolveEffectiveScriptId(component: Component, data: ComponentData): string | null {
  if (Object.hasOwn(data, 'clickScriptId')) {
    const v = data.clickScriptId;
    return v == null || v === '' ? null : String(v);
  }
  return component.scriptId ?? null;
}
