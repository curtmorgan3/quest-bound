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
import { Plus, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const Characters = () => {
  const { characters, createCharacter, deleteCharacter } = useCharacter();
  const { rulesets } = useRulesets();
  const { assets, deleteAsset } = useAssets();

  const selectableCharacters = characters.filter((c) => !c.isTestCharacter);

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [rulesetId, setRulesetId] = useState('');
  const [selectedArchetypeIds, setSelectedArchetypeIds] = useState<string[]>([]);
  const [addArchetypeValue, setAddArchetypeValue] = useState('');
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
      archetypeIds: selectedArchetypeIds,
      assetId,
    });

    // Clear pending asset ref since it's now saved
    pendingAssetIdRef.current = null;

    // Reset form
    resetForm();
  };

  const resetForm = () => {
    setStep(1);
    setName('');
    setRulesetId('');
    setSelectedArchetypeIds([]);
    setAddArchetypeValue('');
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
      setStep(1);
      setName('');
      setRulesetId('');
      setSelectedArchetypeIds([]);
      setAddArchetypeValue('');
      setAssetId(null);
    }
    setOpen(isOpen);
  };

  const hasArchetypeStep = rulesetId && selectableArchetypes.length > 0;
  const showNextOnStep1 = hasArchetypeStep;

  const handleRulesetChange = (value: string) => {
    setRulesetId(value);
    setSelectedArchetypeIds([]);
    setAddArchetypeValue('');
  };

  const handleAddArchetype = (archetypeId: string) => {
    if (!archetypeId || selectedArchetypeIds.includes(archetypeId)) return;
    setSelectedArchetypeIds((prev) => [...prev, archetypeId]);
    setAddArchetypeValue('');
  };

  const handleRemoveArchetype = (archetypeId: string) => {
    setSelectedArchetypeIds((prev) => prev.filter((id) => id !== archetypeId));
  };

  const availableArchetypes = selectableArchetypes.filter(
    (a) => !selectedArchetypeIds.includes(a.id),
  );

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
              <DialogTitle>{step === 1 ? 'New Character' : 'Select Archetypes'}</DialogTitle>
            </DialogHeader>
            {step === 1 ? (
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
            ) : (
              <div className='grid gap-4'>
                <div className='grid gap-3'>
                  <Label>Archetypes</Label>
                  <div className='flex gap-2'>
                    <Select
                      value={addArchetypeValue}
                      onValueChange={(v) => (v === '_none' ? undefined : setAddArchetypeValue(v))}>
                      <SelectTrigger
                        id='character-archetype-add'
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
                          availableArchetypes.map((archetype) => (
                            <SelectItem key={archetype.id} value={archetype.id}>
                              {archetype.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      type='button'
                      variant='outline'
                      size='icon'
                      onClick={() => addArchetypeValue && handleAddArchetype(addArchetypeValue)}
                      disabled={!addArchetypeValue}
                      data-testid='character-archetype-add-button'
                      aria-label='Add archetype'>
                      <Plus className='h-4 w-4' />
                    </Button>
                  </div>
                  {selectedArchetypeIds.length > 0 && (
                    <div className='flex flex-col gap-1' data-testid='character-archetypes-list'>
                      {selectedArchetypeIds.map((archetypeId) => {
                        const archetype = archetypes.find((a) => a.id === archetypeId);
                        if (!archetype) return null;
                        return (
                          <div
                            key={archetype.id}
                            className='flex items-center gap-2 rounded-md border px-3 py-2'
                            data-testid={`character-archetype-row-${archetype.id}`}>
                            <span className='flex-1 text-sm font-medium'>{archetype.name}</span>
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              className='h-8 w-8 shrink-0'
                              onClick={() => handleRemoveArchetype(archetype.id)}
                              aria-label={`Remove ${archetype.name}`}>
                              <X className='h-4 w-4' />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {selectedArchetypeIds.length === 0 && (
                    <p className='text-sm text-muted-foreground'>Archetypes are optional</p>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button variant='outline'>Cancel</Button>
              </DialogClose>
              {step === 2 && (
                <Button variant='outline' onClick={() => setStep(1)}>
                  Back
                </Button>
              )}
              {step === 1 && showNextOnStep1 ? (
                <Button
                  data-testid='create-character-next'
                  onClick={() => setStep(2)}
                  disabled={!isFormValid}>
                  Next
                </Button>
              ) : (
                <Button
                  data-testid='create-character-submit'
                  onClick={handleCreate}
                  disabled={!isFormValid}>
                  Create
                </Button>
              )}
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
