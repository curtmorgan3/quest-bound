import { useEffect, useRef } from 'react';
import { useFonts } from './use-fonts';

/**
 * Returns a value safe to pass to `url(...)` in {@link FontFace}, or null.
 * Guards against null/undefined (template coerces to "null" → relative URL
 * `/characters/null` when the document is under `/characters/:id`).
 */
export function fontDataToAbsoluteOrDataUrl(data: unknown): string | null {
  if (data == null) return null;
  if (typeof data !== 'string') return null;
  const t = data.trim();
  if (!t || t === 'null' || t === 'undefined') return null;
  if (
    t.startsWith('data:') ||
    t.startsWith('blob:') ||
    t.startsWith('/') ||
    /^https?:\/\//i.test(t)
  ) {
    return t;
  }
  return null;
}

/**
 * Hook that loads ruleset fonts into the browser's FontFace API
 * so they can be used in CSS font-family declarations.
 */
export const useFontLoader = (rulesetId?: string) => {
  const { fonts } = useFonts(rulesetId);
  const loadedFontsRef = useRef<Map<string, FontFace>>(new Map());

  useEffect(() => {
    const loadFonts = async () => {
      const currentFontIds = new Set(fonts.map((f) => f.id));

      // Remove fonts that are no longer in the ruleset
      for (const [fontId, fontFace] of loadedFontsRef.current.entries()) {
        if (!currentFontIds.has(fontId)) {
          document.fonts.delete(fontFace);
          loadedFontsRef.current.delete(fontId);
        }
      }

      // Load new fonts
      for (const font of fonts) {
        if (!loadedFontsRef.current.has(font.id)) {
          const source = fontDataToAbsoluteOrDataUrl(font.data);
          if (!source) {
            console.warn(
              `Skipped font "${font.label}" (${font.id}): missing or invalid data (expected data URL, blob URL, or absolute http(s) or / path).`,
            );
            continue;
          }
          try {
            const fontFace = new FontFace(font.label, `url(${source})`);
            await fontFace.load();
            document.fonts.add(fontFace);
            loadedFontsRef.current.set(font.id, fontFace);
          } catch (error) {
            console.error(`Failed to load font "${font.label}":`, error);
          }
        }
      }
    };

    loadFonts();

    // Cleanup function to remove fonts when component unmounts or rulesetId changes
    return () => {
      for (const fontFace of loadedFontsRef.current.values()) {
        document.fonts.delete(fontFace);
      }
      loadedFontsRef.current.clear();
    };
  }, [fonts, rulesetId]);

  return { loadedFonts: fonts };
};
