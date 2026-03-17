import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Checkbox,
} from '@/components';
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
  ArchetypeLookup,
  AttributeLookup,
  ItemLookup,
  useRulesets,
  useScripts,
} from '@/lib/compass-api';
import { type UseReactiveScriptExecutionResult } from '@/lib/compass-logic';
import { activateButtonStyle } from '@/palette';
import type {
  Action,
  Archetype,
  Attribute,
  Item,
  Script,
  ScriptParameterDefinition,
} from '@/types';
import { Trash2, X, Zap } from 'lucide-react';
import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CAMPAIGN_TYPE_OPTIONS, ENTITY_TYPE_OPTIONS } from '../utils';
import { CategoryField } from './category-field';

interface EditorTopBar {
  rulesetId: string;
  campaignId?: string;
  name: string;
  setName: (name: string) => void;
  entityType: Script['entityType'];
  setEntityType: Dispatch<SetStateAction<Script['entityType']>>;
  entityId: string | null;
  setEntityId: (id: string | null) => void;
  category: string | null;
  setCategory: (value: string | null) => void;
  sourceCode: string;
  saveDisabled?: boolean;
  scriptExecutionHook: UseReactiveScriptExecutionResult;
  parameters: ScriptParameterDefinition[];
}

export const EditorTopBar = ({
  rulesetId,
  campaignId,
  name,
  setName,
  entityType,
  setEntityType,
  entityId,
  setEntityId,
  category,
  setCategory,
  sourceCode,
  saveDisabled,
  scriptExecutionHook,
  parameters,
}: EditorTopBar) => {
  const navigate = useNavigate();
  const { scriptId } = useParams<{ scriptId: string }>();
  const { scripts, createScript, updateScript, deleteScript } = useScripts(campaignId);
  const { activeRuleset, testCharacter } = useRulesets();

  const isNew = scriptId === 'new';
  const script = isNew ? null : (scripts.find((s) => s.id === scriptId) ?? null);

  const entityTypes = (campaignId ? CAMPAIGN_TYPE_OPTIONS : ENTITY_TYPE_OPTIONS).filter(
    (opt) => !campaignId || opt.value !== 'all',
  );

  const handleRun = useCallback(async () => {
    if (!activeRuleset) throw new Error('No ruleset found.');
    if (!testCharacter) throw new Error('No test character found for the ruleset.');

    const paramsRecord =
      parameters && parameters.length
        ? Object.fromEntries(
            parameters
              .map((p) => ({
                key: p.label.trim(),
                value: p.defaultValue ?? null,
              }))
              .filter((p) => p.key.length > 0)
              .map((p) => [p.key, p.value]),
          )
        : undefined;

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
      ...(paramsRecord ? { params: paramsRecord } : {}),
    });
  }, [
    activeRuleset,
    testCharacter,
    script?.id,
    sourceCode,
    scriptExecutionHook.execute,
    entityType,
    entityId,
    parameters,
  ]);

  const handleSave = async () => {
    if (!rulesetId) return;
    const payload: Partial<Script> = {
      name: name || 'Untitled',
      sourceCode,
      entityType,
      entityId:
        entityType === 'global' || entityType === 'characterLoader' || entityType === 'gameManager'
          ? null
          : entityId,
      isGlobal: entityType === 'global',
      enabled: true,
      category: category ?? undefined,
      campaignId,
      parameters:
        parameters && parameters.length
          ? parameters.map((p) => ({
              ...p,
              label: p.label.trim(),
            }))
          : undefined,
    };
    if (isNew) {
      const id = await createScript(payload);
      if (id) {
        navigate(
          `/${campaignId ? 'campaigns' : 'rulesets'}/${campaignId ?? rulesetId}/scripts/${id}`,
          {
            replace: true,
          },
        );
      }
    } else if (script) {
      await updateScript(script.id, payload);
    }
  };

  const handleCancel = () =>
    navigate(campaignId ? `/campaigns/${campaignId}/scripts` : `/rulesets/${rulesetId}/scripts`);

  const handleDelete = async () => {
    if (!script || isNew) return;
    await deleteScript(script.id);
    navigate(campaignId ? `/campaigns/${campaignId}/scripts` : `/rulesets/${rulesetId}/scripts`);
  };

  return (
    <div className='border-b p-4 flex flex-wrap items-end gap-4'>
      <div className='flex flex-col gap-2 w-[200px]'>
        <Label htmlFor='script-name'>Name</Label>
        <Input
          id='script-name'
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='Script name'
        />
      </div>
      <div className='flex flex-col gap-2'>
        <Label>Type</Label>
        <Select
          value={entityType}
          onValueChange={(v: Script['entityType']) => {
            setEntityType(v);
            if (v === 'global' || v === 'characterLoader' || v === 'gameManager') {
              setEntityId(null);
            }
          }}>
          <SelectTrigger data-testid='script-editor-type'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {entityTypes.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className='w-[200px]'>
        <CategoryField value={category} onChange={setCategory} campaignScripts={!!campaignId} />
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
            data-testid='script-editor-action-lookup'
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
            data-testid='script-editor-item-lookup'
          />
        </div>
      )}
      {entityType === 'archetype' && (
        <div className='w-[240px]'>
          <ArchetypeLookup
            rulesetId={rulesetId}
            label='Archetype'
            value={entityId}
            onSelect={(a: Archetype) => setEntityId(a.id)}
            onDelete={() => setEntityId(null)}
            data-testid='script-editor-archetype-lookup'
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
            style={activateButtonStyle}
            variant='secondary'>
            <Zap className='h-4 w-4' />
            Run
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveDisabled}
            variant='default'
            data-testid='script-editor-save'>
            Save
          </Button>
          <Button variant='outline' onClick={handleCancel}>
            <X className='h-4 w-4' />
          </Button>
          {!isNew &&
            script &&
            (() => {
              const doNotAsk = localStorage.getItem('qb.confirmOnDelete') === 'false';
              if (doNotAsk) {
                return (
                  <Button variant='destructive' onClick={handleDelete}>
                    <Trash2 className='h-4 w-4' />
                  </Button>
                );
              }
              return (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant='destructive'>
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Permanently delete this content?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Permanently delete this content?
                      </AlertDialogDescription>
                      <div className='flex gap-2'>
                        <Label htmlFor='script-editor-do-not-ask-again'>Do not ask again</Label>
                        <Checkbox
                          id='script-editor-do-not-ask-again'
                          onCheckedChange={(checked) =>
                            localStorage.setItem('qb.confirmOnDelete', String(!checked))
                          }
                        />
                      </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              );
            })()}
        </div>
      </div>
    </div>
  );
};
