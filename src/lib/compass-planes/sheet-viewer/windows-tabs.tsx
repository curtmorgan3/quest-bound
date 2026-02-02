import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCharacterWindows, useWindows } from '@/lib/compass-api';
import { colorPrimary } from '@/palette';
import type { CharacterWindow, Window } from '@/types';
import { Lock, Plus } from 'lucide-react';
import { useState } from 'react';

interface WindowsTabsProps {
  characterId?: string;
  windows: CharacterWindow[];
  toggleWindow: (id: string) => void;
  openWindows: Set<string>;
  locked?: boolean;
  onToggleLock: () => void;
}

export const WindowsTabs = ({
  characterId,
  windows,
  toggleWindow,
  openWindows,
  locked = false,
  onToggleLock,
}: WindowsTabsProps) => {
  const { windows: rulesetWindows } = useWindows();
  const { createCharacterWindow } = useCharacterWindows(characterId);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const sortedRulesetWindows = [...rulesetWindows].sort((a, b) => a.title.localeCompare(b.title));
  const sortedWindows = [...windows].sort((a, b) => a.title.localeCompare(b.title));

  const handleCreateWindow = async (rulesetWindow: Window) => {
    if (!characterId) return;

    await createCharacterWindow({
      title: rulesetWindow.title,
      characterId,
      windowId: rulesetWindow.id,
      x: 100,
      y: 100,
      isCollapsed: false,
    });

    setIsModalOpen(false);
  };

  return (
    <>
      <div
        className='window-tabs'
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          gap: 8,
          padding: '8px',
          backgroundColor: '#2a2a2a',
          borderTop: '1px solid #333',
          overflowX: 'auto',
        }}>
        <button
          onClick={onToggleLock}
          style={{
            height: '30px',
            width: '30px',
            minWidth: '30px',
            backgroundColor: '#333',
            color: locked ? colorPrimary : '#fff',
            border: '1px solid #555',
            borderRadius: 4,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title='Add window'>
          <Lock size={16} />
        </button>
        {!locked && (
          <button
            onClick={() => setIsModalOpen(true)}
            style={{
              height: '30px',
              width: '30px',
              minWidth: '30px',
              backgroundColor: '#333',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: 4,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title='Add window'>
            <Plus size={16} />
          </button>
        )}
        {sortedWindows.map((window) => (
          <button
            key={window.id}
            onClick={() => toggleWindow(window.id)}
            style={{
              height: '30px',
              minWidth: '60px',
              backgroundColor: openWindows.has(window.id) ? '#444' : '#333',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: 4,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontSize: '0.7rem',
            }}>
            {window.title}
          </button>
        ))}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Window</DialogTitle>
          </DialogHeader>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              maxHeight: '400px',
              overflowY: 'auto',
            }}>
            {rulesetWindows.length === 0 ? (
              <p style={{ color: '#888', textAlign: 'center', padding: '16px' }}>
                No windows available in this ruleset.
              </p>
            ) : (
              sortedRulesetWindows.map((rulesetWindow) => (
                <button
                  key={rulesetWindow.id}
                  disabled={windows.some((cw) => cw.windowId === rulesetWindow.id)}
                  onClick={() => handleCreateWindow(rulesetWindow)}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: '#333',
                    color: '#fff',
                    border: '1px solid #555',
                    borderRadius: 4,
                    cursor: 'pointer',
                    textAlign: 'left',
                    opacity: windows.some((cw) => cw.windowId === rulesetWindow.id) ? 0.5 : 1,
                  }}>
                  {rulesetWindow.title}
                  {rulesetWindow.category && (
                    <span
                      style={{
                        color: '#888',
                        marginLeft: 8,
                        fontSize: '0.85em',
                      }}>
                      ({rulesetWindow.category})
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
