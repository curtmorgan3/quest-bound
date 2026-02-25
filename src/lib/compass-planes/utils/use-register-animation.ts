import { useLayoutEffect, useRef, useState } from 'react';
import type { AttributeChangeDiff } from './use-attribute-changed-by-script';
import { useAttributeChangedByScript } from './use-attribute-changed-by-script';

const FLASH_DURATION_MS = 400;

export type UseRegisterAnimationResult = {
  /** Use as key on the animated element so it remounts and the CSS animation runs again each time. */
  flashKey: number;
  /** True while the flash is active. Apply className "script-change-flash" when true. */
  scriptChangeFlash: boolean;
  /** Diff for the current flash (when scriptChangeFlash is true). Use to render floating label. */
  displayDiff: AttributeChangeDiff<string | number | boolean> | null;
};

/**
 * Formats the script-change diff for the floating label: numbers show delta (+N / -N), text/boolean show new value.
 */
export function formatScriptChangeDisplay(
  diff: AttributeChangeDiff<string | number | boolean>,
): string {
  const { from, to } = diff;
  if (typeof to === 'number' && (from === undefined || typeof from === 'number')) {
    const delta = (to as number) - ((from as number | undefined) ?? 0);
    if (delta > 0) return `+${delta}`;
    if (delta < 0) return `${delta}`;
    return '0';
  }
  if (typeof to === 'boolean') return to ? 'true' : 'false';
  return String(to ?? '');
}

/**
 * Registers the component for script-change animation. Calls useAttributeChangedByScript,
 * holds the effect that triggers the flash, and returns flashKey + scriptChangeFlash + displayDiff
 * so the component can re-render, run the CSS animation, and show a floating diff/value label.
 */
export function useRegisterAnimation(
  characterId: string,
  attributeId: string,
  currentVal: string | number | boolean,
): UseRegisterAnimationResult {
  const { changedByScript, clearModified, diff } = useAttributeChangedByScript(
    characterId,
    attributeId,
    currentVal,
  );

  const [scriptChangeFlash, setScriptChangeFlash] = useState(false);
  const [displayDiff, setDisplayDiff] = useState<AttributeChangeDiff<
    string | number | boolean
  > | null>(null);
  const [flashKey, setFlashKey] = useState(0);
  const requestFlashRef = useRef(false);
  const pendingDiffRef = useRef<AttributeChangeDiff<string | number | boolean> | null>(null);

  if (changedByScript && diff) {
    requestFlashRef.current = true;
    pendingDiffRef.current = diff;
  }

  useLayoutEffect(() => {
    if (requestFlashRef.current) {
      requestFlashRef.current = false;
      clearModified();
      setDisplayDiff(pendingDiffRef.current);
      pendingDiffRef.current = null;
      setFlashKey((k) => k + 1);
      setScriptChangeFlash(true);
      const t = setTimeout(() => {
        setScriptChangeFlash(false);
        setDisplayDiff(null);
      }, FLASH_DURATION_MS);
      return () => clearTimeout(t);
    }
  });

  return { flashKey, scriptChangeFlash, displayDiff };
}
