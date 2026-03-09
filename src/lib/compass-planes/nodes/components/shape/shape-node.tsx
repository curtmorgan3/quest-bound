import { WindowEditorContext } from '@/stores';
import type { Component, ShapeComponentData } from '@/types';
import { useNodeId } from '@xyflow/react';
import { memo, useContext } from 'react';
import {
  getBackgroundStyle,
  getComponentData,
  getSolidFallback,
  useComponentStyles,
} from '@/lib/compass-planes/utils';
import { ResizableNode } from '../../decorators';

export const EditShapeNode = () => {
  const { getComponent } = useContext(WindowEditorContext);

  const id = useNodeId();
  if (!id) return null;
  const component = getComponent(id);

  if (!component) return null;
  return (
    <ResizableNode component={component}>
      <ViewShapeNode component={component} />
    </ResizableNode>
  );
};

const ViewShapeNodeComponent = ({ component }: { component: Component }) => {
  const data = getComponentData(component) as ShapeComponentData;
  const css = useComponentStyles(component);
  const outlineWidth = Math.max(0, css.outlineWidth);
  const numSides = data.sides ?? 4;

  const bgStyle = getBackgroundStyle(css);

  // For rectangles, support irregular shapes
  if (numSides === 4) {
    return (
      <div
        style={{
          height: `${component.height}px`,
          width: `${component.width}px`,
          ...css,
          ...bgStyle,
        }}
      />
    );
  }

  // For polygons: SVG fill needs solid color; use gradient via div+clip-path when gradient
  const bg = (css as { background?: string }).background ?? css.backgroundColor;
  if (bg?.startsWith('linear-gradient')) {
    const clipPath = getPolygonClipPath(numSides);
    return (
      <div
        style={{
          height: `${component.height}px`,
          width: `${component.width}px`,
          background: bg,
          clipPath,
          WebkitClipPath: clipPath,
        }}
      />
    );
  }

  return (
    <Polygon
      key={JSON.stringify(css)}
      sides={numSides}
      diameter={component.width}
      color={getSolidFallback(css.backgroundColor) ?? 'transparent'}
      outlineWidth={outlineWidth}
      outlineColor={css.outlineColor}
      opacity={css.opacity}
    />
  );
};

function getPolygonClipPath(sides: number): string {
  const points = Array.from({ length: sides }, (_, i) => {
    const angle = (2 * Math.PI * i) / sides - Math.PI / 2;
    const x = 50 + 50 * Math.cos(angle);
    const y = 50 + 50 * Math.sin(angle);
    return `${x}% ${y}%`;
  });
  return `polygon(${points.join(', ')})`;
}

export const ViewShapeNode = memo(
  ViewShapeNodeComponent,
  (prev, next) => prev.component === next.component,
);

const Polygon = ({
  sides,
  diameter,
  color,
  outlineWidth = 0,
  outlineColor,
  className,
  opacity = 1,
}: {
  sides: number;
  diameter: number;
  color: string;
  outlineWidth?: number;
  outlineColor?: string;
  className?: string;
  opacity?: number;
}) => {
  const angle = (2 * Math.PI) / sides;

  const getPoints = (radius: number) => {
    const points = Array.from({ length: sides }, (_, i) => {
      const currAngle = i * angle - Math.PI / 2;
      return [radius + radius * Math.cos(currAngle), radius + radius * Math.sin(currAngle)].join(
        ',',
      );
    }).join(' ');
    return points;
  };

  return (
    <svg
      viewBox={`0 0 ${diameter} ${diameter}`}
      style={{ overflow: 'visible', width: diameter }}
      className={className}>
      <polygon
        vectorEffect='non-scaling-stroke'
        points={getPoints(diameter / 2)}
        fill={color}
        stroke={outlineColor}
        opacity={opacity}
        strokeWidth={`${outlineWidth}px`}
      />
    </svg>
  );
};
