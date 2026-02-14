import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { UseExecuteScriptResult } from '@/lib/compass-logic/worker';
import { ScriptErrorLog } from './editor-error-log';

interface EditorConsole {
  scriptExecutionHook: UseExecuteScriptResult;
}

export const EditorConsole = ({ scriptExecutionHook }: EditorConsole) => {
  return (
    <Tabs defaultValue='console' className='flex-1 flex flex-col min-h-0'>
      <TabsList>
        <TabsTrigger value='console'>Console</TabsTrigger>
        <TabsTrigger value='errors'>Script errors</TabsTrigger>
      </TabsList>
      <TabsContent value='console' className='flex-1 min-h-0 mt-2 flex flex-col gap-4'>
        {(scriptExecutionHook.executionTime !== null || scriptExecutionHook.error) && (
          <div className='rounded-md border bg-muted/20 flex flex-col'>
            <div className='flex items-center justify-between px-3 py-2 border-b'>
              <h3 className='text-sm font-semibold'>Last run</h3>
              {scriptExecutionHook.executionTime !== null && (
                <p className='text-xs text-muted-foreground'>
                  Executed in {scriptExecutionHook.executionTime.toFixed(2)}ms
                </p>
              )}
            </div>
            <ScrollArea className='h-48'>
              <div className='space-y-2 p-3'>
                {scriptExecutionHook.error ? (
                  <div className='text-xs font-mono flex items-start gap-2'>
                    <span className='text-xs font-semibold text-destructive'>Error: </span>
                    <span className='text-xs font-mono text-destructive'>
                      {scriptExecutionHook.error.message}
                    </span>
                  </div>
                ) : (
                  <>
                    {scriptExecutionHook.logMessages.map((args, i) => (
                      <div key={`log-${i}`} className='text-xs font-mono flex items-start gap-2'>
                        <span className='text-muted-foreground shrink-0' aria-hidden>
                          [log]
                        </span>
                        <span>{args.map((arg) => JSON.stringify(arg)).join(' ')}</span>
                      </div>
                    ))}
                    {scriptExecutionHook.announceMessages.map((msg, i) => (
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
                    {scriptExecutionHook.result !== null &&
                      scriptExecutionHook.result !== undefined && (
                        <div className='text-xs flex items-start gap-2'>
                          <span
                            style={{ color: '#98c379' }}
                            className='text-xs font-semibold text-muted-foreground'>
                            {`=>`}
                          </span>
                          <pre className='text-xs font-mono whitespace-pre-wrap'>
                            {JSON.stringify(scriptExecutionHook.result, null, 2)}
                          </pre>
                        </div>
                      )}
                    {!scriptExecutionHook.error &&
                      scriptExecutionHook.announceMessages.length === 0 &&
                      scriptExecutionHook.logMessages.length === 0 &&
                      scriptExecutionHook.result === null && (
                        <p className='text-sm text-muted-foreground italic'>No output</p>
                      )}
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </TabsContent>
      <TabsContent value='errors' className='flex-1 min-h-0 mt-2'>
        <ScriptErrorLog />
      </TabsContent>
    </Tabs>
  );
};
