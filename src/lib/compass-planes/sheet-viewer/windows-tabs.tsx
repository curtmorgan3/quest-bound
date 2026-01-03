import type { Window } from '@/types';

interface WindowsTabsProps {
  windows: Window[];
  toggleWindow: (id: string) => void;
  openWindows: Set<string>;
}

export const WindowsTabs = ({ windows, toggleWindow, openWindows }: WindowsTabsProps) => {
  return (
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
      {windows.map((window) => (
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
  );
};
