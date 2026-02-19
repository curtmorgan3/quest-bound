import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useArchetypes, useAssets, useCharacter } from '@/lib/compass-api';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  useCharacterArchetypes,
  type CharacterArchetypeWithArchetype,
} from './use-character-archetypes';

type CharacterArchetypesPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const CharacterArchetypesPanel = ({
  open,
  onOpenChange,
}: CharacterArchetypesPanelProps) => {
  const { characterId } = useParams<{ characterId: string }>();
  const { character } = useCharacter(characterId);
  const { archetypes } = useArchetypes(character?.rulesetId);
  const { assets } = useAssets(character?.rulesetId);

  const getImageFromAssetId = (id: string | null) => {
    if (!id) return null;
    const asset = assets.find((a) => a.id === id);
    return asset?.data ?? null;
  };
  const { characterArchetypes, addArchetype, removeArchetype } =
    useCharacterArchetypes(characterId);

  const displayedArchetypes = characterArchetypes
    .filter((ca) => !ca.archetype.isDefault)
    .sort((a, b) => a.archetype.name.localeCompare(b.archetype.name));

  const [addValue, setAddValue] = useState('');
  const addedArchetypeIds = new Set(characterArchetypes.map((ca) => ca.archetypeId));
  const availableArchetypes = archetypes.filter(
    (a) => !a.isDefault && !addedArchetypeIds.has(a.id),
  );

  const handleAdd = async (archetypeId: string) => {
    if (!archetypeId) return;
    await addArchetype(archetypeId);
    setAddValue('');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side='left' className='flex flex-col p-[8px]' data-testid='character-archetypes-panel'>
        <SheetHeader>
          <SheetTitle>Character Archetypes</SheetTitle>
          <SheetDescription>
            View, add, and remove archetypes on this character.
          </SheetDescription>
        </SheetHeader>

        {availableArchetypes.length > 0 && (
          <div className='flex gap-2'>
            <Select value={addValue} onValueChange={(v) => handleAdd(v)}>
              <SelectTrigger className='flex-1' data-testid='add-archetype-select'>
                <SelectValue placeholder='Add archetype...' />
              </SelectTrigger>
              <SelectContent>
                {availableArchetypes.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant='outline'
              size='icon'
              className='shrink-0'
              onClick={() => {
                const first = availableArchetypes[0];
                if (first) handleAdd(first.id);
              }}
              title='Add first available'
              data-testid='add-archetype-button'>
              <Plus className='h-4 w-4' />
            </Button>
          </div>
        )}

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
          <div className='flex-1 min-h-0 overflow-auto flex flex-col gap-2 mt-4' data-testid='character-archetypes-list'>
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
