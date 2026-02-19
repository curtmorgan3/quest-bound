import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Card,
  Checkbox,
  ImageUpload,
  Input,
  Label,
} from '@/components';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAssets, useCharacter, useRulesets } from '@/lib/compass-api';
import { db } from '@/stores';
import type { Archetype } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const Characters = () => {
  const { characters, createCharacter, deleteCharacter } = useCharacter();
  const { rulesets } = useRulesets();
  const { assets, deleteAsset } = useAssets();

  const selectableCharacters = characters.filter((c) => !c.isTestCharacter);

  const [name, setName] = useState('');
  const [rulesetId, setRulesetId] = useState('');
  const [archetypeId, setArchetypeId] = useState('');
  const [assetId, setAssetId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const archetypes: Archetype[] =
    useLiveQuery(
      () =>
        rulesetId
          ? db.archetypes.where('rulesetId').equals(rulesetId).sortBy('loadOrder')
          : Promise.resolve([] as Archetype[]),
      [rulesetId],
    ) ?? [];

  const selectableArchetypes = archetypes.filter((a) => !a.isDefault);
  const defaultArchetype = archetypes.find((a) => a.isDefault) ?? archetypes[0];

  // Track the assetId to clean up if dialog is cancelled
  const pendingAssetIdRef = useRef<string | null>(null);

  const navigate = useNavigate();

  const getImageFromAssetId = (id: string | null) => {
    if (!id) return null;
    const asset = assets.find((a) => a.id === id);
    return asset?.data ?? null;
  };

  const handleCreate = async () => {
    if (!name.trim() || !rulesetId) return;

    await createCharacter({
      name: name.trim(),
      rulesetId,
      archetypeId: archetypeId || defaultArchetype?.id,
      assetId,
    });

    // Clear pending asset ref since it's now saved
    pendingAssetIdRef.current = null;

    // Reset form
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setRulesetId('');
    setArchetypeId('');
    setAssetId(null);
    setOpen(false);
  };

  const handleOpenChange = async (isOpen: boolean) => {
    if (!isOpen && pendingAssetIdRef.current) {
      // Dialog was closed without submitting - clean up orphan asset
      await deleteAsset(pendingAssetIdRef.current);
      pendingAssetIdRef.current = null;
    }
    if (!isOpen) {
      setName('');
      setRulesetId('');
      setArchetypeId('');
      setAssetId(null);
    }
    setOpen(isOpen);
  };

  const handleRulesetChange = (value: string) => {
    setRulesetId(value);
    setArchetypeId('');
  };

  const handleImageUpload = (uploadedAssetId: string) => {
    setAssetId(uploadedAssetId);
    pendingAssetIdRef.current = uploadedAssetId;
  };

  const handleImageRemove = async () => {
    if (assetId) {
      await deleteAsset(assetId);
      pendingAssetIdRef.current = null;
    }
    setAssetId(null);
  };

  const isFormValid = name.trim() !== '' && rulesetId !== '';

  const getRulesetTitle = (rulesetId: string) => {
    const ruleset = rulesets.find((r) => r.id === rulesetId);
    return ruleset?.title ?? 'Unknown Ruleset';
  };

  return (
    <div className='flex h-full w-full flex-col p-4 gap-4'>
      <h1 className='text-4xl font-bold'>Characters</h1>
      <div className='flex items-center gap-4'>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className='w-[180px]' data-testid='create-character-button'>
              Create New
            </Button>
          </DialogTrigger>
          <DialogContent className='sm:max-w-[425px]'>
            <DialogHeader>
              <DialogTitle>New Character</DialogTitle>
            </DialogHeader>
            <div className='grid gap-4'>
              <div className='grid gap-3'>
                <Label htmlFor='character-name'>
                  Name <span className='text-destructive'>*</span>
                </Label>
                <Input
                  id='character-name'
                  name='name'
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder='Enter character name'
                />
              </div>
              <div className='grid gap-3'>
                <Label htmlFor='character-ruleset'>
                  Ruleset <span className='text-destructive'>*</span>
                </Label>
                <Select value={rulesetId} onValueChange={handleRulesetChange}>
                  <SelectTrigger
                    id='character-ruleset'
                    className='w-full'
                    data-testid='character-ruleset-select'>
                    <SelectValue placeholder='Select a ruleset' />
                  </SelectTrigger>
                  <SelectContent>
                    {rulesets.length === 0 ? (
                      <SelectItem value='_none' disabled>
                        No rulesets available
                      </SelectItem>
                    ) : (
                      rulesets.map((ruleset) => (
                        <SelectItem key={ruleset.id} value={ruleset.id}>
                          {ruleset.title}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              {rulesetId && selectableArchetypes.length > 0 && (
                <div className='grid gap-3'>
                  <Label htmlFor='character-archetype'>Archetype</Label>
                  <Select value={archetypeId || ''} onValueChange={setArchetypeId}>
                    <SelectTrigger
                      id='character-archetype'
                      className='w-full'
                      data-testid='character-archetype-select'>
                      <SelectValue placeholder='Select archetype' />
                    </SelectTrigger>
                    <SelectContent>
                      {selectableArchetypes.map((archetype) => (
                        <SelectItem key={archetype.id} value={archetype.id}>
                          {archetype.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className='grid gap-3'>
                <Label>Image</Label>
                <ImageUpload
                  image={getImageFromAssetId(assetId)}
                  alt={name || 'Character image'}
                  onUpload={handleImageUpload}
                  onRemove={handleImageRemove}
                  rulesetId={rulesetId || undefined}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant='outline'>Cancel</Button>
              </DialogClose>
              <Button
                data-testid='create-character-submit'
                onClick={handleCreate}
                disabled={!isFormValid}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className='flex flex-col gap-3'>
        {selectableCharacters.map((character) => {
          const doNotAsk = localStorage.getItem('qb.confirmOnDelete') === 'false';
          const rulesetTitle = getRulesetTitle(character.rulesetId);

          return (
            <Card
              key={character.id}
              className='flex flex-row overflow-hidden p-0 h-32 min-h-32'
              data-testid='character-card'>
              <div
                className='w-40 shrink-0 bg-muted bg-cover bg-center'
                style={character.image ? { backgroundImage: `url(${character.image})` } : undefined}
              />
              <div className='flex min-w-0 flex-1 flex-col justify-between p-4'>
                <div className='min-w-0'>
                  <h2 className='truncate text-lg font-semibold'>{character.name}</h2>
                  <p className='mt-0.5 text-sm text-muted-foreground'>{rulesetTitle}</p>
                </div>

                <div className='mt-2 flex items-center justify-end gap-2'>
                  {doNotAsk ? (
                    <Button
                      variant='ghost'
                      size='sm'
                      className='text-red-500'
                      data-testid='preview-card-delete'
                      onClick={() => deleteCharacter(character.id)}>
                      Delete
                    </Button>
                  ) : (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='text-red-500'
                          data-testid='preview-card-delete'>
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Permanently delete this content?</AlertDialogTitle>
                          <div className='flex gap-2'>
                            <Label htmlFor='preview-card-do-not-ask-again'>Do not ask again</Label>
                            <Checkbox
                              id='preview-card-do-not-ask-again'
                              onCheckedChange={(checked) =>
                                localStorage.setItem('qb.confirmOnDelete', String(!checked))
                              }
                            />
                          </div>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            data-testid='preview-card-delete-confirm'
                            onClick={() => deleteCharacter(character.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}

                  <Button
                    variant='link'
                    size='sm'
                    onClick={() => navigate(`/characters/${character.id}`)}
                    data-testid='character-card-open'>
                    Open
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {selectableCharacters.length === 0 && (
        <div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
          <p className='text-lg'>No characters yet</p>
          <p className='text-sm'>Create your first character to get started</p>
        </div>
      )}
    </div>
  );
};
