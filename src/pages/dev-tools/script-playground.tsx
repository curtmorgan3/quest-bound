import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { ScriptRunner } from '@/lib/compass-logic/runtime/script-runner';
import { db } from '@/stores';
import type { Character, Ruleset } from '@/types';
import { Play } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

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
  const [ruleset, setRuleset] = useState<Ruleset | null>(null);
  const [testCharacter, setTestCharacter] = useState<Character | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load ruleset and test character from localStorage
  useEffect(() => {
    const loadRulesetAndCharacter = async () => {
      setIsLoading(true);
      try {
        const lastEditedRulesetId = localStorage.getItem('qb.lastEditedRulesetId');

        if (!lastEditedRulesetId) {
          setRuleset(null);
          setTestCharacter(null);
          return;
        }

        // Fetch the ruleset
        const fetchedRuleset = await db.rulesets.get(lastEditedRulesetId);
        setRuleset(fetchedRuleset || null);

        if (!fetchedRuleset) {
          setTestCharacter(null);
          return;
        }

        // Fetch the test character for this ruleset
        const characters = await db.characters
          .where('rulesetId')
          .equals(lastEditedRulesetId)
          .toArray();

        const testChar = characters.find((c) => c.isTestCharacter);
        setTestCharacter(testChar || null);
      } catch (error) {
        console.error('Error loading ruleset and test character:', error);
        setRuleset(null);
        setTestCharacter(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadRulesetAndCharacter();
  }, []);

  const execute = useCallback(
    async (source: string): Promise<ScriptResult> => {
      setIsExecuting(true);
      const startTime = performance.now();

      try {
        if (!ruleset) {
          throw new Error('No ruleset found. Please select a ruleset first.');
        }

        if (!testCharacter) {
          throw new Error('No test character found for the ruleset.');
        }

        // Create and run script using ScriptRunner
        const runner = new ScriptRunner({
          ownerId: testCharacter.id,
          targetId: testCharacter.id, // Use test character as both owner and target
          rulesetId: ruleset.id,
          db,
          scriptId: 'script-playground',
          triggerType: 'load',
        });

        const executionResult = await runner.run(source);
        const duration = performance.now() - startTime;

        const result: ScriptResult = {
          value: executionResult.value,
          announcements: executionResult.announceMessages,
          logs: executionResult.logMessages,
          error: executionResult.error ? executionResult.error.message : null,
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
    },
    [ruleset, testCharacter],
  );

  return { execute, isExecuting, lastResult, ruleset, testCharacter, isLoading };
}

export function ScriptPlayground() {
  const { execute, isExecuting, lastResult, ruleset, testCharacter, isLoading } =
    useScriptExecutor();
  const [source, setSource] = useState(
    `// Try some QBScript with Owner, Target, and Ruleset accessors!
// Example: Owner.HP
// Example: Target.Strength
// Example: Ruleset.attribute("HP")
roll("2d6+4")`,
  );

  const handleRun = async () => {
    await execute(source);
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
      {isLoading && (
        <Card className='border-blue-500 bg-blue-50 dark:bg-blue-950'>
          <CardContent className='pt-6'>
            <p className='text-sm text-blue-800 dark:text-blue-200'>
              Loading ruleset and test character...
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !ruleset && (
        <Card className='border-yellow-500 bg-yellow-50 dark:bg-yellow-950'>
          <CardContent className='pt-6'>
            <p className='text-sm text-yellow-800 dark:text-yellow-200'>
              No ruleset found. Please select a ruleset to use the script playground.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && ruleset && !testCharacter && (
        <Card className='border-yellow-500 bg-yellow-50 dark:bg-yellow-950'>
          <CardContent className='pt-6'>
            <p className='text-sm text-yellow-800 dark:text-yellow-200'>
              No test character found for the ruleset. A test character should be created
              automatically.
            </p>
          </CardContent>
        </Card>
      )}

      <div>
        <Label htmlFor='script-editor' className='text-base font-semibold'>
          QBScript Editor
        </Label>
        <p className='text-sm text-muted-foreground mb-2'>
          Write and test QBScript code. Press Shift+Enter to run.
          {testCharacter && (
            <>
              {' '}
              Using test character: <strong>{testCharacter.name}</strong>
            </>
          )}
        </p>
        <Textarea
          id='script-editor'
          value={source}
          onChange={(e) => setSource(e.target.value)}
          onKeyDown={handleKeyDown}
          className='font-mono text-sm min-h-[200px]'
          disabled={isExecuting || isLoading || !ruleset || !testCharacter}
          placeholder='Enter QBScript code...'
        />
      </div>

      <Button
        onClick={handleRun}
        disabled={isExecuting || isLoading || !ruleset || !testCharacter}
        className='w-full'>
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
                <code className='bg-muted px-1 rounded'>Owner.HP</code> - Access owner attribute
              </li>
              <li>
                <code className='bg-muted px-1 rounded'>Target.Strength</code> - Access target
                attribute
              </li>
              <li>
                <code className='bg-muted px-1 rounded'>Ruleset.attribute("HP")</code> - Get
                attribute definition
              </li>
              <li>
                <code className='bg-muted px-1 rounded'>announce("Hello!")</code> - Display message
              </li>
              <li>
                <code className='bg-muted px-1 rounded'>log("debug", Owner.HP)</code> - Debug output
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
