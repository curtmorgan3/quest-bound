import type { CSSProperties } from 'react';

import { cn } from '@/lib/utils';

import { DEFAULT_GRID_SIZE } from '../editor-config';

export interface CanvasGridBackgroundProps {
  /** Pixel gap between grid lines (matches React Flow `Background` gap). */
  gridSize?: number;
  className?: string;
  style?: CSSProperties;
  /** Extra classes for line color (uses `currentColor` in gradients). */
  lineClassName?: string;
}

/**
 * CSS-only line grid for the native canvas shell (replaces `@xyflow/react` `Background` lines).
 */
export function CanvasGridBackground({
  gridSize = DEFAULT_GRID_SIZE,
  className,
  style,
  lineClassName = 'text-border/35',
}: CanvasGridBackgroundProps) {
  const g = gridSize;
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0', lineClassName, className)}
      style={{
        backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
        backgroundSize: `${g}px ${g}px`,
        ...style,
      }}
    />
  );
}
