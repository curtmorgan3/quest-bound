import { useComponents } from '@/lib/compass-api';
import { CharacterContext } from '@/stores';
import { ExternalLink, OctagonMinus, OctagonX } from 'lucide-react';
import { useCallback, useContext, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { renderViewComponent } from '../nodes';
import {
  buildEffectiveLayoutMap,
  componentByIdMap,
  worldTopLeftWithEffective,
} from '../sheet-editor/component-world-geometry';
import { useComponentPositionMap } from '../utils';
import { WindowRuntimeProvider } from './window-runtime-context';

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
  const positionMap = useComponentPositionMap(components);

  const byId = useMemo(() => componentByIdMap(components), [components]);
  const effectiveLayout = useMemo(
    () => buildEffectiveLayoutMap(components, {}, null),
    [components],
  );

  const handleChildWindowClick = useCallback(
    (childWindowId: string) => {
      onChildWindowClick(childWindowId, { x: windowData.x, y: windowData.y });
    },
    [onChildWindowClick, windowData.x, windowData.y],
  );

  const { minX, minY, windowWidth, windowHeight } = useMemo(() => {
    if (components.length === 0) {
      return { minX: 0, minY: 0, windowWidth: 400, windowHeight: 300 };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxR = -Infinity;
    let maxB = -Infinity;
    for (const c of components) {
      const eff = effectiveLayout.get(c.id);
      if (!eff) continue;
      const tl = worldTopLeftWithEffective(c, byId, effectiveLayout);
      minX = Math.min(minX, tl.x);
      minY = Math.min(minY, tl.y);
      maxR = Math.max(maxR, tl.x + eff.width);
      maxB = Math.max(maxB, tl.y + eff.height);
    }
    if (!Number.isFinite(minX)) {
      return { minX: 0, minY: 0, windowWidth: 400, windowHeight: 300 };
    }
    return {
      minX,
      minY,
      windowWidth: Math.max(0, maxR - minX),
      windowHeight: Math.max(0, maxB - minY),
    };
  }, [byId, components, effectiveLayout]);

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
        <WindowRuntimeProvider
          value={
            'characterId' in windowData
              ? {}
              : {
                  openRulesetChildWindow: (childWindowId: string) =>
                    handleChildWindowClick(childWindowId),
                }
          }>
          {components.map((component) => {
            const pos = positionMap.get(component.id);
            const eff = effectiveLayout.get(component.id)!;
            const tl = worldTopLeftWithEffective(component, byId, effectiveLayout);
            return (
              <div
                key={component.id}
                style={{
                  position: 'absolute',
                  left: tl.x - minX,
                  top: tl.y - minY,
                  width: eff.width,
                  height: eff.height,
                  zIndex: pos?.z ?? component.z,
                }}>
                {renderViewComponent(component, characterContext?.characterAttributes, pos)}
              </div>
            );
          })}
        </WindowRuntimeProvider>
      </div>
    </div>
  );
};
