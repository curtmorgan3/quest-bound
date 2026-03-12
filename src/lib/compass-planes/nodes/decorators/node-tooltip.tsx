import { useAttributes } from '@/lib/compass-api';
import { cn } from '@/lib/utils';
import type { Component, ComponentData } from '@/types';
import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import Markdown from 'react-markdown';
import { createPortal } from 'react-dom';
import { getComponentData } from '../../utils/node-conversion';

const GAP = 8;

type Placement = NonNullable<ComponentData['tooltipPlacement']>;

function getTooltipStyle(rect: DOMRect, placement: Placement): CSSProperties {
  const midX = rect.left + rect.width / 2;
  const midY = rect.top + rect.height / 2;

  switch (placement) {
    case 'top':
      return { bottom: window.innerHeight - rect.top + GAP, left: midX, transform: 'translateX(-50%)' };
    case 'bottom':
      return { top: rect.bottom + GAP, left: midX, transform: 'translateX(-50%)' };
    case 'left':
      return { top: midY, right: window.innerWidth - rect.left + GAP, transform: 'translateY(-50%)' };
    case 'right':
      return { top: midY, left: rect.right + GAP, transform: 'translateY(-50%)' };
  }
}

interface NodeTooltipProps {
  children: ReactNode;
  component: Component;
  componentData?: ComponentData;
}

export const NodeTooltip = ({
  children,
  component,
  componentData,
}: NodeTooltipProps) => {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [tooltipStyle, setTooltipStyle] = useState<CSSProperties | null>(null);
  const { attributes } = useAttributes();
  const data = componentData ?? getComponentData(component);

  const staticText = data.tooltipValue?.trim();
  const attributeDescription = data.tooltipAttributeId
    ? attributes.find((a) => a.id === data.tooltipAttributeId)?.description?.trim()
    : undefined;

  const tooltipContent = attributeDescription ?? staticText ?? '';

  if (!tooltipContent) {
    return <>{children}</>;
  }

  const placement = data.tooltipPlacement ?? 'top';

  const handleMouseEnter = () => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (rect) setTooltipStyle(getTooltipStyle(rect, placement));
  };

  const handleMouseLeave = () => setTooltipStyle(null);

  return (
    <div
      ref={anchorRef}
      style={{ display: 'block', width: '100%', height: '100%' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}>
      {children}
      {tooltipStyle &&
        createPortal(
          <div
            role='tooltip'
            style={{ ...tooltipStyle, position: 'fixed', zIndex: 99999 }}
            className={cn(
              'pointer-events-none w-max max-w-xs rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md md-content',
            )}>
            <Markdown>{tooltipContent}</Markdown>
          </div>,
          document.body,
        )}
    </div>
  );
};
