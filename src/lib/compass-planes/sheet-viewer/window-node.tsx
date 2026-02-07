import { useCharacterWindows, useComponents, useWindows } from '@/lib/compass-api';
import { colorPaper } from '@/palette';
import { CharacterContext } from '@/stores';
import type { CharacterWindow } from '@/types';
import '@xyflow/react/dist/style.css';
import { OctagonMinus, OctagonX } from 'lucide-react';
import { useCallback, useContext, useMemo, useState } from 'react';
import { renderViewComponent } from '../nodes';

interface WindowNodeData {
  characterWindow: CharacterWindow;
  onClose: (id: string) => void;
  onMinimize: (id: string) => void;
  locked: boolean;
}

export const WindowNode = ({ data }: { data: WindowNodeData }) => {
  const characterContext = useContext(CharacterContext);
  const { characterWindow, onClose, onMinimize, locked } = data;
  const { components } = useComponents(characterWindow.windowId);
  const { windows: rulesetWindows } = useWindows();
  const {
    windows: characterWindowsList,
    createCharacterWindow,
    deleteCharacterWindow,
  } = useCharacterWindows(characterWindow.characterId);

  const handleChildWindowClick = useCallback(
    (childWindowId: string) => {
      const existing = characterWindowsList.find((cw) => cw.windowId === childWindowId);
      if (existing) {
        deleteCharacterWindow(existing.id);
        return;
      }
      const childWindow = rulesetWindows.find((w) => w.id === childWindowId);
      if (!childWindow) return;

      createCharacterWindow({
        windowId: childWindowId,
        characterId: characterContext?.character?.id,
        characterPageId: data.characterWindow.characterPageId,
        title: childWindow.title,
        x: data.characterWindow.x + 200,
        y: data.characterWindow.y + 150,
        isCollapsed: false,
      });
    },
    [characterWindowsList, rulesetWindows, createCharacterWindow, deleteCharacterWindow],
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
            width: '100%',
            position: 'absolute',
            zIndex: 1000,
            backgroundColor: colorPaper,
            borderRadius: '8px 8px 0 0',
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '0 4px 0 4px',
            gap: '8px',
            opacity: isHovered && !locked ? 1 : 0,
            transition: 'opacity 0.15s ease-in-out',
          }}>
          <OctagonMinus
            style={{ width: '20px', height: '20px' }}
            className='clickable'
            onClick={() => onMinimize(characterWindow.id)}
          />
          <OctagonX
            style={{ width: '20px', height: '20px' }}
            className='clickable'
            onClick={() => onClose(characterWindow.id)}
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
