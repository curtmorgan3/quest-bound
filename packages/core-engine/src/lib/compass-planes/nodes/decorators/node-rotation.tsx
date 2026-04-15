import { type CSSProperties, type ReactNode } from 'react';

interface NodeRotation {
  children: ReactNode;
  style?: CSSProperties;
  rotation?: number;
  z?: number;
}

export const NodeRotation = ({ children, rotation = 0, z = 1 }: NodeRotation) => {
  return (
    <div
      style={{
        transform: `rotate(${rotation}deg)`,
        zIndex: z,
      }}>
      {children}
    </div>
  );
};
