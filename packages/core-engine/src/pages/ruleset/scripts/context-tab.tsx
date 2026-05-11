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
} from '@quest-bound/core-ui/api-components';
import type {
  Action,
  Archetype,
  Attribute,
  Item,
  Script,
  ScriptParameterDefinition,
} from '@/types';
import type { Dispatch, SetStateAction } from 'react';
import { AttributeControls } from './script-editor/attribute-controls';
import { EventControls } from './script-editor/event-controls';
import { GameManagerParameters } from './script-editor/game-manager-parameters';
import { CAMPAIGN_TYPE_OPTIONS, ENTITY_TYPE_OPTIONS } from './utils';

interface ContextTabProps {
  rulesetId: string;
  campaignId?: string;
  name: string;
  setName: (v: string) => void;
  entityType: Script['entityType'];
  setEntityType: Dispatch<SetStateAction<Script['entityType']>>;
  entityId: string | null;
  setEntityId: (id: string | null) => void;
  parameters: ScriptParameterDefinition[];
  setParameters: (next: ScriptParameterDefinition[]) => void;
  scriptAttributeIds: string[];
  executeActionEvent: React.ComponentProps<typeof EventControls>['executeActionEvent'];
  executeItemEvent: React.ComponentProps<typeof EventControls>['executeItemEvent'];
  executeArchetypeEvent: React.ComponentProps<typeof EventControls>['executeArchetypeEvent'];
}

export function ContextTab({
  rulesetId,
  campaignId,
  name,
  setName,
  entityType,
  setEntityType,
  entityId,
  setEntityId,
  parameters,
  setParameters,
  scriptAttributeIds,
  executeActionEvent,
  executeItemEvent,
  executeArchetypeEvent,
}: ContextTabProps) {
  const typeOptions = (campaignId ? CAMPAIGN_TYPE_OPTIONS : ENTITY_TYPE_OPTIONS).filter(
    (opt) => opt.value !== 'all',
  );

  const usesEvents =
    entityType === 'action' || entityType === 'item' || entityType === 'archetype';

  return (
    <div className='p-4 flex flex-col gap-4 overflow-y-auto'>
      <div className='flex flex-col gap-3'>
        <div className='flex flex-col gap-1.5'>
          <Label htmlFor='script-name' className='text-xs uppercase tracking-wider text-muted-foreground'>
            Name
          </Label>
          <Input
            id='script-name'
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='Script name'
            className='h-9'
          />
        </div>

        <div className='flex flex-col gap-1.5'>
          <Label className='text-xs uppercase tracking-wider text-muted-foreground'>Type</Label>
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
              {typeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {entityType === 'attribute' && (
          <AttributeLookup
            label='Attribute'
            value={entityId}
            onSelect={(attr: Attribute) => setEntityId(attr.id)}
            onDelete={() => setEntityId(null)}
          />
        )}
        {entityType === 'action' && (
          <ActionLookup
            label='Action'
            value={entityId}
            onSelect={(a: Action) => setEntityId(a.id)}
            onDelete={() => setEntityId(null)}
            data-testid='script-editor-action-lookup'
          />
        )}
        {entityType === 'item' && (
          <ItemLookup
            label='Item'
            value={entityId}
            onSelect={(i: Item) => setEntityId(i.id)}
            onDelete={() => setEntityId(null)}
            data-testid='script-editor-item-lookup'
          />
        )}
        {entityType === 'archetype' && (
          <ArchetypeLookup
            rulesetId={rulesetId}
            label='Archetype'
            value={entityId}
            onSelect={(a: Archetype) => setEntityId(a.id)}
            onDelete={() => setEntityId(null)}
            data-testid='script-editor-archetype-lookup'
          />
        )}
      </div>

      {usesEvents && (
        <div className='flex flex-col gap-2'>
          <div className='text-xs uppercase tracking-wider text-muted-foreground'>Test events</div>
          <EventControls
            entityType={entityType}
            entityId={entityId}
            executeActionEvent={executeActionEvent}
            executeItemEvent={executeItemEvent}
            executeArchetypeEvent={executeArchetypeEvent}
          />
        </div>
      )}

      {entityType === 'attribute' && (
        <div className='flex flex-col gap-2'>
          <div className='text-xs uppercase tracking-wider text-muted-foreground'>
            Dependent attributes
          </div>
          <AttributeControls
            scriptAttributeIds={scriptAttributeIds}
            associatedAttributeId={entityId}
          />
        </div>
      )}

      {entityType === 'gameManager' && (
        <div className='flex flex-col gap-2'>
          <div className='text-xs uppercase tracking-wider text-muted-foreground'>Parameters</div>
          <GameManagerParameters parameters={parameters} onChange={setParameters} />
        </div>
      )}
    </div>
  );
}
