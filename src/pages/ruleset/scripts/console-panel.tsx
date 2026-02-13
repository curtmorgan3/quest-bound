import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getQBScriptClient } from '@/lib/compass-logic/worker';
import { useEffect, useState } from 'react';

// --- Console panel (naive: single stream of logs) ---
interface ConsoleLogEntry {
  id: string;
  timestamp: number;
  level: 'log' | 'warn' | 'error';
  args: unknown[];
}

export function ConsolePanel() {
  const [logs, setLogs] = useState<ConsoleLogEntry[]>([]);
  const client = getQBScriptClient();

  useEffect(() => {
    const unsub = client.onSignal((signal) => {
      if (signal.type === 'CONSOLE_LOG') {
        setLogs((prev) => [
          ...prev.slice(-499),
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            timestamp: Date.now(),
            level: 'log',
            args: signal.payload.args,
          },
        ]);
      }
    });
    return unsub;
  }, [client]);

  const clear = () => setLogs([]);

  const formatValue = (v: unknown): string => {
    if (v === null) return 'null';
    if (v === undefined) return 'undefined';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  };

  return (
    <div className='rounded-md border bg-muted/20 flex flex-col h-[220px]'>
      <div className='flex items-center justify-between px-3 py-2 border-b'>
        <span className='text-sm font-medium'>Output</span>
        <Button variant='ghost' size='sm' onClick={clear}>
          Clear
        </Button>
      </div>
      <ScrollArea className='flex-1 p-2'>
        <div className='space-y-1 font-mono text-xs'>
          {logs.length === 0 ? (
            <p className='text-muted-foreground italic'>No logs yet. Run a script to see output.</p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className={`flex gap-2 ${
                  log.level === 'error'
                    ? 'text-destructive'
                    : log.level === 'warn'
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : ''
                }`}>
                <span className='text-muted-foreground shrink-0'>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span>
                  {log.args.map((arg, i) => (
                    <span key={i}>{formatValue(arg)} </span>
                  ))}
                </span>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
