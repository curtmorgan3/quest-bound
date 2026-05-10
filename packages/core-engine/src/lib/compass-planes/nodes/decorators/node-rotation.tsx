import { type CSSProperties, type ReactNode } from 'react';

interface NodeRotation {
  children: ReactNode;
  style?: CSSProperties;
  rotation?: number;
  z?: number;
  /** Optional `transition` CSS string for the transform property (driven by `comp.animate`). */
  transition?: string | null;
}

export const NodeRotation = ({ children, rotation = 0, z = 1, transition }: NodeRotation) => {
  return (
    <div
      style={{
        transform: `rotate(${rotation}deg)`,
        zIndex: z,
        ...(transition ? { transition } : {}),
      }}>
      {children}
    </div>
  );
};
