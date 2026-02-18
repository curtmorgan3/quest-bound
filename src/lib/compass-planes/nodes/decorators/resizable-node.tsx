import type { Component } from '@/types';
import { NodeResizer, useKeyPress, useReactFlow } from '@xyflow/react';
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
  const reactFlow = useReactFlow();
  const nodes = reactFlow.getNodes();
  const selected = nodes.some((node) => node.id === component?.id && node.selected) || false;

  const keepAspectRatio = useKeyPress('Shift');

  const componentType = componentTypes.find(
    (componentType) => componentType.type === component?.type,
  );

  return (
    <div
      className={`${(component?.locked ?? props?.locked) ? 'nodrag' : className}`}
      style={{
        transform: `rotate(${component?.rotation ?? 0}deg)`,
      }}>
      {!disabled && (
        <NodeResizer
          key={`${component?.locked}`}
          color={component?.locked ? '#E66A3C' : '#417090'}
          isVisible={selected}
          keepAspectRatio={keepAspectRatio}
          handleClassName={component?.locked || component?.rotation !== 0 ? 'hidden' : undefined}
          shouldResize={() => !component?.locked && component?.rotation === 0}
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
