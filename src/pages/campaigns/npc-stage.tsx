import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ImageUpload,
  Input,
  Label,
} from '@/components';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArchetypeLookup,
  SceneLookup,
  useArchetypes,
  useCampaignCharacters,
  useCharacter,
} from '@/lib/compass-api';
import { filterNotSoftDeleted } from '@/lib/data/soft-delete';
import { useCharacterArchetypes } from '@/pages/characters/character-archetypes-panel/use-character-archetypes';
import { db } from '@/stores';
import type { Archetype, CampaignCharacter, Character } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowRight, OctagonMinus, Plus, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CampaignCharacterWithName } from './hooks';
import { useCampaignPlayCharacterList } from './hooks';

export type NpcStageEntry = CampaignCharacterWithName & {
  archetypeTitle: string | null;
};

function useNpcStageEntries(campaignCharacters: CampaignCharacter[]): NpcStageEntry[] {
  const withNames = useCampaignPlayCharacterList({ campaignCharacters });
  const npcEntries = withNames.filter((entry) => entry.character?.isNpc === true);
  const sorted = [...npcEntries].sort(
    (a, b) => new Date(b.cc.updatedAt).getTime() - new Date(a.cc.updatedAt).getTime(),
  );

  const sortedIdsKey = sorted
    .map((s) => s.cc.id)
    .sort()
    .join(',');

  // Re-run when character data changes (e.g. name, image) so list updates after modal edits
  const characterDataKey = sorted
    .map(
      (s) => `${s.character?.id ?? ''}:${s.character?.updatedAt ?? ''}:${s.character?.name ?? ''}`,
    )
    .join('|');

  // Re-run when campaign character data changes (e.g. active) so list updates immediately
  const campaignCharacterDataKey = sorted
    .map((s) => `${s.cc.id}:${s.cc.active ?? false}`)
    .join('|');

  const enriched = useLiveQuery(async (): Promise<NpcStageEntry[]> => {
    const result: NpcStageEntry[] = [];
    for (const { cc, character } of sorted) {
      let archetypeTitle: string | null = null;
      if (character?.id) {
        const cas = filterNotSoftDeleted(
          await db.characterArchetypes
            .where('characterId')
            .equals(character.id)
            .sortBy('loadOrder'),
        );
        const firstCa = cas[0];
        const firstArchetypeId = firstCa?.archetypeId;
        if (firstArchetypeId) {
          const arch = await db.archetypes.get(firstArchetypeId);
          archetypeTitle = firstCa?.variant ?? arch?.name ?? null;
        }
      }
      result.push({ cc, character, archetypeTitle });
    }
    return result;
  }, [sortedIdsKey, characterDataKey, campaignCharacterDataKey]);

  return enriched ?? [];
}

interface NpcEditModalProps {
  campaignId: string;
  campaignCharacter: CampaignCharacter | null;
  character: Character | null;
  stageSceneId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateCampaignCharacter: (
    id: string,
    data: Partial<Pick<CampaignCharacter, 'active' | 'campaignSceneId'>>,
  ) => Promise<void>;
}

function NpcEditModal({
  campaignId,
  campaignCharacter,
  character,
  stageSceneId,
  open,
  onOpenChange,
  onUpdateCampaignCharacter,
}: NpcEditModalProps) {
  const [name, setName] = useState('');
  const [addArchetypeId, setAddArchetypeId] = useState<string>('');
  const [pendingSceneId, setPendingSceneId] = useState<string | null>(null);
  const { updateCharacter } = useCharacter();
  const { archetypes } = useArchetypes(character?.rulesetId);
  const { characterArchetypes, addArchetype, removeArchetype } = useCharacterArchetypes(
    character?.id,
  );

  useEffect(() => {
    if (character) {
      setName(character.name);
    }
  }, [character]);

  useEffect(() => {
    if (campaignCharacter) {
      setPendingSceneId(campaignCharacter.campaignSceneId ?? null);
    }
  }, [campaignCharacter]);

  const handleSaveName = useCallback(() => {
    if (character && name.trim()) {
      updateCharacter(character.id, { name: name.trim() });
    }
  }, [character, name, updateCharacter]);

  const displayedArchetypes = characterArchetypes
    .filter((ca) => !ca.archetype.isDefault)
    .sort((a, b) => a.archetype.name.localeCompare(b.archetype.name));
  const addedArchetypeIds = new Set(characterArchetypes.map((ca) => ca.archetypeId));
  const availableArchetypes = archetypes.filter(
    (a) => !a.isDefault && !addedArchetypeIds.has(a.id),
  );

  const handleAddArchetype = useCallback(
    (archetypeId: string) => {
      if (!archetypeId || addedArchetypeIds.has(archetypeId)) return;
      addArchetype(archetypeId);
      setAddArchetypeId('');
    },
    [addArchetype, characterArchetypes],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md' data-testid='npc-edit-modal'>
        {!character ? null : (
          <>
            <DialogHeader>
              <DialogTitle>Edit NPC</DialogTitle>
            </DialogHeader>
            <div className='flex flex-col gap-4'>
              <div className='flex flex-col gap-2'>
                <Label htmlFor='npc-edit-name'>Name</Label>
                <Input
                  id='npc-edit-name'
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                />
              </div>
              <div className='flex flex-col gap-2'>
                <Label>Portrait</Label>
                <ImageUpload
                  image={character.image}
                  alt={character.name}
                  onRemove={() => updateCharacter(character.id, { assetId: null })}
                  onUpload={(assetId) => updateCharacter(character.id, { assetId })}
                  rulesetId={character.rulesetId}
                />
              </div>
              <div className='flex flex-col gap-2'>
                <Label>Archetypes</Label>
                <div className='flex gap-2'>
                  <Select
                    value={addArchetypeId || '_none'}
                    onValueChange={(v) => (v === '_none' ? undefined : setAddArchetypeId(v))}>
                    <SelectTrigger
                      id='npc-edit-archetype-add'
                      className='flex-1'
                      data-testid='character-archetype-select'>
                      <SelectValue placeholder='Add archetype...' />
                    </SelectTrigger>
                    <SelectContent>
                      {availableArchetypes.length === 0 ? (
                        <SelectItem value='_none' disabled>
                          All archetypes added
                        </SelectItem>
                      ) : (
                        availableArchetypes.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    type='button'
                    variant='outline'
                    size='icon'
                    onClick={() => addArchetypeId && handleAddArchetype(addArchetypeId)}
                    disabled={!addArchetypeId}
                    data-testid='character-archetype-add-button'
                    aria-label='Add archetype'>
                    <Plus className='h-4 w-4' />
                  </Button>
                </div>
                {displayedArchetypes.length > 0 ? (
                  <div className='flex flex-col gap-1' data-testid='character-archetypes-list'>
                    {displayedArchetypes.map((ca) => (
                      <div
                        key={ca.id}
                        className='flex items-center gap-2 rounded-md border px-3 py-2'
                        data-testid={`character-archetype-row-${ca.archetype.id}`}>
                        <span className='flex-1 text-sm font-medium'>{ca.archetype.name}</span>
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          className='h-8 w-8 shrink-0'
                          onClick={() => removeArchetype(ca.id)}
                          aria-label={`Remove ${ca.archetype.name}`}>
                          <X className='h-4 w-4' />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className='text-sm text-muted-foreground'>Archetypes are optional</p>
                )}
              </div>
              <div className='flex flex-col gap-2'>
                <SceneLookup
                  campaignId={campaignId}
                  label='Scene'
                  value={pendingSceneId}
                  placeholder='Assign to scene...'
                  onSelect={(scene) => setPendingSceneId(scene.id)}
                  onDelete={() => setPendingSceneId(null)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant='outline'
                onClick={async () => {
                  if (
                    campaignCharacter &&
                    pendingSceneId !== (campaignCharacter.campaignSceneId ?? null)
                  ) {
                    await onUpdateCampaignCharacter(campaignCharacter.id, {
                      campaignSceneId: pendingSceneId ?? undefined,
                    });
                  }
                  onOpenChange(false);
                }}>
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface NpcStageProps {
  campaignId: string;
  rulesetId: string;
  /** When set, only NPCs in this scene are shown and new NPCs are assigned to this scene. */
  sceneId?: string;
  onCardHover?: (campaignCharacterId: string | null) => void;
}

export function NpcStage({ campaignId, rulesetId, sceneId, onCardHover }: NpcStageProps) {
  const [selectedArchetype, setSelectedArchetype] = useState<Archetype | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [editingCampaignCharacterId, setEditingCampaignCharacterId] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState('');
  const {
    campaignCharacters,
    createCampaignCharacter,
    deleteCampaignCharacter,
    updateCampaignCharacter,
  } = useCampaignCharacters(campaignId);
  const { createCharacter } = useCharacter();

  const campaignCharactersInScene = useMemo(() => {
    if (!sceneId) return campaignCharacters;
    return campaignCharacters.filter((cc) => cc.campaignSceneId === sceneId);
  }, [campaignCharacters, sceneId]);

  const npcEntries = useNpcStageEntries(campaignCharactersInScene);
  const filterLower = nameFilter.trim().toLowerCase();
  const filteredNpcEntries = useMemo(
    () =>
      filterLower
        ? npcEntries.filter(({ character }) =>
            (character?.name ?? 'Unnamed').toLowerCase().includes(filterLower),
          )
        : npcEntries,
    [npcEntries, filterLower],
  );
  const editingEntry = npcEntries.find((e) => e.cc.id === editingCampaignCharacterId) ?? null;
  const editingCharacter = editingEntry?.character ?? null;
  const editingCampaignCharacter = editingEntry?.cc ?? null;

  const handleAddNpc = useCallback(async () => {
    if (!selectedArchetype) return;
    const newCharId = await createCharacter({
      rulesetId,
      archetypeIds: [selectedArchetype.id],
      variant: selectedVariant ?? undefined,
      isNpc: true,
      name: selectedVariant ?? selectedArchetype.name,
      assetId: selectedArchetype.assetId ?? null,
    });
    if (newCharId) {
      await createCampaignCharacter(campaignId, newCharId, {
        ...(sceneId ? { campaignSceneId: sceneId } : {}),
      });
    }
  }, [
    campaignId,
    rulesetId,
    sceneId,
    selectedArchetype,
    selectedVariant,
    createCharacter,
    createCampaignCharacter,
  ]);

  return (
    <div className='flex h-[90dvh] w-[280px] shrink-0 flex-col gap-3 border-r bg-muted/30 p-3'>
      <NpcEditModal
        campaignId={campaignId}
        campaignCharacter={editingCampaignCharacter}
        character={editingCharacter}
        stageSceneId={sceneId}
        open={!!editingCampaignCharacterId}
        onOpenChange={(open) => !open && setEditingCampaignCharacterId(null)}
        onUpdateCampaignCharacter={updateCampaignCharacter}
      />
      <div className='shrink-0 space-y-2'>
        <p className='text-sm text-muted-foreground'>Stage NPCs</p>

        <div className='flex gap-2 items-end justify-between w-[255px]'>
          <ArchetypeLookup
            rulesetId={rulesetId}
            allowDefault
            wrapperClassName='w-[100%]'
            value={selectedArchetype?.id ?? null}
            onSelect={(archetype) => setSelectedArchetype(archetype)}
            onDelete={() => {
              setSelectedArchetype(null);
              setSelectedVariant(null);
            }}
            variantValue={selectedVariant}
            onVariantSelect={setSelectedVariant}
            variantPlaceholder='None'
            variantLabel='Variant'
            placeholder='Search archetypes...'
            label=''
            data-testid='npc-stage-archetype-lookup'
          />
          <Button
            variant='outline'
            size='sm'
            onClick={handleAddNpc}
            disabled={!selectedArchetype}
            data-testid='npc-stage-add-npc'>
            <Plus />
          </Button>
        </div>
        <Input
          type='search'
          placeholder='Filter by name...'
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          className='h-8'
          data-testid='npc-stage-name-filter'
        />
      </div>
      <div className='min-h-0 flex-1 overflow-y-auto space-y-2'>
        {filteredNpcEntries.map(({ cc, character, archetypeTitle }) => (
          <div
            key={cc.id}
            className='flex shrink-0 items-center gap-4 overflow-hidden p-2'
            onMouseEnter={() => onCardHover?.(cc.id)}
            onMouseLeave={() => onCardHover?.(null)}>
            <Button
              variant='ghost'
              size='icon'
              className='shrink-0 text-muted-foreground hover:text-destructive'
              aria-label='Delete campaign character'
              data-testid='npc-stage-card-delete'
              onClick={() => deleteCampaignCharacter(cc.id)}>
              <Trash2 className='h-4 w-4' />
            </Button>
            <button
              type='button'
              onClick={() => character && setEditingCampaignCharacterId(cc.id)}
              className='h-10 w-10 shrink-0 rounded-md overflow-hidden focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 clickable'
              aria-label='Edit NPC'>
              {character?.image ? (
                <img
                  src={character.image}
                  alt={character?.name ?? ''}
                  className='h-full w-full object-cover'
                />
              ) : (
                <div className='h-full w-full rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground'>
                  {(character?.name ?? '?').slice(0, 1).toUpperCase()}
                </div>
              )}
            </button>
            <div className='min-w-0 flex-1'>
              <p className='truncate text-sm font-medium'>{character?.name ?? 'Unnamed'}</p>
              {archetypeTitle && (
                <p className='truncate text-xs text-muted-foreground'>{archetypeTitle}</p>
              )}
            </div>
            <Button
              variant='outline'
              size='sm'
              className='shrink-0'
              onClick={() => updateCampaignCharacter(cc.id, { active: !cc.active })}
              aria-label={cc.active ? 'Active' : 'Set as active'}
              data-testid='npc-stage-card-add'>
              {cc.active ? (
                <OctagonMinus className='h-4 w-4' />
              ) : (
                <ArrowRight className='h-4 w-4' />
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
