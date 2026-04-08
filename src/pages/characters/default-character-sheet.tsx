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
import { useCampaignPlayClientForCharacter } from '@/hooks';
import {
  flushDelegatedUiQueueForCharacter,
  registerCampaignPlayDelegatedCharacterSurface,
} from '@/lib/campaign-play/realtime/campaign-play-delegated-ui-client';
import { cn } from '@/lib/utils';
import { useCharacter, useCharacterAttributes } from '@/lib/compass-api';
import type { CharacterAttribute } from '@/types';
import { ArrowLeft, Pin, Search } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

function sortedAttributes(attrs: CharacterAttribute[]): CharacterAttribute[] {
  return [...attrs].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
}

export function DefaultCharacterSheet() {
  const { characterId } = useParams<{ characterId: string }>();
  const navigate = useNavigate();

  const { playCampaignId, playCampaignSceneId } = useCampaignPlayClientForCharacter({
    characterId,
    propCampaignId: undefined,
    propCampaignSceneId: undefined,
    realtimePlayEnabled: true,
    campaignPlayClientBootstrapEnabled: true,
  });

  useLayoutEffect(() => {
    if (!characterId) return;
    const unregister = registerCampaignPlayDelegatedCharacterSurface(characterId);
    flushDelegatedUiQueueForCharacter(characterId);
    return unregister;
  }, [characterId]);

  const { character, updateCharacter } = useCharacter(characterId);

  const campaignPlayManualContext = useMemo(
    () =>
      playCampaignId
        ? { campaignId: playCampaignId, campaignSceneId: playCampaignSceneId }
        : undefined,
    [playCampaignId, playCampaignSceneId],
  );

  const { characterAttributes, updateCharacterAttribute, syncWithRuleset } = useCharacterAttributes(
    character?.id,
    campaignPlayManualContext,
  );

  useEffect(() => {
    if (!character?.id) return;
    void syncWithRuleset();
  }, [character?.id]);

  const ordered = useMemo(() => sortedAttributes(characterAttributes), [characterAttributes]);

  const [attributeFilter, setAttributeFilter] = useState('');
  const filterQuery = attributeFilter.trim().toLowerCase();

  const textFiltered = useMemo(() => {
    if (!filterQuery) return ordered;
    return ordered.filter((a) => a.title.toLowerCase().includes(filterQuery));
  }, [ordered, filterQuery]);

  const pinnedSet = useMemo(
    () => new Set(character?.defaultSheetPinnedAttributeIds ?? []),
    [character?.defaultSheetPinnedAttributeIds],
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

  const toggleDefaultSheetPin = useCallback(
    (attrRowId: string) => {
      if (!character?.id) return;
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

  const handleValueChange = useCallback((rowId: string, value: string | number | boolean) => {
    void updateCharacterAttribute(rowId, { value });
  }, [updateCharacterAttribute]);

  if (!characterId) {
    return null;
  }

  if (!character) {
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
            id='default-sheet-attribute-filter'
            type='search'
            placeholder='Filter attributes…'
            value={attributeFilter}
            onChange={(e) => setAttributeFilter(e.target.value)}
            className='pl-9'
            aria-label='Filter attributes'
          />
        </div>
      </div>
      <div className='min-h-0 flex-1 overflow-y-auto p-4'>
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
    </div>
  );
}
