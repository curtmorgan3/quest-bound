import { Button } from '@/components/ui/button';
import type { UseReactiveScriptExecutionResult } from '@/lib/compass-logic';
import { Play, Square } from 'lucide-react';
import { EditorConsole } from './script-editor/editor-console';

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

  return (
    <div className='flex flex-col h-full min-h-0'>
      <div className='flex items-center justify-between px-3 py-2 border-b shrink-0'>
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
        <span className='text-[10px] uppercase tracking-wider text-muted-foreground'>
          {running ? '● running' : 'console'}
        </span>
      </div>
      <div className='flex-1 min-h-0 p-2 flex flex-col'>
        <EditorConsole
          scriptExecutionHook={scriptExecutionHook}
          logMessages={logMessages}
          announceMessages={announceMessages}
          error={error}
          onClearLogs={onClearLogs}
        />
      </div>
    </div>
  );
}
