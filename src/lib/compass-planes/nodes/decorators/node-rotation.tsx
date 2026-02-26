import type { Component } from '@/types';
import { type CSSProperties, type ReactNode } from 'react';
import { useComponentPosition } from '../../utils';

interface NodeRotation {
  children: ReactNode;
  component: Component;
  style?: CSSProperties;
}

export const NodeRotation = ({ children, component }: NodeRotation) => {
  const pos = useComponentPosition(component);

  return (
    <div
      style={{
        transform: `rotate(${pos.rotation}deg)`,
        zIndex: pos.z,
      }}>
      {children}
    </div>
  );
};
