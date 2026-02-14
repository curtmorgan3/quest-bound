import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { UseReactiveScriptExecutionResult } from '@/lib/compass-logic/worker';
import { ScriptErrorLog } from './editor-error-log';

interface EditorConsole {
  scriptExecutionHook: UseReactiveScriptExecutionResult;
  logMessages?: any[][];
  announceMessages?: string[];
  error?: Error;
  result?: any;
}

export const EditorConsole = ({
  scriptExecutionHook,
  logMessages,
  announceMessages,
  error,
  result,
}: EditorConsole) => {
  const hasReactiveExecution = scriptExecutionHook.reactiveExecutionCount > 0;

  const logs = logMessages ?? scriptExecutionHook.logMessages;
  const announcements = announceMessages ?? scriptExecutionHook.announceMessages;
  const executionError = error ?? scriptExecutionHook.error;
  const finalResult = result ?? scriptExecutionHook.result;

  return (
    <Tabs defaultValue='console' className='flex-1 flex flex-col min-h-0'>
      <TabsList>
        <TabsTrigger value='console'>Console</TabsTrigger>
        <TabsTrigger value='errors'>Script errors</TabsTrigger>
      </TabsList>
      <TabsContent
        value='console'
        className='h-[100%] flex-1 min-h-0 mt-2 flex flex-col gap-4 rounded-md border bg-muted/20'>
        <div className='rounded-md border bg-muted/20 flex flex-col h-[100%]'>
          <div className='flex items-center justify-between px-3 py-2 border-b'>
            <h3 className='text-sm font-semibold'>Last run</h3>
            <div className='flex items-center gap-3'>
              {hasReactiveExecution && (
                <p className='text-xs text-muted-foreground'>
                  <span style={{ color: '#c678dd' }}>
                    {scriptExecutionHook.reactiveExecutionCount} reactive script
                    {scriptExecutionHook.reactiveExecutionCount !== 1 ? 's' : ''} triggered
                  </span>
                </p>
              )}
              {scriptExecutionHook.executionTime !== null && (
                <p className='text-xs text-muted-foreground'>
                  Executed in {scriptExecutionHook.executionTime.toFixed(2)}ms
                </p>
              )}
            </div>
          </div>
          <ScrollArea className='h-48'>
            <div className='space-y-2 p-3'>
              {executionError ? (
                <div className='text-xs font-mono flex items-start gap-2'>
                  <span className='text-xs font-semibold text-destructive'>Error: </span>
                  <span className='text-xs font-mono text-destructive'>
                    {executionError.message}
                  </span>
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
                        className='text-muted-foreground font-mono shrink-0'
                        aria-hidden>
                        [announce]
                      </span>
                      <span>{msg}</span>
                    </div>
                  ))}
                  {finalResult !== null && finalResult !== undefined && (
                    <div className='text-xs flex items-start gap-2'>
                      <span
                        style={{ color: '#98c379' }}
                        className='text-xs font-semibold text-muted-foreground'>
                        {`=>`}
                      </span>
                      <pre className='text-xs font-mono whitespace-pre-wrap'>
                        {JSON.stringify(finalResult, null, 2)}
                      </pre>
                    </div>
                  )}
                  {hasReactiveExecution && (
                    <div className='text-xs flex items-start gap-2 mt-2 pt-2 border-t'>
                      <span
                        style={{ color: '#c678dd' }}
                        className='text-muted-foreground font-mono shrink-0'
                        aria-hidden>
                        [reactive]
                      </span>
                      <span className='text-muted-foreground'>
                        Triggered {scriptExecutionHook.reactiveExecutionCount} dependent script
                        {scriptExecutionHook.reactiveExecutionCount !== 1 ? 's' : ''}
                        {scriptExecutionHook.reactiveScriptsExecuted.length > 0 && (
                          <span className='font-mono text-xs'>
                            : {scriptExecutionHook.reactiveScriptsExecuted.join(', ')}
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {!executionError &&
                    announcements.length === 0 &&
                    logs.length === 0 &&
                    finalResult === null &&
                    !hasReactiveExecution && (
                      <p className='text-sm text-muted-foreground italic'>No output</p>
                    )}
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </TabsContent>
      <TabsContent value='errors' className='flex-1 min-h-0 mt-2'>
        <ScriptErrorLog />
      </TabsContent>
    </Tabs>
  );
};
