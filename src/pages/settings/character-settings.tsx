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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useNotifications } from '@/hooks';
import {
  useActiveRuleset,
  useCharacter,
  useCharacterAttributes,
  useRulesets,
} from '@/lib/compass-api';
import type { Character } from '@/types';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface CharacterSettingsProps {
  character: Character;
}

export const CharacterSettings = ({ character }: CharacterSettingsProps) => {
  const { updateCharacter, deleteCharacter } = useCharacter();
  const { rulesets } = useRulesets();
  const { activeRuleset } = useActiveRuleset();
  const { syncWithRuleset } = useCharacterAttributes(character.id);
  const { addNotification } = useNotifications();
  const navigate = useNavigate();

  const [name, setName] = useState(character.name);
  const [selectedRulesetId, setSelectedRulesetId] = useState(character.rulesetId);
  const [mismatchDialogOpen, setMismatchDialogOpen] = useState(false);
  const [pendingRulesetId, setPendingRulesetId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedRulesetId(character.rulesetId);
  }, [character.rulesetId]);

  const getRulesetTitle = (id: string) => rulesets.find((r) => r.id === id)?.title ?? 'Unknown';

  const handleUpdate = async () => {
    await updateCharacter(character.id, { name });
  };

  const handleRulesetChange = (value: string) => {
    if (value === character.rulesetId) {
      setSelectedRulesetId(value);
      return;
    }
    setPendingRulesetId(value);
    setMismatchDialogOpen(true);
  };

  const handleConfirmRulesetChange = async () => {
    if (pendingRulesetId == null) return;
    await updateCharacter(character.id, { rulesetId: pendingRulesetId });
    setSelectedRulesetId(pendingRulesetId);
    setMismatchDialogOpen(false);
    setPendingRulesetId(null);
  };

  const handleCancelRulesetChange = () => {
    setMismatchDialogOpen(false);
    setPendingRulesetId(null);
    setSelectedRulesetId(character.rulesetId);
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
      addNotification(`Updated ${count} attribute${count === 1 ? '' : 's'}`, { type: 'success' });
    } else {
      addNotification('All attributes are already synced', { type: 'info' });
    }
  };

  const sortedRulesets = [...rulesets].sort((a, b) => a.title.localeCompare(b.title));
  const currentRulesetInList = rulesets.some((r) => r.id === character.rulesetId);

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-col gap-2 max-w-sm'>
        <Label htmlFor='character-name'>Name</Label>
        <Input id='character-name' value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className='flex flex-col gap-2 max-w-sm'>
        <Label htmlFor='character-ruleset'>Ruleset</Label>
        <Select value={selectedRulesetId} onValueChange={handleRulesetChange}>
          <SelectTrigger id='character-ruleset' className='w-full'>
            <SelectValue placeholder='Select a ruleset' />
          </SelectTrigger>
          <SelectContent>
            {sortedRulesets.length === 0 ? (
              <SelectItem value={character.rulesetId}>
                {getRulesetTitle(character.rulesetId)}
              </SelectItem>
            ) : (
              <>
                {!currentRulesetInList && (
                  <SelectItem value={character.rulesetId}>
                    {getRulesetTitle(character.rulesetId)} (current)
                  </SelectItem>
                )}
                {sortedRulesets.map((ruleset) => (
                  <SelectItem key={ruleset.id} value={ruleset.id}>
                    {ruleset.title}
                  </SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      <Dialog
        open={mismatchDialogOpen}
        onOpenChange={(open) => !open && handleCancelRulesetChange()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Non-Standard Ruleset Assignment</DialogTitle>
          </DialogHeader>
          <p className='text-sm text-muted-foreground'>
            This character was created with <strong>{getRulesetTitle(character.rulesetId)}</strong>.
            Changing to a different ruleset may cause attributes, items, windows, and other data to
            no longer align. Are you sure you want to assign this character to another ruleset?
          </p>
          <DialogFooter>
            <Button variant='outline' onClick={handleCancelRulesetChange}>
              Cancel
            </Button>
            <Button onClick={handleConfirmRulesetChange}>Change ruleset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImageUpload
        image={character.image}
        alt={character.name}
        onRemove={() => updateCharacter(character.id, { assetId: null })}
        onUpload={(assetId) => updateCharacter(character.id, { assetId })}
        onSetUrl={(url) => updateCharacter(character.id, { assetId: null, image: url })}
        rulesetId={activeRuleset?.id}
      />

      <Button className='w-[150px]' variant='secondary' onClick={handleSyncWithRuleset}>
        Sync with Ruleset
      </Button>

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
