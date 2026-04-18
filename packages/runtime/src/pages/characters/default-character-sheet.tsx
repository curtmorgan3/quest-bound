import { Button } from '@/components';
import { NumberInput } from '@/components/composites/number-input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useErrorHandler, useNotifications } from '@/hooks';
import {
  isCampaignPlayClientRelayForCampaign,
  isCampaignPlayHostBroadcastForCampaign,
} from '@/lib/campaign-play/campaign-play-action-relay';
import { broadcastHostCharacterDataAfterHostReactives } from '@/lib/campaign-play/realtime/campaign-play-host-character-broadcast';
import { sendCampaignPlayManualCharacterUpdate } from '@/lib/campaign-play/realtime/campaign-play-manual-broadcast';
import { runInitialAttributeSyncSafe, useCharacter } from '@/lib/compass-api';
import {
  executeArchetypeEvent,
  executeCharacterLoader,
} from '@/lib/compass-logic/reactive/event-handler-executor';
import { cn } from '@/lib/utils';
import { CharacterContext, DiceContext } from '@quest-bound/runtime/context';
import { db } from '@/stores';
import type { Action, CharacterAttribute, EntityCustomPropertyDef } from '@/types';
import { parseEntityCustomPropertiesJson } from '@/utils/parse-entity-custom-properties-json';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, ChevronDown, Loader2, Pin, Search } from 'lucide-react';
import { useCallback, useContext, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useCharacterArchetypes } from './character-archetypes-panel/use-character-archetypes';
import { CharacterPlayProviders } from './character-play-providers';

/** Query key when opening default sheet from ruleset window editor; back uses it to return to that window. */
const WINDOW_EDITOR_RETURN_QUERY = 'windowEditorReturn';

function sortedAttributes(attrs: CharacterAttribute[]): CharacterAttribute[] {
  return [...attrs].sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
  );
}

export function DefaultCharacterSheet() {
  const { characterId } = useParams<{ characterId: string }>();
  if (!characterId) {
    return null;
  }
  return (
    <CharacterPlayProviders characterId={characterId}>
      <DefaultCharacterSheetInner />
    </CharacterPlayProviders>
  );
}

function DefaultCharacterSheetInner() {
  const { characterId } = useParams<{ characterId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const windowEditorReturnWindowId = searchParams.get(WINDOW_EDITOR_RETURN_QUERY)?.trim() || null;

  const {
    character,
    characterAttributes,
    updateCharacterAttribute,
    campaignId,
    campaignSceneId,
    fireAction,
  } = useContext(CharacterContext);
  const { updateCharacter } = useCharacter(characterId);

  const handleDefaultSheetBack = useCallback(() => {
    if (windowEditorReturnWindowId && character.rulesetId) {
      navigate(
        `/rulesets/${character.rulesetId}/windows/${encodeURIComponent(windowEditorReturnWindowId)}`,
      );
      return;
    }
    navigate(`/characters/${characterId}`);
  }, [windowEditorReturnWindowId, character.rulesetId, characterId, navigate]);

  const ordered = useMemo(() => sortedAttributes(characterAttributes), [characterAttributes]);

  const rulesetActions =
    useLiveQuery(
      () =>
        character.rulesetId
          ? db.actions.where('rulesetId').equals(character.rulesetId).toArray()
          : Promise.resolve([] as Action[]),
      [character.rulesetId],
    ) ?? [];

  const sortedActions = useMemo(
    () =>
      [...rulesetActions].sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
      ),
    [rulesetActions],
  );

  const [sheetFilter, setSheetFilter] = useState('');
  const filterQuery = sheetFilter.trim().toLowerCase();

  const textFiltered = useMemo(() => {
    if (!filterQuery) return ordered;
    return ordered.filter((a) => a.title.toLowerCase().includes(filterQuery));
  }, [ordered, filterQuery]);

  const pinnedSet = useMemo(
    () => new Set(character.defaultSheetPinnedAttributeIds ?? []),
    [character.defaultSheetPinnedAttributeIds],
  );

  const { pinnedInView, unpinnedInView } = useMemo(() => {
    const pinned: CharacterAttribute[] = [];
    const unpinned: CharacterAttribute[] = [];
    for (const attr of textFiltered) {
      if (pinnedSet.has(attr.id)) pinned.push(attr);
      else unpinned.push(attr);
    }
    return { pinnedInView: pinned, unpinnedInView: unpinned };
  }, [textFiltered, pinnedSet]);

  const filteredActions = useMemo(() => {
    if (!filterQuery) return sortedActions;
    return sortedActions.filter((a) => a.title.toLowerCase().includes(filterQuery));
  }, [sortedActions, filterQuery]);

  const actionPinnedSet = useMemo(
    () => new Set(character.defaultSheetPinnedActionIds ?? []),
    [character.defaultSheetPinnedActionIds],
  );

  const { pinnedActionsInView, unpinnedActionsInView } = useMemo(() => {
    const pinned: Action[] = [];
    const unpinned: Action[] = [];
    for (const action of filteredActions) {
      if (actionPinnedSet.has(action.id)) pinned.push(action);
      else unpinned.push(action);
    }
    return { pinnedActionsInView: pinned, unpinnedActionsInView: unpinned };
  }, [filteredActions, actionPinnedSet]);

  const toggleDefaultSheetPin = useCallback(
    (attrRowId: string) => {
      const validIds = new Set(characterAttributes.map((a) => a.id));
      const current = (character.defaultSheetPinnedAttributeIds ?? []).filter((id) =>
        validIds.has(id),
      );
      const next = new Set(current);
      if (next.has(attrRowId)) next.delete(attrRowId);
      else next.add(attrRowId);
      void updateCharacter(character.id, {
        defaultSheetPinnedAttributeIds: Array.from(next),
      });
    },
    [character, characterAttributes, updateCharacter],
  );

  const toggleDefaultSheetActionPin = useCallback(
    (actionId: string) => {
      const validIds = new Set(rulesetActions.map((a) => a.id));
      const current = (character.defaultSheetPinnedActionIds ?? []).filter((id) =>
        validIds.has(id),
      );
      const next = new Set(current);
      if (next.has(actionId)) next.delete(actionId);
      else next.add(actionId);
      void updateCharacter(character.id, {
        defaultSheetPinnedActionIds: Array.from(next),
      });
    },
    [character, rulesetActions, updateCharacter],
  );

  const handleValueChange = useCallback(
    (rowId: string, value: string | number | boolean) => {
      void updateCharacterAttribute(rowId, { value });
    },
    [updateCharacterAttribute],
  );

  const [propertyPanelOpenByAttrId, setPropertyPanelOpenByAttrId] = useState<
    Record<string, boolean>
  >({});

  const handleAttributePropertyValueChange = useCallback(
    (attr: CharacterAttribute, propertyId: string, value: string | number | boolean) => {
      void updateCharacterAttribute(attr.id, {
        attributeCustomPropertyValues: {
          ...(attr.attributeCustomPropertyValues ?? {}),
          [propertyId]: value,
        },
      });
    },
    [updateCharacterAttribute],
  );

  const handleAttributeMinMaxChange = useCallback(
    (attrId: string, field: 'min' | 'max', val: number | '') => {
      void updateCharacterAttribute(
        attrId,
        (val === ''
          ? { [field]: undefined }
          : { [field]: val }) as Partial<CharacterAttribute>,
      );
    },
    [updateCharacterAttribute],
  );

  const diceContext = useContext(DiceContext);
  const rollDice = diceContext?.rollDice;

  const roll = useCallback(
    async (diceString: string, rerollMessage?: string) =>
      rollDice!(diceString, { rerollMessage }).then((res) => res.total),
    [rollDice],
  );

  const rollSplit = useCallback(
    async (diceString: string, rerollMessage?: string) =>
      rollDice!(diceString, { rerollMessage }).then((res) =>
        res.segments.flatMap((s) => s.rolls.map((r) => r.value)),
      ),
    [rollDice],
  );

  const { characterArchetypes } = useCharacterArchetypes(character.id, {
    campaignId,
    campaignSceneId,
    roll,
    rollSplit,
  });

  const { addNotification } = useNotifications();
  const { handleError } = useErrorHandler();

  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const busy = pendingAction !== null;
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [loaderConfirmOpen, setLoaderConfirmOpen] = useState(false);

  const handleFireActionClick = useCallback(
    async (actionId: string) => {
      setPendingAction(`action:${actionId}`);
      try {
        await fireAction(actionId);
      } finally {
        setPendingAction(null);
      }
    },
    [fireAction],
  );

  const handleResetToDefaults = useCallback(async () => {
    if (characterAttributes.length === 0) return;
    setResetConfirmOpen(false);
    setPendingAction('reset');
    try {
      const now = new Date().toISOString();
      const rows: CharacterAttribute[] = characterAttributes.map((attr) => ({
        ...attr,
        value: attr.defaultValue,
        updatedAt: now,
      }));
      await db.characterAttributes.bulkPut(rows);

      if (campaignId && rows.length > 0) {
        const batches = [
          {
            table: 'characterAttributes' as const,
            rows: rows.map((r) => ({ ...r }) as Record<string, unknown>),
          },
        ];
        if (isCampaignPlayClientRelayForCampaign(campaignId)) {
          await sendCampaignPlayManualCharacterUpdate({
            campaignId,
            campaignSceneId,
            batches,
          });
        } else if (isCampaignPlayHostBroadcastForCampaign(campaignId)) {
          await broadcastHostCharacterDataAfterHostReactives({
            campaignId,
            campaignSceneId,
            batches,
          });
        }
      }

      if (character.rulesetId) {
        await runInitialAttributeSyncSafe(character.id, character.rulesetId, addNotification);
      }
    } catch (e) {
      handleError(e as Error, {
        component: 'DefaultCharacterSheet/resetToDefaults',
        severity: 'medium',
      });
    } finally {
      setPendingAction(null);
    }
  }, [
    character.id,
    character.rulesetId,
    characterAttributes,
    campaignId,
    campaignSceneId,
    addNotification,
    handleError,
  ]);

  const handleRunCharacterLoader = useCallback(async () => {
    if (!character.rulesetId) return;
    setPendingAction('loader');
    try {
      const result = await executeCharacterLoader(db, character.id, character.rulesetId, roll);
      if (result.error) {
        addNotification(`Character Loader failed | ${result.error.message}`, { type: 'error' });
      }
    } catch (e) {
      handleError(e as Error, {
        component: 'DefaultCharacterSheet/runCharacterLoader',
        severity: 'medium',
      });
    } finally {
      setPendingAction(null);
    }
  }, [character.id, character.rulesetId, roll, addNotification, handleError]);

  const handleArchetypeOnAddClick = useCallback(
    async (archetypeId: string) => {
      setPendingAction(`archetype:${archetypeId}`);
      try {
        const result = await executeArchetypeEvent(
          db,
          archetypeId,
          character.id,
          'on_add',
          roll,
          campaignId,
          rollSplit,
          campaignSceneId,
        );
        if (result.error) {
          addNotification(`Archetype on_add failed | ${result.error.message}`, { type: 'error' });
        }
      } catch (e) {
        handleError(e as Error, {
          component: 'DefaultCharacterSheet/archetypeOnAdd',
          severity: 'medium',
        });
      } finally {
        setPendingAction(null);
      }
    },
    [character.id, roll, rollSplit, campaignId, campaignSceneId, addNotification, handleError],
  );

  if (!characterId) {
    return null;
  }

  const renderActionPinButton = (action: Action) => {
    const pinned = actionPinnedSet.has(action.id);
    return (
      <Button
        type='button'
        variant='ghost'
        size='icon'
        className='h-8 w-8 shrink-0'
        onClick={() => toggleDefaultSheetActionPin(action.id)}
        title={pinned ? 'Unpin from top' : 'Pin to top'}
        aria-label={pinned ? `Unpin ${action.title} from top` : `Pin ${action.title} to top`}
        aria-pressed={pinned}>
        <Pin className={cn('size-4', pinned && 'fill-current')} />
      </Button>
    );
  };

  const renderPinButton = (attr: CharacterAttribute) => {
    const pinned = pinnedSet.has(attr.id);
    return (
      <Button
        type='button'
        variant='ghost'
        size='icon'
        className='h-8 w-8 shrink-0'
        onClick={() => toggleDefaultSheetPin(attr.id)}
        title={pinned ? 'Unpin from top' : 'Pin to top'}
        aria-label={pinned ? `Unpin ${attr.title} from top` : `Pin ${attr.title} to top`}
        aria-pressed={pinned}>
        <Pin className={cn('size-4', pinned && 'fill-current')} />
      </Button>
    );
  };

  const renderAttributePropertySection = (attr: CharacterAttribute) => {
    const defs = parseEntityCustomPropertiesJson(attr.customProperties);
    if (defs.length === 0) return null;

    const open = propertyPanelOpenByAttrId[attr.id] ?? false;

    const valueForDef = (def: EntityCustomPropertyDef) => {
      const stored = attr.attributeCustomPropertyValues?.[def.id];
      if (stored !== undefined) return stored;
      return def.defaultValue;
    };

    return (
      <Collapsible
        open={open}
        onOpenChange={(next) =>
          setPropertyPanelOpenByAttrId((prev) => ({ ...prev, [attr.id]: next }))
        }>
        <CollapsibleTrigger asChild>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='text-muted-foreground hover:text-foreground h-auto w-full justify-between gap-2 px-2 py-1.5 font-normal'
            aria-expanded={open}
            aria-label={open ? 'Hide attribute properties' : 'Show attribute properties'}>
            <span className='text-xs font-medium tracking-wide uppercase'>
              Properties{' '}
              <span className='text-muted-foreground/80 font-normal normal-case'>
                ({defs.length})
              </span>
            </span>
            <ChevronDown
              className={cn('size-4 shrink-0 transition-transform', open && 'rotate-180')}
              aria-hidden
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className='border-border space-y-3 border-l-2 py-2 pl-3'>
            {attr.type === 'number' ? (
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <div className='flex flex-col gap-1.5'>
                  <Label className='text-sm'>Min</Label>
                  <NumberInput
                    value={
                      attr.min !== undefined && Number.isFinite(attr.min) ? attr.min : ''
                    }
                    onChange={(val) => handleAttributeMinMaxChange(attr.id, 'min', val)}
                    className='h-9 w-full rounded-md border border-input px-3'
                  />
                </div>
                <div className='flex flex-col gap-1.5'>
                  <Label className='text-sm'>Max</Label>
                  <NumberInput
                    value={
                      attr.max !== undefined && Number.isFinite(attr.max) ? attr.max : ''
                    }
                    onChange={(val) => handleAttributeMinMaxChange(attr.id, 'max', val)}
                    className='h-9 w-full rounded-md border border-input px-3'
                  />
                </div>
              </div>
            ) : null}
            {defs.map((def) => {
              const propControlId = `default-sheet-attr-${attr.id}-prop-${def.id}`;
              const v = valueForDef(def);
              if (def.type === 'boolean') {
                const checked = v === true;
                return (
                  <div key={def.id} className='flex items-center gap-2'>
                    <Checkbox
                      id={propControlId}
                      checked={checked}
                      onCheckedChange={(next) =>
                        handleAttributePropertyValueChange(attr, def.id, next === true)
                      }
                    />
                    <Label htmlFor={propControlId} className='cursor-pointer text-sm font-normal'>
                      {def.name}
                    </Label>
                  </div>
                );
              }
              if (def.type === 'number') {
                const num = typeof v === 'number' ? v : Number(v);
                return (
                  <div key={def.id} className='flex flex-col gap-1.5'>
                    <Label htmlFor={propControlId}>{def.name}</Label>
                    <NumberInput
                      value={Number.isFinite(num) ? num : ''}
                      onChange={(val) =>
                        handleAttributePropertyValueChange(attr, def.id, val === '' ? 0 : val)
                      }
                      className='h-9 w-full rounded-md border border-input px-3'
                    />
                  </div>
                );
              }
              return (
                <div key={def.id} className='flex flex-col gap-1.5'>
                  <Label htmlFor={propControlId}>{def.name}</Label>
                  <Input
                    id={propControlId}
                    type='text'
                    value={typeof v === 'string' ? v : String(v ?? '')}
                    onChange={(e) =>
                      handleAttributePropertyValueChange(attr, def.id, e.target.value)
                    }
                  />
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  const renderAttributeRow = (attr: CharacterAttribute) => {
    const controlId = `default-sheet-attr-${attr.id}`;
    const pin = renderPinButton(attr);

    switch (attr.type) {
      case 'string':
        return (
          <div key={attr.id} className='flex gap-2'>
            {pin}
            <div className='flex min-w-0 flex-1 flex-col gap-2'>
              <Label htmlFor={controlId}>{attr.title}</Label>
              <Input
                id={controlId}
                type='text'
                value={typeof attr.value === 'string' ? attr.value : ''}
                onChange={(e) => handleValueChange(attr.id, e.target.value)}
              />
              {renderAttributePropertySection(attr)}
            </div>
          </div>
        );
      case 'number':
        return (
          <div key={attr.id} className='flex gap-2'>
            {pin}
            <div className='flex min-w-0 flex-1 flex-col gap-2'>
              <Label>{attr.title}</Label>
              <NumberInput
                value={typeof attr.value === 'number' ? attr.value : ''}
                wheelMin={attr.min}
                wheelMax={attr.max}
                inputMin={attr.min}
                inputMax={attr.max}
                onChange={(val) => handleValueChange(attr.id, val === '' ? 0 : val)}
                className='h-9 w-full rounded-md border border-input px-3'
              />
              {renderAttributePropertySection(attr)}
            </div>
          </div>
        );
      case 'boolean': {
        const checked = attr.value === true;
        return (
          <div key={attr.id} className='flex gap-2'>
            {pin}
            <div className='flex min-w-0 flex-1 flex-col gap-2'>
              <div className='flex items-center gap-2'>
                <Checkbox
                  id={controlId}
                  checked={checked}
                  onCheckedChange={(next) => handleValueChange(attr.id, next === true)}
                />
                <Label htmlFor={controlId} className='cursor-pointer text-sm font-normal'>
                  {attr.title}
                </Label>
              </div>
              {renderAttributePropertySection(attr)}
            </div>
          </div>
        );
      }
      case 'list': {
        const options = attr.options ?? [];
        const currentValue = typeof attr.value === 'string' ? attr.value : '';
        const selectedIndex = options.findIndex((o) => o === currentValue);
        const selectValue = selectedIndex >= 0 ? String(selectedIndex) : '';
        return (
          <div key={attr.id} className='flex gap-2'>
            {pin}
            <div className='flex min-w-0 flex-1 flex-col gap-2'>
              <Label htmlFor={controlId}>{attr.title}</Label>
              <Select
                value={selectValue}
                onValueChange={(val) => {
                  const index = parseInt(val, 10);
                  if (index >= 0 && index < options.length) {
                    handleValueChange(attr.id, options[index]!);
                  }
                }}>
                <SelectTrigger id={controlId} className='h-9 w-full'>
                  <SelectValue placeholder='Select…' />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {renderAttributePropertySection(attr)}
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  const hasAnyInView = pinnedInView.length > 0 || unpinnedInView.length > 0;
  const hasAnyActionsInView = pinnedActionsInView.length > 0 || unpinnedActionsInView.length > 0;

  return (
    <div className='relative flex h-full min-h-0 flex-col'>
      {pendingAction === 'reset' ? (
        <div
          className='bg-background/70 absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 backdrop-blur-[1px]'
          role='status'
          aria-busy='true'
          aria-live='polite'>
          <Loader2 className='text-muted-foreground size-8 animate-spin' aria-hidden />
          <p className='text-muted-foreground text-sm'>Resetting attributes…</p>
        </div>
      ) : null}
      <header className='flex shrink-0 items-center gap-4 border-b p-4'>
        <Button variant='ghost' size='sm' onClick={handleDefaultSheetBack}>
          <ArrowLeft className='size-4' />
        </Button>
        <div className='bg-muted size-12 shrink-0 overflow-hidden rounded-md border'>
          {character.image ? (
            <img src={character.image} alt={character.name} className='size-full object-cover' />
          ) : (
            <div className='text-muted-foreground flex size-full items-center justify-center text-lg font-medium'>
              {(character.name?.trim() || '?').slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <div className='min-w-0 flex-1'>
          <h1 className='truncate text-xl font-semibold'>{character.name}</h1>
          <p className='text-muted-foreground text-sm'>Default Sheet</p>
        </div>
      </header>
      <div className='shrink-0 border-b px-4 py-3'>
        <div className='relative w-full max-w-2xl'>
          <Search
            className='text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2'
            aria-hidden
          />
          <Input
            id='default-sheet-filter'
            type='search'
            placeholder='Filter attributes and actions…'
            value={sheetFilter}
            onChange={(e) => setSheetFilter(e.target.value)}
            className='pl-9'
            aria-label='Filter attributes and actions'
          />
        </div>
      </div>
      <div className='flex min-h-0 flex-1 flex-row'>
        <div className='min-h-0 min-w-0 flex-1 overflow-y-auto p-4'>
          <div className='flex w-full max-w-2xl flex-col gap-6'>
            {!hasAnyInView ? (
              <p className='text-muted-foreground text-sm'>
                {filterQuery ? 'No attributes match your filter.' : 'No attributes yet.'}
              </p>
            ) : null}
            {pinnedInView.map((attr) => renderAttributeRow(attr))}
            {pinnedInView.length > 0 && unpinnedInView.length > 0 ? (
              <div className='border-border border-t' role='separator' />
            ) : null}
            {unpinnedInView.map((attr) => renderAttributeRow(attr))}
          </div>
        </div>
        <aside className='border-border bg-muted/10 flex w-[min(17rem,32vw)] shrink-0 flex-col gap-3 overflow-y-auto border-l p-4'>
          <p className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
            Actions
          </p>
          <div className='flex flex-col gap-2'>
            {!hasAnyActionsInView ? (
              <p className='text-muted-foreground text-sm'>
                {rulesetActions.length === 0
                  ? 'No actions in this ruleset.'
                  : 'No actions match your filter.'}
              </p>
            ) : (
              <>
                {pinnedActionsInView.map((action) => (
                  <div key={action.id} className='flex gap-2'>
                    {renderActionPinButton(action)}
                    <Button
                      type='button'
                      variant='secondary'
                      className='inline-flex h-auto min-h-9 min-w-0 flex-1 items-center justify-start gap-2 whitespace-normal px-3 py-2 text-left text-sm'
                      disabled={busy}
                      onClick={() => void handleFireActionClick(action.id)}>
                      {pendingAction === `action:${action.id}` ? (
                        <Loader2 className='size-4 shrink-0 animate-spin' aria-hidden />
                      ) : null}
                      {action.title}
                    </Button>
                  </div>
                ))}
                {pinnedActionsInView.length > 0 && unpinnedActionsInView.length > 0 ? (
                  <div className='border-border border-t' role='separator' />
                ) : null}
                {unpinnedActionsInView.map((action) => (
                  <div key={action.id} className='flex gap-2'>
                    {renderActionPinButton(action)}
                    <Button
                      type='button'
                      variant='secondary'
                      className='inline-flex h-auto min-h-9 min-w-0 flex-1 items-center justify-start gap-2 whitespace-normal px-3 py-2 text-left text-sm'
                      disabled={busy}
                      onClick={() => void handleFireActionClick(action.id)}>
                      {pendingAction === `action:${action.id}` ? (
                        <Loader2 className='size-4 shrink-0 animate-spin' aria-hidden />
                      ) : null}
                      {action.title}
                    </Button>
                  </div>
                ))}
              </>
            )}
          </div>
        </aside>
        <aside className='border-border bg-muted/15 flex w-[min(18rem,40vw)] shrink-0 flex-col gap-3 overflow-y-auto border-l p-4'>
          <p className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>Reset</p>
          <div className='flex flex-col gap-2'>
            <Button
              type='button'
              variant='outline'
              className='inline-flex h-auto min-h-9 w-full items-center justify-start gap-2 whitespace-normal px-3 py-2 text-left'
              disabled={busy || characterAttributes.length === 0}
              onClick={() => setResetConfirmOpen(true)}>
              {pendingAction === 'reset' ? (
                <Loader2 className='size-4 shrink-0 animate-spin' aria-hidden />
              ) : null}
              Reset to Defaults
            </Button>
            <Button
              type='button'
              variant='outline'
              className='inline-flex h-auto min-h-9 w-full items-center justify-start gap-2 whitespace-normal px-3 py-2 text-left'
              disabled={busy}
              onClick={() => setLoaderConfirmOpen(true)}>
              {pendingAction === 'loader' ? (
                <Loader2 className='size-4 shrink-0 animate-spin' aria-hidden />
              ) : null}
              Run Character Loader
            </Button>
          </div>
          {characterArchetypes.length > 0 ? (
            <>
              <div className='border-border border-t pt-3' role='separator' />
              <p className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
                Archetypes
              </p>
              <div className='flex flex-col gap-2'>
                {characterArchetypes.map((ca) => (
                  <Button
                    key={ca.id}
                    type='button'
                    variant='secondary'
                    className='inline-flex h-auto min-h-9 w-full items-center justify-start gap-2 whitespace-normal px-3 py-2 text-left text-sm'
                    disabled={busy}
                    onClick={() => void handleArchetypeOnAddClick(ca.archetype.id)}>
                    {pendingAction === `archetype:${ca.archetype.id}` ? (
                      <Loader2 className='size-4 shrink-0 animate-spin' aria-hidden />
                    ) : null}
                    Re-add {ca.archetype.name} Archetype
                  </Button>
                ))}
              </div>
            </>
          ) : null}
        </aside>
      </div>

      <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset all attributes to defaults?</AlertDialogTitle>
            <AlertDialogDescription>
              Every attribute value will be set to its ruleset default. This is not automatically
              reversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy || characterAttributes.length === 0}
              onClick={() => void handleResetToDefaults()}>
              Reset to defaults
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={loaderConfirmOpen} onOpenChange={setLoaderConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Run Character Loader?</AlertDialogTitle>
            <AlertDialogDescription>
              This runs the ruleset&apos;s Character Loader script for this character. It may change
              attributes, inventory, and other character data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={() => void handleRunCharacterLoader()}>
              Run loader
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
