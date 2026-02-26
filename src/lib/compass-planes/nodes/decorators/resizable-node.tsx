import type { Component } from '@/types';
import { NodeResizer, useKeyPress, useNodeId, useReactFlow } from '@xyflow/react';
import { useComponentPosition } from '../../utils';
import { componentTypes } from '../constants';

type OverrideProps = {
  height?: number;
  width?: number;
  rotation?: number;
  locked?: boolean;
  streamMode?: boolean;
};

interface ResizableNodeSelectedProps {
  children: React.ReactNode;
  component?: Component;
  disabled?: boolean;
  props?: OverrideProps;
  className?: string;
}

export const ResizableNode = ({
  children,
  component,
  disabled = false,
  props,
  className,
}: ResizableNodeSelectedProps) => {
  const nodeId = useNodeId();
  const reactFlow = useReactFlow();
  const selected =
    nodeId != null ? Boolean(reactFlow.getNode(nodeId)?.selected) : false;
  const pos = useComponentPosition(component);

  const keepAspectRatio = useKeyPress('Shift');

  const componentType = componentTypes.find(
    (componentType) => componentType.type === component?.type,
  );

  return (
    <div
      className={`${(component?.locked ?? props?.locked) ? 'nodrag' : className}`}
      style={{
        transform: `rotate(${pos.rotation}deg)`,
        zIndex: pos.z,
      }}>
      {!disabled && (
        <NodeResizer
          key={`${component?.locked}`}
          color={component?.locked ? '#E66A3C' : '#417090'}
          isVisible={selected}
          keepAspectRatio={keepAspectRatio}
          handleClassName={component?.locked || pos?.rotation !== 0 ? 'hidden' : undefined}
          shouldResize={() => !component?.locked && pos?.rotation === 0}
          minWidth={componentType?.minWidth ?? props?.width ?? 0}
          minHeight={componentType?.minHeight ?? props?.height ?? 0}
          maxHeight={componentType?.maxHeight ?? 0}
          maxWidth={componentType?.maxWidth ?? 0}
        />
      )}
      {children}
    </div>
  );
};
