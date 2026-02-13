import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ActionLookup, AttributeLookup, ItemLookup } from '@/lib/compass-api';
import { useScriptErrors } from '@/lib/compass-api/hooks/scripts/use-script-errors';
import { useScripts } from '@/lib/compass-api/hooks/scripts/use-scripts';
import { CodeMirrorEditor } from '@/lib/compass-logic/editor';
import { useScriptValidation } from '@/lib/compass-logic/worker';
import type { Action, Attribute, Item, Script } from '@/types';
import { AlertCircle, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
      setSourceCode(script.sourceCode);
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
      console.log('id: ', id);
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

        <div className='flex-1 flex flex-col min-h-0 gap-4'>
          <div className='flex flex-col gap-2 flex-1 min-h-0'>
            <Label>Source</Label>
            <CodeMirrorEditor
              key={scriptId ?? 'new'}
              value={sourceCode}
              onChange={setSourceCode}
              onSave={handleSave}
              height='320px'
              className='rounded-md border overflow-hidden'
            />
          </div>

          {/* Console + Error log tabs */}
          <Tabs defaultValue='console' className='flex-1 flex flex-col min-h-0'>
            <TabsList>
              <TabsTrigger value='console'>Console</TabsTrigger>
              <TabsTrigger value='errors'>Script errors</TabsTrigger>
            </TabsList>
            <TabsContent value='console' className='flex-1 min-h-0 mt-2'>
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
