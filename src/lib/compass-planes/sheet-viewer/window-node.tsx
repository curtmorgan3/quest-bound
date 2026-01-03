import { useComponents } from '@/lib/compass-api';
import { colorPaper } from '@/palette';
import type { Window } from '@/types';
import '@xyflow/react/dist/style.css';
import { OctagonX } from 'lucide-react';
import { useMemo } from 'react';
import { renderViewComponent } from '../nodes';

interface WindowNodeData {
  window: Window;
  onClose: (id: string) => void;
  renderCloseButton: boolean;
}

export const WindowNode = ({ data }: { data: WindowNodeData }) => {
  const { window, onClose, renderCloseButton } = data;
  const { components } = useComponents(window.id);

  // Calculate offsets based on leftmost and topmost components
  const minX = useMemo(() => {
    if (components.length === 0) return 0;
    return Math.min(...components.map((c) => c.x));
  }, [components]);

  const minY = useMemo(() => {
    if (components.length === 0) return 0;
    return Math.min(...components.map((c) => c.y));
  }, [components]);

  // Calculate window size based on components (adjusted for offsets)
  const windowWidth = useMemo(() => {
    if (components.length === 0) return 400;
    const maxX = Math.max(...components.map((c) => c.x + c.width));
    const adjustedMaxX = maxX - minX;
    return adjustedMaxX;
  }, [components, minX]);

  const windowHeight = useMemo(() => {
    if (components.length === 0) return 300;
    return Math.max(...components.map((c) => c.y - minY + c.height));
  }, [components, minY]);

  return (
    <div
      className='window-node'
      style={{
        width: windowWidth,
        height: renderCloseButton ? windowHeight + 20 : windowHeight,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}>
      {renderCloseButton && (
        <div
          style={{
            height: '20px',
            width: '100%',
            backgroundColor: colorPaper,
            borderRadius: '8px 8px 0 0',
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '0 4px 0 4px',
          }}>
          <OctagonX
            style={{ width: '20px', height: '20px' }}
            className='clickable'
            onClick={() => onClose(window.id)}
          />
        </div>
      )}
      <div
        style={{
          position: 'relative',
          flex: 1,
          width: '100%',
          height: windowHeight,
        }}>
        {components.map((component) => (
          <div
            key={component.id}
            style={{
              position: 'absolute',
              left: component.x - minX,
              top: component.y - minY,
              width: component.width,
              height: component.height,
              zIndex: component.z,
              transform: `rotate(${component.rotation}deg)`,
            }}>
            {renderViewComponent(component)}
          </div>
        ))}
      </div>
    </div>
  );
};
