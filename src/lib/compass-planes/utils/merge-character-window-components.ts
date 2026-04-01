import type { Character, Component } from '@/types';

function parseOverlay(raw: string | null | undefined): Component[] {
  if (raw == null || raw === '') return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as Component[]) : [];
  } catch {
    return [];
  }
}

/**
 * Merge ruleset template components with per-character script overlay components and character-only patches
 * for the sheet viewer (one CharacterWindow instance).
 */
export function mergeCharacterWindowComponents(
  templateComponents: Component[],
  characterWindow: { scriptOverlayComponents?: string | null },
  character: Character | null | undefined,
): Component[] {
  const hidden = new Set(character?.sheetHiddenComponentIds ?? []);
  const layoutOverrides = character?.componentLayoutOverrides ?? {};
  const dataPatches = character?.componentScriptDataPatches ?? {};

  const templateVisible = templateComponents.filter((c) => !hidden.has(c.id));

  const mergedTemplate: Component[] = templateVisible.map((c) => {
    const layout = layoutOverrides[c.id];
    const dataPatch = dataPatches[c.id];
    let next: Component = c;
    if (layout && Object.keys(layout).length > 0) {
      next = { ...next, ...layout };
    }
    if (dataPatch != null && typeof dataPatch === 'object' && !Array.isArray(dataPatch)) {
      try {
        const base = JSON.parse(next.data ?? '{}') as Record<string, unknown>;
        const merged = { ...base, ...(dataPatch as Record<string, unknown>) };
        next = { ...next, data: JSON.stringify(merged) };
      } catch {
        /* keep row */
      }
    }
    return next;
  });

  const overlay = parseOverlay(characterWindow.scriptOverlayComponents);
  return [...mergedTemplate, ...overlay];
}
