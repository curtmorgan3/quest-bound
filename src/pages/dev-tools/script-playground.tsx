import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Evaluator } from '@/lib/compass-logic/interpreter/evaluator';
import { Lexer } from '@/lib/compass-logic/interpreter/lexer';
import { Parser } from '@/lib/compass-logic/interpreter/parser';
import { Play } from 'lucide-react';
import { useCallback, useState } from 'react';

interface ScriptResult {
  value: any;
  announcements: string[];
  logs: any[][];
  error: string | null;
  duration: number;
}

export function useScriptExecutor() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<ScriptResult | null>(null);

  const execute = useCallback((source: string, context?: Record<string, any>): ScriptResult => {
    setIsExecuting(true);
    const startTime = performance.now();

    try {
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const evaluator = new Evaluator();

      // Inject context variables
      if (context) {
        Object.entries(context).forEach(([key, val]) => {
          evaluator['globalEnv'].define(key, val);
        });
      }

      const value = evaluator.eval(ast);
      const duration = performance.now() - startTime;

      const result: ScriptResult = {
        value,
        announcements: evaluator.getAnnounceMessages(),
        logs: evaluator.getLogMessages(),
        error: null,
        duration,
      };

      setLastResult(result);
      return result;
    } catch (err: any) {
      const duration = performance.now() - startTime;
      const result: ScriptResult = {
        value: null,
        announcements: [],
        logs: [],
        error: err.message,
        duration,
      };

      setLastResult(result);
      return result;
    } finally {
      setIsExecuting(false);
    }
  }, []);

  return { execute, isExecuting, lastResult };
}

export function ScriptPlayground() {
  const { execute, isExecuting, lastResult } = useScriptExecutor();
  const [source, setSource] = useState(
    `// Try some QBScript!
roll("2d6+4")`,
  );

  const handleRun = () => {
    execute(source, {
      // Provide example game context
      PlayerHP: 50,
      PlayerLevel: 5,
      Constitution: 14,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Run script on Shift+Enter
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      handleRun();
      return;
    }

    // Allow tab key for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();

      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;

      // Insert 4 spaces at cursor position
      const newValue = source.substring(0, start) + '    ' + source.substring(end);
      setSource(newValue);

      // Move cursor after the inserted spaces
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 4;
      }, 0);
    }
  };

  return (
    <div className='p-4 space-y-4'>
      <div>
        <Label htmlFor='script-editor' className='text-base font-semibold'>
          QBScript Editor
        </Label>
        <p className='text-sm text-muted-foreground mb-2'>
          Write and test QBScript code. Press Shift+Enter to run. Available variables: PlayerHP,
          PlayerLevel, Constitution
        </p>
        <Textarea
          id='script-editor'
          value={source}
          onChange={(e) => setSource(e.target.value)}
          onKeyDown={handleKeyDown}
          className='font-mono text-sm min-h-[200px]'
          disabled={isExecuting}
          placeholder='Enter QBScript code...'
        />
      </div>

      <Button onClick={handleRun} disabled={isExecuting} className='w-full'>
        <Play className='h-4 w-4 mr-2' />
        {isExecuting ? 'Running...' : 'Run Script'}
      </Button>

      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Output</CardTitle>
            <CardDescription>Executed in {lastResult.duration.toFixed(2)}ms</CardDescription>
          </CardHeader>
          <div className='max-h-[200px] overflow-y-auto mb-[24px]'>
            <CardContent className='space-y-4'>
              {lastResult.error ? (
                <div className='p-3 bg-destructive/10 border border-destructive rounded-md'>
                  <p className='text-sm font-semibold text-destructive mb-1'>Error</p>
                  <p className='text-sm font-mono text-destructive'>{lastResult.error}</p>
                </div>
              ) : (
                <>
                  {lastResult.value !== null && lastResult.value !== undefined && (
                    <div>
                      <Label className='text-sm font-semibold mb-2 block'>Result</Label>
                      <div className='p-3 bg-muted rounded-md'>
                        <pre className='text-sm font-mono whitespace-pre-wrap'>
                          {JSON.stringify(lastResult.value, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {lastResult.announcements.length > 0 && (
                    <div>
                      <Label className='text-sm font-semibold mb-2 block'>Announcements</Label>
                      <div className='space-y-2'>
                        {lastResult.announcements.map((msg, i) => (
                          <div key={i} className='p-2 bg-primary/10 rounded-md text-sm'>
                            📢 {msg}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {lastResult.logs.length > 0 && (
                    <div>
                      <Label className='text-sm font-semibold mb-2 block'>Logs</Label>
                      <div className='space-y-1'>
                        {lastResult.logs.map((args, i) => (
                          <div key={i} className='p-2 bg-muted rounded-md text-sm font-mono'>
                            🔍 {args.map((arg) => JSON.stringify(arg)).join(' ')}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!lastResult.error &&
                    lastResult.announcements.length === 0 &&
                    lastResult.logs.length === 0 &&
                    lastResult.value === null && (
                      <p className='text-sm text-muted-foreground italic'>No output</p>
                    )}
                </>
              )}
            </CardContent>
          </div>
        </Card>
      )}

      {!lastResult && (
        <>
          <Separator />
          <div className='text-xs text-muted-foreground space-y-1'>
            <p className='font-semibold'>Quick Examples:</p>
            <ul className='list-disc list-inside space-y-1 ml-2'>
              <li>
                <code className='bg-muted px-1 rounded'>roll("2d6+4")</code> - Roll dice
              </li>
              <li>
                <code className='bg-muted px-1 rounded'>floor((PlayerHP - 10) / 2)</code> - Math
              </li>
              <li>
                <code className='bg-muted px-1 rounded'>announce("Hello!")</code> - Display message
              </li>
              <li>
                <code className='bg-muted px-1 rounded'>log("debug", PlayerLevel)</code> - Debug
                output
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
