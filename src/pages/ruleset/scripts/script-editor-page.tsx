import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ActionLookup, AttributeLookup, ItemLookup, useRulesets } from '@/lib/compass-api';
import { useScriptErrors } from '@/lib/compass-api/hooks/scripts/use-script-errors';
import { useScripts } from '@/lib/compass-api/hooks/scripts/use-scripts';
import { CodeMirrorEditor } from '@/lib/compass-logic/editor';
import { useExecuteScript, useScriptValidation } from '@/lib/compass-logic/worker';
import type { Action, Attribute, Item, Script } from '@/types';
import { AlertCircle, Trash2, Zap } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ConsolePanel } from './console-panel';
import { ScriptErrorLog } from './error-log';

const ENTITY_TYPES = [
  { value: 'attribute', label: 'Attribute' },
  { value: 'action', label: 'Action' },
  { value: 'item', label: 'Item' },
  { value: 'global', label: 'Global' },
] as const;

const DRAFT_KEY = (id: string) => `qb.script-draft-${id}`;

export function ScriptEditorPage() {
  const { rulesetId, scriptId } = useParams<{ rulesetId: string; scriptId: string }>();
  const navigate = useNavigate();
  const { scripts, createScript, updateScript, deleteScript } = useScripts();
  const { errors: validationErrors, validate, isValidating } = useScriptValidation();
  const { errors: scriptErrors, dismissError } = useScriptErrors();

  const { activeRuleset, testCharacter } = useRulesets();

  const isNew = scriptId === 'new';
  const script = isNew ? null : (scripts.find((s) => s.id === scriptId) ?? null);

  const [name, setName] = useState(script?.name ?? '');
  const [entityType, setEntityType] = useState<Script['entityType']>(
    script?.entityType ?? 'attribute',
  );
  const [entityId, setEntityId] = useState<string | null>(script?.entityId ?? null);
  const [sourceCode, setSourceCode] = useState(script?.sourceCode ?? '');

  // Sync from loaded script
  useEffect(() => {
    if (script) {
      setName(script.name);
      setEntityType(script.entityType);
      setEntityId(script.entityId);
      // setSourceCode(script.sourceCode);
      setSourceCode('test');
    } else if (isNew) {
      const draft = localStorage.getItem(DRAFT_KEY('new'));
      if (draft) {
        try {
          const parsed = JSON.parse(draft) as { sourceCode?: string; name?: string };
          if (parsed.sourceCode !== undefined) setSourceCode(parsed.sourceCode);
          if (parsed.name !== undefined) setName(parsed.name);
        } catch {
          // ignore
        }
      } else {
        setName('');
        setEntityType('attribute');
        setEntityId(null);
        setSourceCode('');
      }
    }
  }, [script, isNew]);

  // Autosave draft to localStorage (debounced)
  useEffect(() => {
    const key = DRAFT_KEY(scriptId ?? 'new');
    const t = setTimeout(() => {
      localStorage.setItem(key, JSON.stringify({ sourceCode, name, entityType, entityId }));
    }, 800);
    return () => clearTimeout(t);
  }, [sourceCode, name, entityType, entityId, scriptId]);

  // Debounced validation
  const validateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const id = scriptId ?? 'new';
    if (validateTimeoutRef.current) clearTimeout(validateTimeoutRef.current);
    validateTimeoutRef.current = setTimeout(() => {
      validate(id, sourceCode);
    }, 500);
    return () => {
      if (validateTimeoutRef.current) clearTimeout(validateTimeoutRef.current);
    };
  }, [sourceCode, scriptId, validate]);

  const hasErrors = validationErrors.length > 0;

  const workerHook = useExecuteScript();

  const handleRun = useCallback(async () => {
    if (!activeRuleset) throw new Error('No ruleset found.');
    if (!testCharacter) throw new Error('No test character found for the ruleset.');
    await workerHook.execute({
      scriptId: script?.id ?? 'script-editor-run',
      sourceCode,
      characterId: testCharacter.id,
      targetId: testCharacter.id,
      rulesetId: activeRuleset.id,
      triggerType: 'load',
    });
  }, [activeRuleset, testCharacter, script?.id, sourceCode, workerHook.execute]);

  const handleSave = async () => {
    if (!rulesetId) return;
    const payload: Partial<Script> = {
      name: name || 'Untitled',
      sourceCode,
      entityType,
      entityId: entityType === 'global' ? null : entityId,
      isGlobal: entityType === 'global',
      enabled: true,
    };
    if (isNew) {
      const id = await createScript(payload);
      if (id) {
        localStorage.removeItem(DRAFT_KEY('new'));
        navigate(`/rulesets/${rulesetId}/scripts/${id}`, { replace: true });
      }
    } else if (script) {
      await updateScript(script.id, payload);
    }
  };

  const handleCancel = () => navigate(`/rulesets/${rulesetId}/scripts`);

  const handleDelete = async () => {
    if (!script || isNew) return;
    if (window.confirm('Delete this script? This cannot be undone.')) {
      await deleteScript(script.id);
      navigate(`/rulesets/${rulesetId}/scripts`);
    }
  };

  return (
    <div className='flex flex-col h-full min-h-0'>
      {/* Header */}
      <div className='border-b p-4 flex flex-wrap items-end gap-4'>
        <div className='flex flex-col gap-2 flex-1 min-w-[200px]'>
          <Label htmlFor='script-name'>Name</Label>
          <Input
            id='script-name'
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='Script name'
          />
        </div>
        <div className='flex flex-col gap-2 w-[140px]'>
          <Label>Type</Label>
          <Select
            value={entityType}
            onValueChange={(v: Script['entityType']) => {
              setEntityType(v);
              if (v === 'global') setEntityId(null);
            }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_TYPES.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {entityType === 'attribute' && (
          <div className='w-[240px]'>
            <AttributeLookup
              label='Attribute'
              value={entityId}
              onSelect={(attr: Attribute) => setEntityId(attr.id)}
              onDelete={() => setEntityId(null)}
            />
          </div>
        )}
        {entityType === 'action' && (
          <div className='w-[240px]'>
            <ActionLookup
              label='Action'
              value={entityId}
              onSelect={(a: Action) => setEntityId(a.id)}
              onDelete={() => setEntityId(null)}
            />
          </div>
        )}
        {entityType === 'item' && (
          <div className='w-[240px]'>
            <ItemLookup
              label='Item'
              value={entityId}
              onSelect={(i: Item) => setEntityId(i.id)}
              onDelete={() => setEntityId(null)}
            />
          </div>
        )}
        <div className='flex gap-2 justify-center min-w-[225px]'>
          <Button
            onClick={handleRun}
            disabled={workerHook.isExecuting || !activeRuleset || !testCharacter || hasErrors}
            variant='secondary'>
            <Zap className='h-4 w-4 mr-2' />
            {workerHook.isExecuting ? 'Running...' : 'Run'}
          </Button>
          <Button onClick={handleSave} disabled={hasErrors || isValidating} variant='default'>
            {isValidating ? '...' : 'Save'}
          </Button>
          <Button variant='outline' onClick={handleCancel}>
            Cancel
          </Button>
          {!isNew && script && (
            <Button variant='destructive' onClick={handleDelete}>
              <Trash2 className='h-4 w-4' />
            </Button>
          )}
        </div>
      </div>

      <div className='flex-1 flex flex-col min-h-0 gap-4'>
        <div className='flex flex-col gap-2 flex-1 min-h-0 p-2'>
          <div>
            <Label>Source</Label>
            {testCharacter && (
              <p className='text-sm text-muted-foreground'>
                Run uses test character: <strong>{testCharacter.name}</strong>
              </p>
            )}
          </div>
          <CodeMirrorEditor
            key={scriptId ?? 'new'}
            value={sourceCode}
            onChange={setSourceCode}
            onSave={handleSave}
            height='320px'
            readOnly={workerHook.isExecuting || !activeRuleset || !testCharacter}
            className='flex-1 min-h-0 rounded-md border overflow-hidden'
          />
        </div>

        {/* Editor + panels */}
        <div className='flex-1 flex flex-col min-h-0 p-4 gap-4'>
          {/* Validation */}
          {hasErrors && (
            <Alert variant='destructive'>
              <AlertCircle className='h-4 w-4' />
              <AlertTitle>Validation errors</AlertTitle>
              <AlertDescription>
                <ul className='list-disc list-inside text-sm mt-1'>
                  {validationErrors.map((e, i) => (
                    <li key={i}>
                      {e.line != null && e.column != null
                        ? `Line ${e.line}: ${e.message}`
                        : e.message}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {activeRuleset && !testCharacter && (
            <Alert className='border-yellow-500 bg-yellow-50 dark:bg-yellow-950'>
              <AlertTitle className='text-yellow-800 dark:text-yellow-200'>
                No test character
              </AlertTitle>
              <AlertDescription className='text-yellow-800 dark:text-yellow-200'>
                Run is disabled. A test character is created automatically when you create a
                ruleset; ensure one exists for this ruleset to run scripts.
              </AlertDescription>
            </Alert>
          )}

          {/* Console + Error log tabs */}
          <Tabs defaultValue='console' className='flex-1 flex flex-col min-h-0'>
            <TabsList>
              <TabsTrigger value='console'>Console</TabsTrigger>
              <TabsTrigger value='errors'>Script errors</TabsTrigger>
            </TabsList>
            <TabsContent value='console' className='flex-1 min-h-0 mt-2 flex flex-col gap-4'>
              {/* Last run output (same pattern as script-playground) */}
              {(workerHook.executionTime !== null || workerHook.error) && (
                <div className='rounded-md border bg-muted/20 flex flex-col'>
                  <div className='flex items-center justify-between px-3 py-2 border-b'>
                    <h3 className='text-sm font-semibold'>Last run</h3>
                    {workerHook.executionTime !== null && (
                      <p className='text-xs text-muted-foreground'>
                        Executed in {workerHook.executionTime.toFixed(2)}ms
                      </p>
                    )}
                  </div>
                  <ScrollArea className='h-48'>
                    <div className='space-y-3 p-3'>
                      {workerHook.error ? (
                        <div className='p-3 bg-destructive/10 border border-destructive rounded-md'>
                          <p className='text-sm font-semibold text-destructive mb-1'>Error</p>
                          <p className='text-sm font-mono text-destructive'>
                            {workerHook.error.message}
                          </p>
                        </div>
                      ) : (
                        <>
                          {workerHook.result !== null && workerHook.result !== undefined && (
                            <div>
                              <Label className='text-sm font-semibold mb-2 block'>Result</Label>
                              <div className='p-3 bg-background border rounded-md'>
                                <pre className='text-sm font-mono whitespace-pre-wrap'>
                                  {JSON.stringify(workerHook.result, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                          {workerHook.announceMessages.length > 0 && (
                            <div>
                              <Label className='text-sm font-semibold mb-2 block'>
                                Announcements
                              </Label>
                              <div className='space-y-2'>
                                {workerHook.announceMessages.map((msg, i) => (
                                  <div key={i} className='p-2 bg-primary/10 rounded-md text-sm'>
                                    📢 {msg}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {workerHook.logMessages.length > 0 && (
                            <div>
                              <Label className='text-sm font-semibold mb-2 block'>Logs</Label>
                              <div className='space-y-1'>
                                {workerHook.logMessages.map((args, i) => (
                                  <div
                                    key={i}
                                    className='p-2 bg-background border rounded-md text-sm font-mono'>
                                    🔍 {args.map((arg) => JSON.stringify(arg)).join(' ')}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {!workerHook.error &&
                            workerHook.announceMessages.length === 0 &&
                            workerHook.logMessages.length === 0 &&
                            workerHook.result === null && (
                              <p className='text-sm text-muted-foreground italic'>No output</p>
                            )}
                        </>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}
              <ConsolePanel />
            </TabsContent>
            <TabsContent value='errors' className='flex-1 min-h-0 mt-2'>
              <ScriptErrorLog errors={scriptErrors} onDismiss={dismissError} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
