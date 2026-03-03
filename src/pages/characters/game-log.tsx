import { Button } from '@/components/ui/button';
import { useScriptLogs } from '@/lib/compass-api';
import { format } from 'date-fns';
import { CircleOff, ScrollText, X } from 'lucide-react';
import { useState } from 'react';

const GAME_LOG_LIMIT = 200;

interface GameLogProps {
  className?: string;
  /** When set, clear only resets the view for this character (no delete); only last N logs after reset are shown. */
  characterId?: string;
}

export const GameLog = ({ className, characterId }: GameLogProps) => {
  const { logs: scriptLogs, clearLogs } = useScriptLogs(
    GAME_LOG_LIMIT,
    undefined,
    undefined,
    characterId,
  );
  const [open, setOpen] = useState(false);

  const logs: { msg: string; time: string }[] = [...scriptLogs]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .map((l) => {
      const logArray = JSON.parse(l.argsJson) as any[];
      return {
        msg: logArray.join(', '),
        time: format(new Date(l.timestamp), 'MM/dd HH:mm'),
      };
    })
    .filter((log) => !!log.msg);

  return (
    <>
      <Button
        variant='ghost'
        size='icon'
        onClick={() => setOpen((o) => !o)}
        aria-label='Toggle game log'
        className={`${className} clickable`}>
        <ScrollText className='size-4' />
      </Button>
      {open && (
        <>
          <div
            className='fixed bottom-[90px] left-[55px] z-50 flex w-80 max-h-[200px] flex-col rounded-lg border bg-background shadow-lg'
            role='dialog'
            aria-label='Game log'>
            <div className='flex items-center justify-between border-b px-3 py-2'>
              <span className='text-sm font-medium'>Game log</span>
              <div className='flex gap-2'>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={clearLogs}
                  aria-label='Clear game log'
                  className='size-7'>
                  <CircleOff className='size-3.5' />
                </Button>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => setOpen(false)}
                  aria-label='Close game log'
                  className='size-7'>
                  <X className='size-3.5' />
                </Button>
              </div>
            </div>
            <div className='max-h-64 overflow-y-auto p-2'>
              {logs.length === 0 ? (
                <p className='text-xs text-muted-foreground'>No log entries yet.</p>
              ) : (
                <div className='flex flex-col gap-0.5 font-mono text-xs'>
                  {logs.map((log, i) => (
                    <div key={i} className='break-words'>
                      <span style={{ color: 'grey' }}>{`[${log.time}]: `}</span>
                      <span>{log.msg}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};
