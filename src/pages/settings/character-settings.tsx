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
  Button,
  ImageUpload,
  Input,
  Label,
} from '@/components';
import { useNotifications } from '@/hooks';
import { useActiveRuleset, useCharacter, useCharacterAttributes } from '@/lib/compass-api';
import type { Character } from '@/types';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface CharacterSettingsProps {
  character: Character;
}

export const CharacterSettings = ({ character }: CharacterSettingsProps) => {
  const { updateCharacter, deleteCharacter } = useCharacter();
  const { activeRuleset } = useActiveRuleset();
  const { syncWithRuleset } = useCharacterAttributes(character.id);
  const { addNotification } = useNotifications();
  const navigate = useNavigate();

  const [name, setName] = useState(character.name);

  const handleUpdate = async () => {
    await updateCharacter(character.id, { name });
  };

  useEffect(() => {
    if (name === character.name) return;
    setTimeout(() => {
      handleUpdate();
    }, 500);
  }, [name]);

  const handleDelete = async () => {
    await deleteCharacter(character.id);
    navigate('/characters');
  };

  const handleSyncWithRuleset = async () => {
    const count = await syncWithRuleset();
    if (count > 0) {
      addNotification(`Added ${count} attribute${count === 1 ? '' : 's'}`, { type: 'success' });
    } else {
      addNotification('All attributes are already synced', { type: 'info' });
    }
  };

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-col gap-2 max-w-sm'>
        <Label htmlFor='character-name'>Name</Label>
        <Input id='character-name' value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <ImageUpload
        image={character.image}
        alt={character.name}
        onRemove={() => updateCharacter(character.id, { assetId: null })}
        onUpload={(assetId) => updateCharacter(character.id, { assetId })}
        onSetUrl={(url) => updateCharacter(character.id, { assetId: null, image: url })}
        rulesetId={activeRuleset?.id}
      />

      <div className='flex flex-col gap-2'>
        <Label>Sync Attributes</Label>
        <p className='text-sm text-muted-foreground'>
          Add any missing attributes from the ruleset to this character.
        </p>
        <Button className='w-[150px]' variant='secondary' onClick={handleSyncWithRuleset}>
          Sync with Ruleset
        </Button>
      </div>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button className='w-[150px]' variant='destructive'>
            Delete Character
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Character</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {character.name}? This action cannot be undone and
              will permanently remove this character and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
              Delete Character
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
