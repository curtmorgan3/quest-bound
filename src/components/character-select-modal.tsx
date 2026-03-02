import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { useCharacterSelectModalStore } from '@/stores/character-select-modal-store';
import { db } from '@/stores';
import type { CampaignCharacter, Character } from '@/types';
import { cn } from '@/lib/utils';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';

type CharacterWithCampaign = {
  cc?: CampaignCharacter;
  character: Character;
};

export function CharacterSelectModal() {
  const { open, mode, title, description, rulesetId, campaignId, select, cancel } =
    useCharacterSelectModalStore();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      cancel();
      setSelectedIds(new Set());
    }
  };

  const resetSelection = () => {
    setSelectedIds(new Set());
  };

  const toggleSelected = (id: string, checked: boolean | string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const singleSelect = (id: string) => {
    if (mode === 'single') {
      select([id]);
      resetSelection();
    } else {
      toggleSelected(id, !selectedIds.has(id));
    }
  };

  const handleConfirm = () => {
    select(Array.from(selectedIds));
    resetSelection();
  };

  const { pcs, npcs } = useCharacterLists(rulesetId, campaignId);

  const hasAnyCharacters = pcs.length > 0 || npcs.length > 0;
  const modalTitle =
    (title && title.trim().length > 0 && title) || (mode === 'single' ? 'Select Character' : 'Select Characters');

  const disableConfirm = mode === 'multi' && selectedIds.size === 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='z-[1100] max-w-lg' overlayClassName='z-[1100]'>
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
          {description && description.trim().length > 0 && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        <div className='mt-2 flex max-h-[360px] flex-col gap-3'>
          {!hasAnyCharacters ? (
            <p className='text-sm text-muted-foreground'>
              No eligible characters are available to select.
            </p>
          ) : (
            <ScrollArea className='max-h-[280px] rounded-md border px-2 py-2'>
              <div className='flex flex-col gap-3'>
                {pcs.length > 0 && (
                  <div>
                    <p className='mb-1 text-xs font-semibold uppercase text-muted-foreground'>
                      Player Characters
                    </p>
                    <div className='flex flex-col gap-1'>
                      {pcs.map((entry) => (
                        <CharacterRow
                          key={entry.character.id}
                          mode={mode}
                          character={entry.character}
                          checked={selectedIds.has(entry.character.id)}
                          onCheckedChange={(checked) =>
                            mode === 'single'
                              ? singleSelect(entry.character.id)
                              : toggleSelected(entry.character.id, checked)
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}

                {npcs.length > 0 && (
                  <div>
                    <p className='mb-1 mt-2 text-xs font-semibold uppercase text-muted-foreground'>
                      NPCs
                    </p>
                    <div className='flex flex-col gap-1'>
                      {npcs.map((entry) => (
                        <CharacterRow
                          key={entry.character.id}
                          mode={mode}
                          character={entry.character}
                          checked={selectedIds.has(entry.character.id)}
                          onCheckedChange={(checked) =>
                            mode === 'single'
                              ? singleSelect(entry.character.id)
                              : toggleSelected(entry.character.id, checked)
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
        <div className='mt-4 flex justify-end gap-2'>
          <Button variant='outline' size='sm' onClick={cancel}>
            Cancel
          </Button>
          <Button size='sm' onClick={handleConfirm} disabled={disableConfirm || !hasAnyCharacters}>
            {mode === 'single'
              ? 'Select'
              : selectedIds.size === 0
                ? 'Select'
                : `Select ${selectedIds.size}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface CharacterRowProps {
  mode: 'single' | 'multi';
  character: Character;
  checked: boolean;
  onCheckedChange: (checked: boolean | string) => void;
}

function CharacterRow({ mode, character, checked, onCheckedChange }: CharacterRowProps) {
  return (
    <button
      type='button'
      className={cn(
        'flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors',
        checked ? 'bg-primary/10' : 'hover:bg-muted/80',
      )}
      onClick={() => onCheckedChange(mode === 'multi' ? !checked : true)}>
      {mode === 'multi' && (
        <Checkbox
          checked={checked}
          onCheckedChange={onCheckedChange}
          className='mr-1'
          aria-label={`Select ${character.name ?? 'character'}`}
        />
      )}
      <div className='flex size-8 items-center justify-center overflow-hidden rounded-md border bg-muted text-sm font-medium text-muted-foreground'>
        {character.image ? (
          <img src={character.image} alt={character.name ?? ''} className='size-full object-cover' />
        ) : (
          (character.name ?? '?').slice(0, 1).toUpperCase()
        )}
      </div>
      <div className='flex min-w-0 flex-1 flex-col'>
        <span className='truncate text-sm font-medium'>{character.name ?? 'Unnamed'}</span>
        {character.isNpc ? (
          <span className='text-xs text-muted-foreground'>NPC</span>
        ) : (
          <span className='text-xs text-muted-foreground'>Player character</span>
        )}
      </div>
    </button>
  );
}

function useCharacterLists(
  rulesetId?: string,
  campaignId?: string,
): { pcs: CharacterWithCampaign[]; npcs: CharacterWithCampaign[] } {
  const fromCampaign = useLiveQuery(async () => {
    if (!campaignId) return null;
    const campaignCharacters = await db.campaignCharacters
      .where('campaignId')
      .equals(campaignId)
      .toArray();
    if (campaignCharacters.length === 0) return { pcs: [], npcs: [] };

    const characters = await db.characters.bulkGet(
      campaignCharacters.map((cc) => cc.characterId),
    );

    const pairs: CharacterWithCampaign[] = [];
    for (const cc of campaignCharacters) {
      const character = characters.find((c) => c?.id === cc.characterId);
      if (!character) continue;
      if (rulesetId && character.rulesetId !== rulesetId) continue;
      pairs.push({ cc, character });
    }

    const pcs = pairs
      .filter(({ cc, character }) => character.isNpc !== true || cc?.active === true)
      .filter(({ character }) => character.isNpc !== true)
      .sort((a, b) => (a.character.name ?? '').localeCompare(b.character.name ?? '', 'en'));

    const npcs = pairs
      .filter(({ character }) => character.isNpc === true)
      .filter(({ cc }) => cc?.active === true)
      .sort((a, b) => (a.character.name ?? '').localeCompare(b.character.name ?? '', 'en'));

    return { pcs, npcs };
  }, [campaignId, rulesetId]);

  const fromRuleset = useLiveQuery(async () => {
    if (!rulesetId || campaignId) return null;
    const characters = await db.characters.where('rulesetId').equals(rulesetId).toArray();

    const pcs = characters
      .filter((character) => character.isNpc !== true)
      .map((character) => ({ character, cc: undefined }))
      .sort((a, b) => (a.character.name ?? '').localeCompare(b.character.name ?? '', 'en'));

    const npcs = characters
      .filter((character) => character.isNpc === true && (character as any).active === true)
      .map((character) => ({ character, cc: undefined }))
      .sort((a, b) => (a.character.name ?? '').localeCompare(b.character.name ?? '', 'en'));

    return { pcs, npcs };
  }, [rulesetId, campaignId]);

  return useMemo(() => {
    if (fromCampaign) return fromCampaign;
    if (fromRuleset) return fromRuleset;
    return { pcs: [], npcs: [] };
  }, [fromCampaign, fromRuleset]);
}

