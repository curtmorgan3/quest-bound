import { colorPrimary } from '@/palette';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const HIGHLIGHT_Z_INDEX = 4000;
const PADDING = 4;

interface OnboardingHighlightProps {
  selector: string | undefined;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function getRectsForSelector(selector: string): Rect[] {
  try {
    const elements = document.querySelectorAll(selector);
    return Array.from(elements).map((el) => {
      const rect = el.getBoundingClientRect();
      return {
        top: rect.top - PADDING,
        left: rect.left - PADDING,
        width: rect.width + PADDING * 2,
        height: rect.height + PADDING * 2,
      };
    });
  } catch {
    return [];
  }
}

export function OnboardingHighlight({ selector }: OnboardingHighlightProps) {
  const [rects, setRects] = useState<Rect[]>([]);

  useEffect(() => {
    if (!selector?.trim()) {
      setRects([]);
      return;
    }

    const update = () => setRects(getRectsForSelector(selector));
    update();

    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    const observer = new ResizeObserver(update);
    observer.observe(document.body);

    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
      observer.disconnect();
    };
  }, [selector]);

  if (rects.length === 0) return null;

  const highlight = (
    <div
      className='onboarding-highlight-layer'
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: HIGHLIGHT_Z_INDEX,
        pointerEvents: 'none',
      }}
      aria-hidden>
      {rects.map((r, i) => (
        <div
          key={i}
          className='onboarding-highlight-box'
          style={{
            position: 'fixed',
            top: r.top,
            left: r.left,
            width: r.width,
            height: r.height,
            borderRadius: '6px',
            backgroundColor: colorPrimary,
            boxShadow: '0 0 0 2px hsl(var(--primary))',
            transition:
              'top 0.3s ease-out, left 0.3s ease-out, width 0.3s ease-out, height 0.3s ease-out',
          }}
        />
      ))}
    </div>
  );

  return createPortal(highlight, document.body);
}
