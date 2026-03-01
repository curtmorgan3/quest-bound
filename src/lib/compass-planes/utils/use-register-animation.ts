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
): UseRegisterAnimationResult {
  const { changedByScript, clearModified } = useAttributeChangedByScript(
    characterId,
    attributeId,
    currentVal,
  );

  const [scriptChangeFlash, setScriptChangeFlash] = useState(false);
  const [flashKey, setFlashKey] = useState(0);
  const requestFlashRef = useRef(false);

  /*
   changedByScript and currentValue present a timing issue in the useEffect. currentValue
   changes first and the diff isn't set because changedByScript is still false. changedByScript
   then fires and prevValue.current == currentVal, so the animation doesn't fire.

   Without conditioning on changedByScript, the animation works, but it will animate on manual changes. Might
   be a non-issue. 
   */

  if (changedByScript) {
    requestFlashRef.current = true;
  }

  const prevValue = useRef(currentVal);
  const [diff, setDiff] = useState<string>('');
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    //if (!requestFlashRef.current) return; // This line will cause stale downstream animations, but will prevent triggering on manual change

    // Only show diff when the value has actually changed. Downstream attributes (e.g. C)
    // can get changedByScript=true before Dexie has the new value; animating then would
    // show prevValue→oldVal (stale). Skip and leave modified flag set so we run again
    // when currentVal updates and show the correct diff.

    if (prevValue.current == currentVal) return; // lose equality for string to number comparison
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    requestFlashRef.current = false;
    clearModified();
    setFlashKey((k) => k + 1);
    setScriptChangeFlash(true);

    const newDiff = formatScriptChangeDisplay(prevValue.current, currentVal);
    setDiff(newDiff);
    prevValue.current = currentVal;

    flashTimeoutRef.current = setTimeout(() => {
      setDiff('');
      setScriptChangeFlash(false);
      flashTimeoutRef.current = null;
    }, FLASH_DURATION_MS);
  }, [currentVal, changedByScript]);

  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, []);

  return { flashKey, scriptChangeFlash, diff };
}
