import { Button } from '@/components';
import { ArchetypeLookup, useCampaignCharacters, useCharacter } from '@/lib/compass-api';
import { db } from '@/stores';
import type { CampaignCharacter } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useState } from 'react';
import type { CampaignCharacterWithName } from './hooks';
import { useCampaignPlayCharacterList } from './hooks';

export type NpcStageEntry = CampaignCharacterWithName & {
  archetypeTitle: string | null;
};

function useNpcStageEntries(campaignCharacters: CampaignCharacter[]): NpcStageEntry[] {
  const withNames = useCampaignPlayCharacterList({ campaignCharacters });
  const npcEntries = withNames.filter((entry) => entry.character?.isNpc === true);
  const sorted = [...npcEntries].sort(
    (a, b) => new Date(b.cc.createdAt).getTime() - new Date(a.cc.createdAt).getTime(),
  );

  console.log(sorted);

  const sortedIdsKey = sorted
    .map((s) => s.cc.id)
    .sort()
    .join(',');

  const enriched = useLiveQuery(async (): Promise<NpcStageEntry[]> => {
    const result: NpcStageEntry[] = [];
    for (const { cc, character } of sorted) {
      let archetypeTitle: string | null = null;
      if (character?.id) {
        const cas = await db.characterArchetypes
          .where('characterId')
          .equals(character.id)
          .sortBy('loadOrder');
        const firstArchetypeId = cas[0]?.archetypeId;
        if (firstArchetypeId) {
          const arch = await db.archetypes.get(firstArchetypeId);
          archetypeTitle = arch?.name ?? null;
        }
      }
      result.push({ cc, character, archetypeTitle });
    }
    return result;
  }, [sortedIdsKey]);

  return enriched ?? [];
}

interface NpcStageProps {
  campaignId: string;
  rulesetId: string;
}

export function NpcStage({ campaignId, rulesetId }: NpcStageProps) {
  const [selectedArchetypeId, setSelectedArchetypeId] = useState<string | null>(null);
  const { campaignCharacters, createCampaignCharacter } = useCampaignCharacters(campaignId);
  const { createCharacter } = useCharacter();

  const npcEntries = useNpcStageEntries(campaignCharacters);

  const handleAddNpc = useCallback(async () => {
    if (!selectedArchetypeId) return;
    const newCharId = await createCharacter({
      rulesetId,
      archetypeIds: [selectedArchetypeId],
      isNpc: true,
    });
    if (newCharId) {
      await createCampaignCharacter(campaignId, newCharId, {});
      setSelectedArchetypeId(null);
    }
  }, [campaignId, rulesetId, selectedArchetypeId, createCharacter, createCampaignCharacter]);

  return (
    <div className='flex h-full w-[280px] shrink-0 flex-col gap-3 border-r bg-muted/30 p-3'>
      <div className='shrink-0 space-y-2'>
        <ArchetypeLookup
          rulesetId={rulesetId}
          value={selectedArchetypeId}
          onSelect={(archetype) => setSelectedArchetypeId(archetype.id)}
          onDelete={() => setSelectedArchetypeId(null)}
          placeholder='Search archetypes...'
          label=''
          data-testid='npc-stage-archetype-lookup'
        />
        <Button
          variant='outline'
          size='sm'
          className='w-full'
          onClick={handleAddNpc}
          disabled={!selectedArchetypeId}
          data-testid='npc-stage-add-npc'>
          Add NPC
        </Button>
      </div>
      <div className='min-h-0 flex-1 overflow-y-auto space-y-2'>
        {npcEntries.map(({ cc, character, archetypeTitle }) => (
          <div key={cc.id} className='flex shrink-0 items-center gap-4 overflow-hidden p-2'>
            {character?.image ? (
              <img
                src={character.image}
                alt={character?.name ?? ''}
                className='h-10 w-10 shrink-0 rounded-md object-cover'
              />
            ) : (
              <div className='h-10 w-10 shrink-0 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground'>
                {(character?.name ?? '?').slice(0, 1).toUpperCase()}
              </div>
            )}
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
              onClick={() => {}}
              data-testid='npc-stage-card-add'>
              Add
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
