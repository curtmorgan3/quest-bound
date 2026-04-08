import { Button } from '@/components';
import { NumberInput } from '@/components/composites/number-input';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useErrorHandler, useNotifications } from '@/hooks';
import { useCharacter } from '@/lib/compass-api';
import {
  executeArchetypeEvent,
  executeCharacterLoader,
} from '@/lib/compass-logic/reactive/event-handler-executor';
import { cn } from '@/lib/utils';
import { CharacterContext, DiceContext, db } from '@/stores';
import type { Action, CharacterAttribute } from '@/types';
import { ArrowLeft, Loader2, Pin, Search } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useContext, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCharacterArchetypes } from './character-archetypes-panel/use-character-archetypes';
import { CharacterPlayProviders } from './character-play-providers';

function sortedAttributes(attrs: CharacterAttribute[]): CharacterAttribute[] {
  return [...attrs].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
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

  const {
    character,
    characterAttributes,
    updateCharacterAttribute,
    campaignId,
    campaignSceneId,
    fireAction,
  } = useContext(CharacterContext);
  const { updateCharacter } = useCharacter(characterId);

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

  const handleValueChange = useCallback(
    (rowId: string, value: string | number | boolean) => {
      void updateCharacterAttribute(rowId, { value });
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

  const handleFireActionClick = useCallback(
    async (actionId: string) => {
      setPendingAction(`action:${actionId}`);
      try {
        await (fireAction(actionId) as Promise<void>);
      } finally {
        setPendingAction(null);
      }
    },
    [fireAction],
  );

  const handleResetToDefaults = useCallback(async () => {
    if (characterAttributes.length === 0) return;
    setPendingAction('reset');
    try {
      await Promise.all(
        characterAttributes.map((attr) =>
          updateCharacterAttribute(attr.id, { value: attr.defaultValue }),
        ),
      );
    } catch (e) {
      handleError(e as Error, {
        component: 'DefaultCharacterSheet/resetToDefaults',
        severity: 'medium',
      });
    } finally {
      setPendingAction(null);
    }
  }, [characterAttributes, updateCharacterAttribute, handleError]);

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
            </div>
          </div>
        );
      case 'boolean': {
        const checked = attr.value === true;
        return (
          <div key={attr.id} className='flex items-center gap-2'>
            {pin}
            <Checkbox
              id={controlId}
              checked={checked}
              onCheckedChange={(next) => handleValueChange(attr.id, next === true)}
            />
            <Label htmlFor={controlId} className='cursor-pointer text-sm font-normal'>
              {attr.title}
            </Label>
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
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  const hasAnyInView = pinnedInView.length > 0 || unpinnedInView.length > 0;

  return (
    <div className='flex h-full min-h-0 flex-col'>
      <header className='flex shrink-0 items-center gap-4 border-b p-4'>
        <Button variant='ghost' size='sm' onClick={() => navigate(`/characters/${characterId}`)}>
          <ArrowLeft className='size-4' />
        </Button>
        <div className='min-w-0'>
          <h1 className='truncate text-xl font-semibold'>{character.name}</h1>
          <p className='text-muted-foreground text-sm'>Default sheet (all attributes)</p>
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
            {filteredActions.length === 0 ? (
              <p className='text-muted-foreground text-sm'>
                {rulesetActions.length === 0
                  ? 'No actions in this ruleset.'
                  : 'No actions match your filter.'}
              </p>
            ) : (
              filteredActions.map((action) => (
                <Button
                  key={action.id}
                  type='button'
                  variant='secondary'
                  className='inline-flex h-auto min-h-9 w-full items-center justify-start gap-2 whitespace-normal px-3 py-2 text-left text-sm'
                  disabled={busy}
                  onClick={() => void handleFireActionClick(action.id)}>
                  {pendingAction === `action:${action.id}` ? (
                    <Loader2 className='size-4 shrink-0 animate-spin' aria-hidden />
                  ) : null}
                  {action.title}
                </Button>
              ))
            )}
          </div>
        </aside>
        <aside className='border-border bg-muted/15 flex w-[min(18rem,40vw)] shrink-0 flex-col gap-3 overflow-y-auto border-l p-4'>
          <p className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
            Reset
          </p>
          <div className='flex flex-col gap-2'>
            <Button
              type='button'
              variant='outline'
              className='inline-flex h-auto min-h-9 w-full items-center justify-start gap-2 whitespace-normal px-3 py-2 text-left'
              disabled={busy || characterAttributes.length === 0}
              onClick={() => void handleResetToDefaults()}>
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
              onClick={() => void handleRunCharacterLoader()}>
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
                    Add {ca.archetype.name} Archetype
                  </Button>
                ))}
              </div>
            </>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
