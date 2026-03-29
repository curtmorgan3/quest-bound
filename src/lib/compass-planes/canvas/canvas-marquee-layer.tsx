import type { CSSProperties, PointerEventHandler } from 'react';

import { cn } from '@/lib/utils';

import type { CanvasAxisRect } from './marquee-hit-test';

export type CanvasMarqueePointerHandlers = {
  onPointerDown: PointerEventHandler<HTMLDivElement>;
  onPointerMove: PointerEventHandler<HTMLDivElement>;
  onPointerUp: PointerEventHandler<HTMLDivElement>;
  onPointerCancel: PointerEventHandler<HTMLDivElement>;
};

export interface CanvasMarqueeLayerProps {
  marqueeRect: CanvasAxisRect | null;
  handlers: CanvasMarqueePointerHandlers;
  className?: string;
  /** Hit target sits below items; preview draws above with `pointer-events: none`. */
  previewStyle?: CSSProperties;
}

/**
 * Full-bleed hit layer for marquee selection plus an optional dashed preview rect.
 * Place the hit `div` under interactive canvas items (`z-index` lower than nodes).
 */
export function CanvasMarqueeLayer({
  marqueeRect,
  handlers,
  className,
  previewStyle,
}: CanvasMarqueeLayerProps) {
  return (
    <>
      <div
        role='presentation'
        className={cn('absolute inset-0 touch-none', className)}
        style={{ touchAction: 'none' }}
        {...handlers}
      />
      {marqueeRect != null ? (
        <div
          aria-hidden
          className='border-primary/80 bg-primary/15 pointer-events-none absolute border border-dashed'
          style={{
            left: marqueeRect.x,
            top: marqueeRect.y,
            width: marqueeRect.width,
            height: marqueeRect.height,
            zIndex: 50,
            ...previewStyle,
          }}
        />
      ) : null}
    </>
  );
}
