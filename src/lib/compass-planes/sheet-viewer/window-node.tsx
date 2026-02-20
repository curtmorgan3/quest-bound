import { useComponents } from '@/lib/compass-api';
import { CharacterContext } from '@/stores';
import '@xyflow/react/dist/style.css';
import { ExternalLink, OctagonMinus, OctagonX } from 'lucide-react';
import { useCallback, useContext, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { renderViewComponent } from '../nodes';

/** Minimal window shape shared by CharacterWindow and RulesetWindow. */
export interface WindowNodeWindow {
  id: string;
  windowId: string;
  title: string;
  x: number;
  y: number;
  isCollapsed: boolean;
}

export interface WindowNodeData {
  window: WindowNodeWindow;
  onClose?: (id: string) => void;
  onMinimize?: (id: string) => void;
  onChildWindowClick: (childWindowId: string, parentWindow: { x: number; y: number }) => void;
  locked: boolean;
  /** When set, a link to this path is shown on hover next to the close button (e.g. page-editor). */
  editWindowHref?: string;
}

export const WindowNode = ({ data }: { data: WindowNodeData }) => {
  const characterContext = useContext(CharacterContext);
  const {
    window: windowData,
    onClose,
    onMinimize,
    onChildWindowClick,
    locked,
    editWindowHref,
  } = data;
  const { components } = useComponents(windowData.windowId);

  const handleChildWindowClick = useCallback(
    (childWindowId: string) => {
      onChildWindowClick(childWindowId, { x: windowData.x, y: windowData.y });
    },
    [onChildWindowClick, windowData.x, windowData.y],
  );

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

  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className='window-node'
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: windowWidth,
        height: windowHeight,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}>
      {!locked && (
        <div
          style={{
            height: '20px',
            position: 'absolute',
            right: 0,
            top: -22,
            zIndex: 1000,
            backgroundColor: 'transparent',
            borderRadius: '8px 8px 0 0',
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '0 4px 0 4px',
            gap: '8px',
            opacity: isHovered && !locked ? 1 : 0,
            transition: 'opacity 0.15s ease-in-out',
          }}>
          {!!onMinimize && (
            <OctagonMinus
              style={{ width: '20px', height: '20px' }}
              className='clickable'
              onClick={() => onMinimize(windowData.id)}
            />
          )}
          {editWindowHref && (
            <Link
              to={editWindowHref}
              className='clickable flex items-center justify-center text-inherit hover:opacity-80'
              style={{ width: '20px', height: '20px' }}
              title='Edit window'
              onClick={(e) => e.stopPropagation()}>
              <ExternalLink style={{ width: '14px', height: '14px' }} />
            </Link>
          )}
          {!!onClose && (
            <OctagonX
              style={{ width: '20px', height: '20px' }}
              className='clickable'
              onClick={() => onClose(windowData.id)}
            />
          )}
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
              cursor: component.childWindowId ? 'pointer' : undefined,
            }}
            onClick={
              component.childWindowId
                ? (e) => {
                    e.stopPropagation();
                    handleChildWindowClick(component.childWindowId!);
                  }
                : undefined
            }>
            {renderViewComponent(component, characterContext?.characterAttributes)}
          </div>
        ))}
      </div>
    </div>
  );
};
