import { Button } from '@/components/ui/button';
import { ScrollText, X } from 'lucide-react';
import { useState } from 'react';

interface GameLogProps {
  logs: string[];
  className?: string;
}

export const GameLog = ({ logs, className }: GameLogProps) => {
  const [open, setOpen] = useState(false);

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
              <Button
                variant='ghost'
                size='icon'
                onClick={() => setOpen(false)}
                aria-label='Close game log'
                className='size-7'>
                <X className='size-3.5' />
              </Button>
            </div>
            <div className='max-h-64 overflow-y-auto p-2'>
              {logs.length === 0 ? (
                <p className='text-xs text-muted-foreground'>No log entries yet.</p>
              ) : (
                <div className='flex flex-col gap-0.5 font-mono text-xs'>
                  {logs.map((log, i) => (
                    <div key={i} className='break-words'>
                      {log}
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
