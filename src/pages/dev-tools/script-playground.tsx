import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useCharacterAttributes } from '@/lib/compass-api';
import { useExecuteScript } from '@/lib/compass-logic/worker';
import { db } from '@/stores';
import type { Character, Ruleset } from '@/types';
import { Zap } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface ScriptResult {
  value: any;
  announcements: string[];
  logs: any[][];
  error: string | null;
  duration: number;
}

export function useScriptExecutor() {
  const [lastResult, setLastResult] = useState<ScriptResult | null>(null);
  const [ruleset, setRuleset] = useState<Ruleset | null>(null);
  const [testCharacter, setTestCharacter] = useState<Character | null>(null);
  const [characterAttributes, setCharacterAttributes] = useState<
    Array<{ name: string; value: any }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  // Use the worker-based execution hook
  const workerHook = useExecuteScript();

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

        // Load character attributes if test character exists
        if (testChar) {
          const charAttrs = await db.characterAttributes
            .where({ characterId: testChar.id })
            .toArray();

          // Get attribute definitions to get names
          const attrIds = charAttrs.map((ca) => ca.attributeId);
          const attrDefs = await db.attributes.bulkGet(attrIds);

          // Combine character attributes with their names
          const attributesWithNames = charAttrs
            .map((charAttr, index) => ({
              name: attrDefs[index]?.title || 'Unknown',
              value: charAttr.value,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

          setCharacterAttributes(attributesWithNames);
        } else {
          setCharacterAttributes([]);
        }
      } catch (error) {
        console.error('Error loading ruleset and test character:', error);
        setRuleset(null);
        setTestCharacter(null);
        setCharacterAttributes([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadRulesetAndCharacter();
  }, []);

  const execute = useCallback(
    async (source: string): Promise<ScriptResult> => {
      try {
        if (!ruleset) {
          throw new Error('No ruleset found. Please select a ruleset first.');
        }

        if (!testCharacter) {
          throw new Error('No test character found for the ruleset.');
        }

        // Execute script using worker
        await workerHook.execute({
          scriptId: 'script-playground',
          sourceCode: source,
          characterId: testCharacter.id,
          targetId: testCharacter.id, // Use test character as both owner and target
          rulesetId: ruleset.id,
          triggerType: 'load',
        });

        // Convert worker result to our format
        const result: ScriptResult = {
          value: workerHook.result,
          announcements: workerHook.announceMessages,
          logs: workerHook.logMessages,
          error: workerHook.error ? workerHook.error.message : null,
          duration: workerHook.executionTime || 0,
        };

        setLastResult(result);
        return result;
      } catch (err: any) {
        const result: ScriptResult = {
          value: null,
          announcements: [],
          logs: [],
          error: err.message,
          duration: 0,
        };

        setLastResult(result);
        return result;
      }
    },
    [ruleset, testCharacter, workerHook],
  );

  return {
    execute,
    isExecuting: workerHook.isExecuting,
    lastResult,
    ruleset,
    testCharacter,
    characterAttributes,
    isLoading,
  };
}

export function ScriptPlayground() {
  const { execute, isExecuting, lastResult, ruleset, testCharacter, isLoading } =
    useScriptExecutor();
  const [source, setSource] = useState(``);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { characterAttributes } = useCharacterAttributes(testCharacter?.id);

  const executingRef = useRef(true);

  useEffect(() => {
    if (isExecuting && !executingRef.current) {
      executingRef.current = true;
    } else if (!isExecuting && executingRef.current) {
      textareaRef.current?.focus();
      executingRef.current = false;
    }
  }, [isExecuting]);

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
    <div className='h-full flex flex-col'>
      {/* Alerts at the top */}
      {isLoading && (
        <div className='m-4 mb-0'>
          <Card className='border-blue-500 bg-blue-50 dark:bg-blue-950'>
            <CardContent className='pt-6'>
              <p className='text-sm text-blue-800 dark:text-blue-200'>
                Loading ruleset and test character...
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {!isLoading && !ruleset && (
        <div className='m-4 mb-0'>
          <Card className='border-yellow-500 bg-yellow-50 dark:bg-yellow-950'>
            <CardContent className='pt-6'>
              <p className='text-sm text-yellow-800 dark:text-yellow-200'>
                No ruleset found. Please select a ruleset to use the script playground.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {!isLoading && ruleset && !testCharacter && (
        <div className='m-4 mb-0'>
          <Card className='border-yellow-500 bg-yellow-50 dark:bg-yellow-950'>
            <CardContent className='pt-6'>
              <p className='text-sm text-yellow-800 dark:text-yellow-200'>
                No test character found for the ruleset. A test character should be created
                automatically.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Editor Area - fills remaining space */}
      <div className='flex-1 flex gap-4 min-h-0 p-4'>
        {/* Editor - 70% width */}
        <div className='flex-1 flex flex-col min-h-0' style={{ flexBasis: '70%' }}>
          <div className='mb-2'>
            <Label htmlFor='script-editor' className='text-base font-semibold'>
              QBScript Editor
            </Label>
            <p className='text-sm text-muted-foreground'>
              Write and test QBScript code. Press Shift+Enter to run.
              {testCharacter && (
                <>
                  {' '}
                  Using test character: <strong>{testCharacter.name}</strong>
                </>
              )}{' '}
              <span className='inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded'>
                <Zap className='h-3 w-3' />
                Web Worker
              </span>
            </p>
          </div>

          <Textarea
            id='script-editor'
            ref={textareaRef}
            value={source}
            onChange={(e) => setSource(e.target.value)}
            onKeyDown={handleKeyDown}
            className='font-mono text-sm flex-1 resize-none'
            disabled={isExecuting || isLoading || !ruleset || !testCharacter}
            placeholder='Enter QBScript code...'
          />

          <div className='mt-3'>
            <Button
              onClick={handleRun}
              disabled={isExecuting || isLoading || !ruleset || !testCharacter}
              className='w-full'>
              <Zap className='h-4 w-4 mr-2' />
              {isExecuting ? 'Running in Worker...' : 'Run Script (Web Worker)'}
            </Button>
          </div>
        </div>

        {/* Character Attributes - 30% width */}
        <div className='flex flex-col min-h-0 border-l pl-4' style={{ flexBasis: '30%' }}>
          <div className='mb-2'>
            <Label className='text-base font-semibold'>Character Attributes</Label>
          </div>
          <ScrollArea className='flex-1'>
            {characterAttributes.length > 0 ? (
              <div className='space-y-2 pr-4'>
                {characterAttributes.map((attr, index) => (
                  <div key={index} className='text-xs'>
                    <div className='font-medium text-foreground'>{attr.title}</div>
                    <div className='text-muted-foreground text-xs break-words'>
                      {typeof attr.value === 'object'
                        ? JSON.stringify(attr.value)
                        : String(attr.value ?? 'null')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='text-xs text-muted-foreground space-y-1'>
                <p className='font-semibold'>Quick Examples:</p>
                <ul className='list-disc list-inside space-y-1 ml-2'>
                  <li>
                    <code className='bg-background px-1 rounded border'>roll("2d6+4")</code> - Roll
                    dice
                  </li>
                  <li>
                    <code className='bg-background px-1 rounded border'>Owner.HP</code> - Access
                    owner attribute
                  </li>
                  <li>
                    <code className='bg-background px-1 rounded border'>announce("Hello!")</code> -
                    Display message
                  </li>
                </ul>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Output Panel - scrollable */}
      <div className='border-t bg-muted/30'>
        {lastResult ? (
          <div className='p-4'>
            <div className='flex items-center justify-between mb-3'>
              <div className='flex items-center gap-2'>
                <h3 className='text-sm font-semibold'>Output</h3>
                <span className='text-xs bg-primary/10 text-primary px-2 py-0.5 rounded'>
                  Non-blocking execution
                </span>
              </div>
              <p className='text-xs text-muted-foreground'>
                Executed in {lastResult.duration.toFixed(2)}ms
              </p>
            </div>

            <ScrollArea className='h-64'>
              <div className='space-y-3 pr-4'>
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
                        <div className='p-3 bg-background border rounded-md'>
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
                            <div
                              key={i}
                              className='p-2 bg-background border rounded-md text-sm font-mono'>
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
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className='p-4 h-[300px] flex items-center justify-center'>
            <p className='text-sm text-muted-foreground italic'>Run a script to see output here</p>
          </div>
        )}
      </div>
    </div>
  );
}
