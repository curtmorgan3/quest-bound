import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useArchetypes, useAssets, useCharacter } from '@/lib/compass-api';
import { ArchetypeLookup } from '@quest-bound/core-ui/api-components';
import { CharacterContext } from '@/stores/context/character-context';
import type { ArchetypeWithVariantOptions } from '@/types';
import { Trash2 } from 'lucide-react';
import { useContext, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  useCharacterArchetypes,
  type CharacterArchetypeWithArchetype,
} from './use-character-archetypes';

type CharacterArchetypesPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const CharacterArchetypesPanel = ({ open, onOpenChange }: CharacterArchetypesPanelProps) => {
  const { characterId } = useParams<{ characterId: string }>();
  const characterContext = useContext(CharacterContext);
  const { character } = useCharacter(characterId);
  const { archetypes } = useArchetypes(character?.rulesetId);
  const { assets } = useAssets(character?.rulesetId);

  const getImageFromAssetId = (id: string | null) => {
    if (!id) return null;
    const asset = assets.find((a) => a.id === id);
    return asset?.data ?? null;
  };
  const { characterArchetypes, addArchetype, removeArchetype } = useCharacterArchetypes(
    characterId,
    {
      campaignId: characterContext?.campaignId,
      campaignSceneId: characterContext?.campaignSceneId,
    },
  );

  const displayedArchetypes = characterArchetypes
    .filter((ca) => !ca.archetype.isDefault)
    .sort((a, b) => a.archetype.name.localeCompare(b.archetype.name));

  const [addValue, setAddValue] = useState('');
  const [pendingVariant, setPendingVariant] = useState('');
  const addedArchetypeIds = characterArchetypes.map((ca) => ca.archetypeId);

  const handleAdd = async (archetypeId: string, variant?: string) => {
    if (!archetypeId) return;
    await addArchetype(archetypeId, variant || undefined);
    setAddValue('');
    setPendingVariant('');
  };

  const handleLookupSelect = (archetype: ArchetypeWithVariantOptions) => {
    if (archetype.variantOptions?.length) {
      setAddValue(archetype.id);
      setPendingVariant('');
    } else {
      handleAdd(archetype.id);
    }
  };

  const handleLookupClear = () => {
    setAddValue('');
    setPendingVariant('');
  };

  const handleAddClick = () => {
    if (!addValue) return;
    handleAdd(addValue, pendingVariant || undefined);
  };

  const availableArchetypes = archetypes.filter(
    (a) => !a.isDefault && !addedArchetypeIds.includes(a.id),
  );

  const sheetContentRef = useRef<HTMLDivElement>(null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        ref={sheetContentRef}
        side='left'
        className='flex flex-col p-[8px]'
        data-testid='character-archetypes-panel'>
        <SheetHeader>
          <SheetTitle>Character Archetypes</SheetTitle>
          <SheetDescription>View, add, and remove archetypes on this character.</SheetDescription>
        </SheetHeader>

        <div className='flex flex-col gap-2'>
          <ArchetypeLookup
            rulesetId={character?.rulesetId}
            label='Add archetype'
            value={addValue || null}
            placeholder='Add archetype...'
            data-testid='add-archetype-select'
            excludeIds={addedArchetypeIds}
            onSelect={handleLookupSelect}
            onDelete={handleLookupClear}
            variantValue={pendingVariant || null}
            onVariantSelect={(v) => setPendingVariant(v ?? '')}
            variantPlaceholder='None'
            variantLabel='Variant (optional)'
            popoverContentClassName='z-[110]'
            popoverContainerRef={sheetContentRef}
          />
          {addValue && (
            <Button onClick={handleAddClick} data-testid='add-archetype-button' className='w-fit'>
              Add
            </Button>
          )}
        </div>

        {availableArchetypes.length === 0 && displayedArchetypes.length > 0 && (
          <p className='text-sm text-muted-foreground'>All archetypes have been added.</p>
        )}

        {displayedArchetypes.length === 0 ? (
          <div className='flex-1 flex items-center justify-center text-center py-8 text-muted-foreground'>
            <p>No archetypes on this character yet.</p>
            {archetypes.length === 0 && (
              <p className='text-sm mt-2'>This ruleset has no archetypes defined.</p>
            )}
          </div>
        ) : (
          <div
            className='flex-1 min-h-0 overflow-auto flex flex-col gap-2 mt-4'
            data-testid='character-archetypes-list'>
            {displayedArchetypes.map((ca) => (
              <ArchetypeRow
                key={ca.id}
                ca={ca}
                imageSrc={
                  ca.archetype.image ??
                  getImageFromAssetId(ca.archetype.assetId ?? null) ??
                  undefined
                }
                onRemove={() => removeArchetype(ca.id)}
              />
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

function ArchetypeRow({
  ca,
  imageSrc,
  onRemove,
}: {
  ca: CharacterArchetypeWithArchetype;
  imageSrc?: string;
  onRemove: () => void;
}) {
  return (
    <div
      className='flex items-center gap-2 p-3 rounded-md border bg-card'
      data-testid={`character-archetype-row-${ca.archetype.id}`}>
      {imageSrc && (
        <img
          src={imageSrc}
          alt={ca.archetype.name}
          className='h-12 w-12 shrink-0 rounded-md object-cover'
        />
      )}
      <div className='flex-1 min-w-0'>
        <div className='font-medium'>{ca.archetype.name}</div>
        {ca.variant && <p className='text-sm text-muted-foreground'>Variant: {ca.variant}</p>}
        {ca.archetype.description && (
          <p className='text-sm text-muted-foreground truncate'>{ca.archetype.description}</p>
        )}
      </div>
      <Button
        variant='ghost'
        size='icon'
        className='shrink-0 text-destructive'
        onClick={onRemove}
        data-testid='remove-archetype-btn'
        aria-label={`Remove ${ca.archetype.name}`}>
        <Trash2 className='h-4 w-4' />
      </Button>
    </div>
  );
}
