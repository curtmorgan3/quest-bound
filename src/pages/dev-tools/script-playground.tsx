import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useCharacterAttributes } from '@/lib/compass-api';
import { useExecuteScript } from '@/lib/compass-logic/worker';
import { db } from '@/stores';
import type { Character, Ruleset } from '@/types';
import { Zap } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

export function useScriptExecutor() {
  const [ruleset, setRuleset] = useState<Ruleset | null>(null);
  const [testCharacter, setTestCharacter] = useState<Character | null>(null);

  const { characterAttributes } = useCharacterAttributes(testCharacter?.id);

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
    async (source: string) => {
      if (!ruleset) {
        throw new Error('No ruleset found. Please select a ruleset first.');
      }

      if (!testCharacter) {
        throw new Error('No test character found for the ruleset.');
      }

      // Execute script using worker - the hook's state will update automatically
      await workerHook.execute({
        scriptId: 'script-playground',
        sourceCode: source,
        characterId: testCharacter.id,
        targetId: testCharacter.id, // Use test character as both owner and target
        rulesetId: ruleset.id,
        triggerType: 'load',
      });
    },
    [ruleset, testCharacter, workerHook.execute],
  );

  return {
    execute,
    isExecuting: workerHook.isExecuting,
    result: workerHook.result,
    announceMessages: workerHook.announceMessages,
    logMessages: workerHook.logMessages,
    error: workerHook.error,
    executionTime: workerHook.executionTime,
    ruleset,
    testCharacter,
    characterAttributes,
    isLoading,
  };
}

export function ScriptPlayground() {
  const {
    execute,
    isExecuting,
    result,
    announceMessages,
    logMessages,
    error,
    executionTime,
    ruleset,
    testCharacter,
    isLoading,
  } = useScriptExecutor();

  // Load script content from localStorage on mount
  const [source, setSource] = useState(() => {
    const stored = localStorage.getItem('qb.scriptPlayground.source');
    return stored || '';
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { characterAttributes, updateCharacterAttribute } = useCharacterAttributes(
    testCharacter?.id,
  );

  // State for pinned attributes
  const [pinnedAttributeTitles, setPinnedAttributeTitles] = useState<Set<string>>(() => {
    const stored = localStorage.getItem('qb.scriptPlayground.pinnedAttributes');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  // Persist pinned attributes to localStorage
  useEffect(() => {
    localStorage.setItem(
      'qb.scriptPlayground.pinnedAttributes',
      JSON.stringify(Array.from(pinnedAttributeTitles)),
    );
  }, [pinnedAttributeTitles]);

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
    // Save script content to localStorage before executing
    localStorage.setItem('qb.scriptPlayground.source', source);
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

  const togglePinAttribute = (attributeTitle: string) => {
    setPinnedAttributeTitles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(attributeTitle)) {
        newSet.delete(attributeTitle);
      } else {
        newSet.add(attributeTitle);
      }
      return newSet;
    });
  };

  const handleAttributeValueChange = async (attributeId: string, newValue: string) => {
    // Parse the value appropriately
    let parsedValue: any = newValue;

    // Try to parse as number if it looks like a number
    if (newValue !== '' && !isNaN(Number(newValue))) {
      parsedValue = Number(newValue);
    }
    // Try to parse as JSON if it starts with { or [
    else if (newValue.startsWith('{') || newValue.startsWith('[')) {
      try {
        parsedValue = JSON.parse(newValue);
      } catch {
        // Keep as string if JSON parse fails
      }
    }
    // Handle boolean values
    else if (newValue === 'true') {
      parsedValue = true;
    } else if (newValue === 'false') {
      parsedValue = false;
    } else if (newValue === 'null') {
      parsedValue = null;
    }

    // Update using the hook
    await updateCharacterAttribute(attributeId, { value: parsedValue });
  };

  // Separate pinned and unpinned attributes, alphabetized
  const pinnedAttributes = characterAttributes
    .filter((attr) => pinnedAttributeTitles.has(attr.title))
    .sort((a, b) => a.title.localeCompare(b.title));
  const unpinnedAttributes = characterAttributes
    .filter((attr) => !pinnedAttributeTitles.has(attr.title))
    .sort((a, b) => a.title.localeCompare(b.title));

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
            <p className='text-xs text-muted-foreground'>Click to pin/unpin</p>
          </div>
          <ScrollArea className='flex-1'>
            {characterAttributes.length > 0 ? (
              <div className='space-y-2 pr-4'>
                {/* Pinned Attributes */}
                {pinnedAttributes.map((attr, index) => (
                  <div
                    key={`pinned-${index}`}
                    className='text-xs p-2 rounded-md border border-primary/20 bg-primary/5'>
                    <div
                      onClick={() => togglePinAttribute(attr.title)}
                      className='font-medium text-foreground mb-1 cursor-pointer hover:text-primary transition-colors'>
                      {attr.title}
                    </div>
                    <Input
                      value={
                        typeof attr.value === 'object'
                          ? JSON.stringify(attr.value)
                          : String(attr.value ?? '')
                      }
                      onChange={(e) => handleAttributeValueChange(attr.id, e.target.value)}
                      className='h-7 text-xs'
                      placeholder='Value'
                    />
                  </div>
                ))}

                {/* Divider between pinned and unpinned */}
                {pinnedAttributes.length > 0 && unpinnedAttributes.length > 0 && (
                  <div className='my-3 border-t border-border' />
                )}

                {/* Unpinned Attributes */}
                {unpinnedAttributes.map((attr, index) => (
                  <div key={`unpinned-${index}`} className='text-xs p-2 rounded-md'>
                    <div
                      onClick={() => togglePinAttribute(attr.title)}
                      className='font-medium text-foreground mb-1 cursor-pointer hover:text-primary transition-colors'>
                      {attr.title}
                    </div>
                    <Input
                      value={
                        typeof attr.value === 'object'
                          ? JSON.stringify(attr.value)
                          : String(attr.value ?? '')
                      }
                      onChange={(e) => handleAttributeValueChange(attr.id, e.target.value)}
                      className='h-7 text-xs'
                      placeholder='Value'
                    />
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
        {executionTime !== null || error ? (
          <div className='p-4'>
            <div className='flex items-center justify-between mb-3'>
              <div className='flex items-center gap-2'>
                <h3 className='text-sm font-semibold'>Output</h3>
                <span className='text-xs bg-primary/10 text-primary px-2 py-0.5 rounded'>
                  Non-blocking execution
                </span>
              </div>
              {executionTime !== null && (
                <p className='text-xs text-muted-foreground'>
                  Executed in {executionTime.toFixed(2)}ms
                </p>
              )}
            </div>

            <ScrollArea className='h-64'>
              <div className='space-y-3 pr-4'>
                {error ? (
                  <div className='p-3 bg-destructive/10 border border-destructive rounded-md'>
                    <p className='text-sm font-semibold text-destructive mb-1'>Error</p>
                    <p className='text-sm font-mono text-destructive'>{error.message}</p>
                  </div>
                ) : (
                  <>
                    {result !== null && result !== undefined && (
                      <div>
                        <Label className='text-sm font-semibold mb-2 block'>Result</Label>
                        <div className='p-3 bg-background border rounded-md'>
                          <pre className='text-sm font-mono whitespace-pre-wrap'>
                            {JSON.stringify(result, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}

                    {announceMessages.length > 0 && (
                      <div>
                        <Label className='text-sm font-semibold mb-2 block'>Announcements</Label>
                        <div className='space-y-2'>
                          {announceMessages.map((msg, i) => (
                            <div key={i} className='p-2 bg-primary/10 rounded-md text-sm'>
                              📢 {msg}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {logMessages.length > 0 && (
                      <div>
                        <Label className='text-sm font-semibold mb-2 block'>Logs</Label>
                        <div className='space-y-1'>
                          {logMessages.map((args, i) => (
                            <div
                              key={i}
                              className='p-2 bg-background border rounded-md text-sm font-mono'>
                              🔍 {args.map((arg) => JSON.stringify(arg)).join(' ')}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!error &&
                      announceMessages.length === 0 &&
                      logMessages.length === 0 &&
                      result === null && (
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
