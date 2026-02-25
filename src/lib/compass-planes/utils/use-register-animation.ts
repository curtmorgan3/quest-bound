import { useEffect, useRef, useState } from 'react';
import { useAttributeChangedByScript } from './use-attribute-changed-by-script';

const FLASH_DURATION_MS = 800;

function formatScriptChangeDisplay(
  from: string | number | boolean | undefined,
  to: string | number | boolean,
): string {
  if (typeof to === 'number' && (from === undefined || typeof from === 'number')) {
    const fromNum = from !== undefined ? (from as number) : 0;
    const delta = to - fromNum;
    if (delta > 0) return `+${delta}`;
    if (delta < 0) return `${delta}`;
    return '0';
  }
  if (typeof to === 'boolean') return to ? 'true' : 'false';
  return String(to ?? '');
}

export type UseRegisterAnimationResult = {
  /** Use as key on the animated element so it remounts and the CSS animation runs again each time. */
  flashKey: number;
  /** True while the flash is active. Apply className "script-change-flash" when true. */
  scriptChangeFlash: boolean;
  diff: string;
};

/**
 * Registers the component for script-change animation. Calls useAttributeChangedByScript,
 * holds the effect that triggers the flash, and returns flashKey + scriptChangeFlash.
 */
export function useRegisterAnimation(
  characterId: string,
  attributeId: string,
  currentVal: string | number | boolean,
  shouldAnimate: boolean,
): UseRegisterAnimationResult {
  const { changedByScript, clearModified } = useAttributeChangedByScript(
    characterId,
    attributeId,
    currentVal,
  );

  const [scriptChangeFlash, setScriptChangeFlash] = useState(false);
  const [flashKey, setFlashKey] = useState(0);
  const requestFlashRef = useRef(false);

  if (changedByScript) {
    requestFlashRef.current = true;
  }

  const prevValue = useRef(currentVal);
  const [diff, setDiff] = useState<string>('');

  useEffect(() => {
    if (requestFlashRef.current) {
      requestFlashRef.current = false;
      clearModified();
      setFlashKey((k) => k + 1);
      setScriptChangeFlash(true);

      if (shouldAnimate) {
        setDiff(formatScriptChangeDisplay(prevValue.current, currentVal));
        prevValue.current = currentVal;
      }

      const t = setTimeout(() => {
        setDiff('');
        setScriptChangeFlash(false);
      }, FLASH_DURATION_MS);
      return () => clearTimeout(t);
    }
  }, [currentVal]);

  return { flashKey, scriptChangeFlash, diff };
}
