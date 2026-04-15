import { useEffect, useRef } from 'react';
import { useFonts } from './use-fonts';

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
          try {
            const fontFace = new FontFace(font.label, `url(${font.data})`);
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
