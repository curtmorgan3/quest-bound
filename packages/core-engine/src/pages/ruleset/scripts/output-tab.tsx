import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { UseReactiveScriptExecutionResult } from '@/lib/compass-logic';
import { Eraser, Play, Square } from 'lucide-react';

interface OutputTabProps {
  scriptExecutionHook: UseReactiveScriptExecutionResult;
  logMessages: any[][];
  announceMessages: string[];
  error?: Error | null;
  runDisabled: boolean;
  onRun: () => void;
  onClearLogs: () => void;
}

export function OutputTab({
  scriptExecutionHook,
  logMessages,
  announceMessages,
  error,
  runDisabled,
  onRun,
  onClearLogs,
}: OutputTabProps) {
  const running = scriptExecutionHook.isExecuting;
  const logs = [...logMessages, ...(scriptExecutionHook.logMessages ?? [])];
  const announcements = [...announceMessages, ...(scriptExecutionHook.announceMessages ?? [])];
  const executionError = error ?? scriptExecutionHook.error;
  const result = scriptExecutionHook.result;
  const reactiveCount = scriptExecutionHook.reactiveExecutionCount;
  const hasReactive = reactiveCount > 0;
  const isEmpty =
    !executionError &&
    logs.length === 0 &&
    announcements.length === 0 &&
    (result === null || result === undefined) &&
    !hasReactive;

  return (
    <div className='flex flex-col h-full min-h-0'>
      <div className='flex items-center justify-between px-3 py-2 border-b shrink-0 gap-2'>
        <div className='flex items-center gap-1'>
          <Button
            variant='ghost'
            size='sm'
            onClick={onRun}
            disabled={runDisabled || running}
            className='h-7 px-2 text-xs uppercase tracking-wider text-primary hover:text-primary/80 gap-1.5'
            title={running ? 'Running…' : 'Run script'}>
            {running ? <Square className='h-3 w-3' /> : <Play className='h-3 w-3' />}
            {running ? 'Running' : 'Run'}
          </Button>
          <Button
            variant='ghost'
            size='icon'
            onClick={onClearLogs}
            className='h-7 w-7 text-muted-foreground'
            title='Clear console'
            aria-label='Clear console'>
            <Eraser className='h-3.5 w-3.5' />
          </Button>
        </div>
        <div className='flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground'>
          {hasReactive && (
            <span style={{ color: '#c678dd' }}>
              {reactiveCount} reactive script{reactiveCount !== 1 ? 's' : ''}
            </span>
          )}
          {scriptExecutionHook.executionTime !== null && (
            <span>{scriptExecutionHook.executionTime.toFixed(2)}ms</span>
          )}
          <span>{running ? '● running' : 'console'}</span>
        </div>
      </div>
      <ScrollArea className='flex-1 min-h-0'>
        <div className='p-3 space-y-2'>
          {executionError ? (
            <div className='text-xs font-mono flex items-start gap-2'>
              <span className='font-semibold text-destructive'>Error: </span>
              <span className='text-destructive'>{executionError.message}</span>
            </div>
          ) : (
            <>
              {logs.map((args, i) => (
                <div key={`log-${i}`} className='text-xs flex items-start gap-2'>
                  <span className='text-muted-foreground font-mono shrink-0' aria-hidden>
                    [log]
                  </span>
                  <span>{args.map((arg) => JSON.stringify(arg)).join(' ')}</span>
                </div>
              ))}
              {announcements.map((msg, i) => (
                <div key={`announce-${i}`} className='text-xs flex items-start gap-2'>
                  <span
                    style={{ color: '#61afef' }}
                    className='font-mono shrink-0'
                    aria-hidden>
                    [announce]
                  </span>
                  <span>{msg}</span>
                </div>
              ))}
              {result !== null && result !== undefined && (
                <div className='text-xs flex items-start gap-2'>
                  <span style={{ color: '#98c379' }} className='font-semibold'>
                    {`=>`}
                  </span>
                  <pre className='font-mono whitespace-pre-wrap'>
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
              {hasReactive && (
                <div className='text-xs flex items-start gap-2 mt-2 pt-2 border-t'>
                  <span
                    style={{ color: '#c678dd' }}
                    className='font-mono shrink-0'
                    aria-hidden>
                    [reactive]
                  </span>
                  <span className='text-muted-foreground'>
                    Triggered {reactiveCount} dependent script{reactiveCount !== 1 ? 's' : ''}
                    {scriptExecutionHook.reactiveScriptsExecuted.length > 0 && (
                      <span className='font-mono'>
                        : {scriptExecutionHook.reactiveScriptsExecuted.join(', ')}
                      </span>
                    )}
                  </span>
                </div>
              )}
              {isEmpty && (
                <p className='text-sm text-muted-foreground italic'>No output</p>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
