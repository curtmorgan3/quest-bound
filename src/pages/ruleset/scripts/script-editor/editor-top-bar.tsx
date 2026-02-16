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
import {
  ActionLookup,
  AttributeLookup,
  ItemLookup,
  useRulesets,
  useScripts,
} from '@/lib/compass-api';
import { type UseReactiveScriptExecutionResult } from '@/lib/compass-logic';
import type { Action, Attribute, Item, Script } from '@/types';
import { Trash2, X, Zap } from 'lucide-react';
import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const ENTITY_TYPES = [
  { value: 'attribute', label: 'Attribute' },
  { value: 'action', label: 'Action' },
  { value: 'item', label: 'Item' },
  { value: 'global', label: 'Global' },
] as const;

interface EditorTopBar {
  name: string;
  setName: (name: string) => void;
  entityType: Script['entityType'];
  setEntityType: Dispatch<SetStateAction<'attribute' | 'action' | 'item' | 'global'>>;
  entityId: string | null;
  setEntityId: (id: string | null) => void;
  sourceCode: string;
  saveDisabled?: boolean;
  scriptExecutionHook: UseReactiveScriptExecutionResult;
}

export const EditorTopBar = ({
  name,
  setName,
  entityType,
  setEntityType,
  entityId,
  setEntityId,
  sourceCode,
  saveDisabled,
  scriptExecutionHook,
}: EditorTopBar) => {
  const navigate = useNavigate();
  const { rulesetId, scriptId } = useParams<{ rulesetId: string; scriptId: string }>();
  const { scripts, createScript, updateScript, deleteScript } = useScripts();
  const { activeRuleset, testCharacter } = useRulesets();

  const isNew = scriptId === 'new';
  const script = isNew ? null : (scripts.find((s) => s.id === scriptId) ?? null);

  const handleRun = useCallback(async () => {
    if (!activeRuleset) throw new Error('No ruleset found.');
    if (!testCharacter) throw new Error('No test character found for the ruleset.');
    await scriptExecutionHook.execute({
      rulesetId: activeRuleset.id,
      scriptId: script?.id ?? 'script-editor-run',
      sourceCode,
      characterId: testCharacter.id,
      triggerType: 'load',
      // If this is an attribute script, trigger reactive updates for dependent scripts
      reactiveAttributeId: entityType === 'attribute' ? (entityId ?? undefined) : undefined,
      // So entity scripts get 'Self' = Owner.Attribute/Action/Item as appropriate
      entityType,
      entityId: entityId ?? undefined,
    });
  }, [
    activeRuleset,
    testCharacter,
    script?.id,
    sourceCode,
    scriptExecutionHook.execute,
    entityType,
    entityId,
  ]);

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
    <div className='border-b p-4 flex flex-wrap items-end gap-4'>
      <div className='flex flex-col gap-2 flex-1 min-w-[200px] max-w-[400px]'>
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
      <div className='flex justify-end items-center flex-1'>
        <div className='flex gap-2 justify-end min-w-[225px]'>
          <Button
            onClick={handleRun}
            disabled={
              scriptExecutionHook.isExecuting || !activeRuleset || !testCharacter || saveDisabled
            }
            variant='secondary'>
            <Zap className='h-4 w-4' />
            Run
          </Button>
          <Button onClick={handleSave} disabled={saveDisabled} variant='default'>
            Save
          </Button>
          <Button variant='outline' onClick={handleCancel}>
            <X className='h-4 w-4' />
          </Button>
          {!isNew && script && (
            <Button variant='destructive' onClick={handleDelete}>
              <Trash2 className='h-4 w-4' />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
