import { useRef, useState } from 'react';

import { clientToCanvas } from '../canvas/client-to-canvas';

const MIN_SIZE = 48;
const HANDLE_PX = 12;

type SpikeDrag = {
  kind: 'move' | 'resize-br';
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  startW: number;
  startH: number;
};

export interface CanvasPointerSpikeProps {
  /** `#base-editor` (or equivalent) — used to map client coordinates to canvas-local space */
  containerRef: React.RefObject<HTMLElement | null>;
}

/**
 * Phase 0 spike: pointer-based drag + one resize handle (bottom-right) on a dummy box.
 * Validates interaction inside `#base-editor` before React Flow is removed.
 */
export function CanvasPointerSpike({ containerRef }: CanvasPointerSpikeProps) {
  const [x, setX] = useState(56);
  const [y, setY] = useState(56);
  const [w, setW] = useState(128);
  const [h, setH] = useState(96);

  const dragRef = useRef<SpikeDrag | null>(null);

  const toLocal = (clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return { lx: clientX, ly: clientY };
    const { x, y } = clientToCanvas(clientX, clientY, el);
    return { lx: x, ly: y };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.target as HTMLElement;
    const isResize = target.closest('[data-canvas-spike-resize-br]') != null;
    dragRef.current = {
      kind: isResize ? 'resize-br' : 'move',
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: x,
      startY: y,
      startW: w,
      startH: h,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;

    const cur = toLocal(e.clientX, e.clientY);
    const origin = toLocal(d.startClientX, d.startClientY);
    const dx = cur.lx - origin.lx;
    const dy = cur.ly - origin.ly;

    if (d.kind === 'move') {
      setX(d.startX + dx);
      setY(d.startY + dy);
    } else {
      setW(Math.max(MIN_SIZE, d.startW + dx));
      setH(Math.max(MIN_SIZE, d.startH + dy));
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const onPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  return (
    <div
      className='pointer-events-auto border-primary/60 bg-muted/80 text-muted-foreground rounded-md border border-dashed shadow-sm'
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        zIndex: 1,
        touchAction: 'none',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        lineHeight: 1.2,
        padding: 4,
        boxSizing: 'border-box',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}>
      <span className='text-center'>Canvas spike (Phase 0)</span>
      <span className='text-center opacity-70'>drag · corner resize</span>
      <div
        data-canvas-spike-resize-br
        aria-label='Resize'
        className='bg-primary absolute rounded-sm border border-background'
        style={{
          right: -HANDLE_PX / 2,
          bottom: -HANDLE_PX / 2,
          width: HANDLE_PX,
          height: HANDLE_PX,
          cursor: 'nwse-resize',
          touchAction: 'none',
        }}
      />
    </div>
  );
}
