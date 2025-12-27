import { WindowEditorContext } from '@/stores';
import type { Component } from '@/types';
import { useNodeId } from '@xyflow/react';
import { useContext } from 'react';
import { getComponentData, getComponentStyles } from '../../../utils';
import { ResizableNode } from '../../decorators';

export const ShapeNode = () => {
  const { getComponent } = useContext(WindowEditorContext);

  const id = useNodeId();
  if (!id) return null;
  const component = getComponent(id);

  if (!component) return null;
  return (
    <ResizableNode component={component}>
      <PrimitiveShapeNode
        component={{ ...component, height: component.height, width: component.width }}
      />
    </ResizableNode>
  );
};

export const PrimitiveShapeNode = ({ component }: { component: Component }) => {
  const data = getComponentData(component);
  const css = getComponentStyles(component);
  const outlineWidth = Math.max(0, css.outlineWidth);
  const numSides = data.sides ?? 4;

  // For rectangles, support irregular shapes
  if (numSides === 4) {
    return (
      <div
        style={{
          height: `${component.height}px`,
          width: `${component.width}px`,
          zIndex: component.z,
          backgroundColor: css.color,
          ...css,
        }}
      />
    );
  }

  return (
    <Polygon
      key={JSON.stringify(css)}
      sides={numSides}
      diameter={component.width}
      color={css.color}
      outlineWidth={outlineWidth}
      outlineColor={css.outlineColor}
      opacity={css.opacity}
    />
  );
};

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
