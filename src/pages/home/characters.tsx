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
  Card,
  Checkbox,
  ImageUpload,
  Input,
  Label,
} from '@/components';
import { PageWrapper } from '@/components/composites';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ArchetypeLookup,
  useAssets,
  useCharacter,
  useImportCharacter,
  useRulesets,
} from '@/lib/compass-api';
import { db } from '@/stores';
import type { Archetype, ArchetypeWithVariantOptions } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { AlertCircle, Plus, Upload } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export const Characters = () => {
  const [searchParams] = useSearchParams();
  const rulesetIdParam = searchParams.get('rulesetId');

  const { characters, createCharacter, deleteCharacter } = useCharacter();
  const { rulesets } = useRulesets();
  const { assets, deleteAsset } = useAssets();
  const { importCharacter, isImporting } = useImportCharacter();

  const selectableCharacters = useMemo(
    () =>
      !rulesetIdParam
        ? []
        : characters
            .filter((c) => !c.isTestCharacter && c.isNpc !== true)
            .filter((c) => c.rulesetId === rulesetIdParam),
    [characters, rulesetIdParam],
  );

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [selectedArchetypeId, setSelectedArchetypeId] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    rulesetMissing: boolean;
  } | null>(null);
  const [rulesetWarningOpen, setRulesetWarningOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const archetypes: Archetype[] =
    useLiveQuery(
      () =>
        rulesetIdParam
          ? db.archetypes.where('rulesetId').equals(rulesetIdParam).sortBy('loadOrder')
          : Promise.resolve([] as Archetype[]),
      [rulesetIdParam],
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
    if (!name.trim() || !rulesetIdParam) return;

    await createCharacter({
      name: name.trim(),
      rulesetId: rulesetIdParam,
      archetypeIds: selectedArchetypeId ? [selectedArchetypeId] : [],
      variant: selectedVariant ?? undefined,
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
    setSelectedArchetypeId(null);
    setSelectedVariant(null);
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
      setSelectedArchetypeId(null);
      setSelectedVariant(null);
      setAssetId(null);
    }
    setOpen(isOpen);
  };

  const hasArchetypeStep = rulesetIdParam && selectableArchetypes.length > 0;
  const showNextOnStep1 = hasArchetypeStep;

  const selectedArchetype = selectedArchetypeId
    ? (archetypes.find((a) => a.id === selectedArchetypeId) as
        | ArchetypeWithVariantOptions
        | undefined)
    : undefined;
  const selectedArchetypeHasVariants =
    selectedArchetype?.variantOptions && selectedArchetype.variantOptions.length > 0;

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

  const isFormValid = name.trim() !== '' && rulesetIdParam != null && rulesetIdParam !== '';

  const getRulesetTitle = (rulesetId: string) => {
    const ruleset = rulesets.find((r) => r.id === rulesetId);
    return ruleset?.title ?? 'Unknown Ruleset';
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await importCharacter(file);
      setImportResult({
        success: result.success,
        message: result.message,
        rulesetMissing: result.rulesetMissing,
      });
      if (result.rulesetMissing) {
        setRulesetWarningOpen(true);
      }
    } catch (error) {
      setImportResult({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Character import failed due to an unknown error.',
        rulesetMissing: false,
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <PageWrapper
      title='Characters'
      headerActions={
        <div className='flex items-center gap-2'>
          {importResult && (
            <div
              className={`p-3 rounded-lg border text-sm ${
                importResult.success
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
              <div className='flex items-center gap-2'>
                {importResult.success ? null : <AlertCircle className='h-4 w-4' />}
                <span className='font-medium'>{importResult.message}</span>
              </div>
            </div>
          )}

          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button size='sm' className='gap-1' data-testid='create-character-button'>
                <Plus className='h-4 w-4' />
                Create Character
              </Button>
            </DialogTrigger>
            <DialogContent className='sm:max-w-[425px]'>
              <DialogHeader>
                <DialogTitle>Create Character</DialogTitle>
                <DialogDescription>
                  {step === 1 ? 'New Character' : 'Select Archetype'}
                </DialogDescription>
              </DialogHeader>
              {step === 1 ? (
                <div className='grid gap-4'>
                  {!rulesetIdParam ? (
                    <p className='text-sm text-muted-foreground'>
                      Open a ruleset from the home page (e.g. from the ruleset&apos;s Characters
                      card) to create a character for that ruleset.
                    </p>
                  ) : (
                    <>
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
                        <Label>Image</Label>
                        <ImageUpload
                          image={getImageFromAssetId(assetId)}
                          alt={name || 'Character image'}
                          onUpload={handleImageUpload}
                          onRemove={handleImageRemove}
                          rulesetId={rulesetIdParam}
                        />
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className='grid gap-4'>
                  <div className='grid gap-3'>
                    <Label>Archetype</Label>
                    <ArchetypeLookup
                      rulesetId={rulesetIdParam ?? undefined}
                      label=''
                      value={selectedArchetypeId}
                      placeholder='Select archetype (optional)'
                      data-testid='character-archetype-select'
                      onSelect={(archetype) => {
                        setSelectedArchetypeId(archetype.id);
                        setSelectedVariant(null);
                      }}
                      onDelete={() => {
                        setSelectedArchetypeId(null);
                        setSelectedVariant(null);
                      }}
                      variantValue={selectedArchetypeHasVariants ? selectedVariant : null}
                      onVariantSelect={
                        selectedArchetypeHasVariants
                          ? (v) => setSelectedVariant(v ?? null)
                          : undefined
                      }
                      variantPlaceholder='None'
                      variantLabel={
                        selectedArchetype ? `Variant for ${selectedArchetype.name}` : 'Variant'
                      }
                    />
                    {!selectedArchetypeId && (
                      <p className='text-sm text-muted-foreground'>Archetype is optional</p>
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

          <input
            ref={fileInputRef}
            type='file'
            accept='.zip'
            onChange={handleFileSelect}
            className='hidden'
          />
          <Button
            variant='outline'
            size='sm'
            className='gap-1'
            disabled={isImporting}
            onClick={handleImportClick}>
            {isImporting ? (
              <>
                <Upload className='h-4 w-4 animate-pulse' />
                Upload
              </>
            ) : (
              <>
                <Upload className='h-4 w-4' />
                Upload
              </>
            )}
          </Button>

          <Dialog open={rulesetWarningOpen} onOpenChange={setRulesetWarningOpen}>
            <DialogContent className='sm:max-w-[425px]'>
              <DialogHeader>
                <DialogTitle>Ruleset not found</DialogTitle>
                <DialogDescription>
                  The ruleset for this character is not available in this library.
                </DialogDescription>
              </DialogHeader>
              <p className='text-sm text-muted-foreground'>
                The character has been imported, but its original ruleset could not be found. Some
                attributes, items, or windows may not align correctly until the matching ruleset is
                imported.
              </p>
              <DialogFooter>
                <Button onClick={() => setRulesetWarningOpen(false)}>OK</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      }>
      <div className='flex flex-wrap gap-4'>
        {selectableCharacters.map((character) => {
          const doNotAsk = localStorage.getItem('qb.confirmOnDelete') === 'false';
          const rulesetTitle = getRulesetTitle(character.rulesetId);

          return (
            <Card
              key={character.id}
              className='flex aspect-square w-[min(100%,280px)] flex-col overflow-hidden p-0'
              data-testid='character-card'>
              <div
                className='min-h-0 flex-1 bg-muted bg-cover bg-center'
                style={character.image ? { backgroundImage: `url(${character.image})` } : undefined}
              />
              <div className='flex shrink-0 flex-col gap-2 border-t p-3'>
                <div className='flex min-w-0 flex-col gap-0.5'>
                  <h2 className='truncate text-sm font-semibold'>{character.name}</h2>
                  <span className='truncate text-xs text-muted-foreground'>{rulesetTitle}</span>
                </div>
                <div className='flex items-center gap-2'>
                  {doNotAsk ? (
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-8 flex-1 text-red-500'
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
                          className='h-8 flex-1 text-red-500'
                          data-testid='preview-card-delete'>
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Permanently delete this content?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Permanently delete this content?
                          </AlertDialogDescription>
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
                    variant='outline'
                    size='sm'
                    className='h-8 flex-1'
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
    </PageWrapper>
  );
};
