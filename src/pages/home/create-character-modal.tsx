import { Button, ImageUpload, Input, Label } from '@/components';
import { MarkdownPanel } from '@/components/composites/markdown-panel';
import { Card } from '@/components/ui/card';
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useAssets } from '@/lib/compass-api';
import { db } from '@/stores';
import type { Archetype, ArchetypeWithVariantOptions } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus } from 'lucide-react';
import { useRef, useState } from 'react';

interface CreateCharacterModalProps {
  rulesetId: string | null;
  onCreate: (params: {
    name: string;
    rulesetId: string;
    archetypeIds: string[];
    variant?: string;
    assetId: string | null;
  }) => Promise<any>;
}

export function CreateCharacterModal({ rulesetId, onCreate }: CreateCharacterModalProps) {
  const { assets, deleteAsset } = useAssets();

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [selectedArchetypeId, setSelectedArchetypeId] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [detailsArchetype, setDetailsArchetype] = useState<Archetype | null>(null);

  const pendingAssetIdRef = useRef<string | null>(null);

  const archetypes: Archetype[] =
    useLiveQuery(
      () =>
        rulesetId
          ? db.archetypes.where('rulesetId').equals(rulesetId).sortBy('loadOrder')
          : Promise.resolve([] as Archetype[]),
      [rulesetId],
    ) ?? [];

  const selectableArchetypes = archetypes.filter((a) => !a.isDefault);

  const getImageFromAssetId = (id: string | null) => {
    if (!id) return null;
    const asset = assets.find((a) => a.id === id);
    return asset?.data ?? null;
  };

  const resetForm = () => {
    setStep(1);
    setName('');
    setSelectedArchetypeId(null);
    setSelectedVariant(null);
    setAssetId(null);
    setOpen(false);
  };

  const handleCreate = async () => {
    if (!name.trim() || !rulesetId) return;

    await onCreate({
      name: name.trim(),
      rulesetId,
      archetypeIds: selectedArchetypeId ? [selectedArchetypeId] : [],
      variant: selectedVariant ?? undefined,
      assetId,
    });

    pendingAssetIdRef.current = null;
    resetForm();
  };

  const handleOpenChange = async (isOpen: boolean) => {
    if (!isOpen && pendingAssetIdRef.current) {
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

  const hasArchetypes = selectableArchetypes.length > 0;
  const isFormValid = name.trim() !== '' && rulesetId != null && rulesetId !== '';

  const selectedArchetype = selectedArchetypeId
    ? (archetypes.find((a) => a.id === selectedArchetypeId) as
        | ArchetypeWithVariantOptions
        | undefined)
    : undefined;
  const selectedArchetypeHasVariants =
    selectedArchetype?.variantOptions && selectedArchetype.variantOptions.length > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button size='sm' className='gap-1' data-testid='create-character-button'>
            <Plus className='h-4 w-4' />
            Create Character
          </Button>
        </DialogTrigger>
        <DialogContent
          className={
            step === 2
              ? 'flex h-screen max-h-screen w-[80dvw] min-w-[90dvw] max-w-[100dvw] flex-col rounded-none'
              : 'max-w-[100dvw] sm:max-w-[480px]'
          }>
          <DialogHeader>
            <DialogTitle>Create Character</DialogTitle>
            <DialogDescription>
              {step === 1 ? 'New Character' : 'Select Archetype'}
            </DialogDescription>
          </DialogHeader>
          {step === 1 ? (
            <div className='grid gap-4'>
              {!rulesetId ? (
                <p className='text-sm text-muted-foreground'>
                  Open a ruleset from the home page (e.g. from the ruleset&apos;s Characters card)
                  to create a character for that ruleset.
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
                      rulesetId={rulesetId}
                    />
                  </div>
                  {hasArchetypes && (
                    <div className='grid gap-3'>
                      <Label>Archetype</Label>
                      <div className='flex items-center gap-2'>
                        <span className='text-sm text-muted-foreground flex-1 truncate'>
                          {selectedArchetype ? selectedArchetype.name : 'None'}
                        </span>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={() => setStep(2)}>
                          Choose
                        </Button>
                        {selectedArchetypeId && (
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            onClick={() => {
                              setSelectedArchetypeId(null);
                              setSelectedVariant(null);
                            }}>
                            Clear
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                  {selectedArchetype && selectedArchetypeHasVariants && (
                    <div className='grid gap-2'>
                      <Label className='text-sm'>Variant for {selectedArchetype.name}</Label>
                      <select
                        className='border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm'
                        value={selectedVariant ?? ''}
                        onChange={(e) => setSelectedVariant(e.target.value || null)}>
                        <option value=''>None</option>
                        {(selectedArchetype as ArchetypeWithVariantOptions).variantOptions?.map(
                          (v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className='flex min-h-0 min-w-[90dvw] flex-1 flex-col gap-4'>
              <div className='flex flex-wrap gap-4 overflow-y-auto'>
                {selectableArchetypes.map((archetype) => {
                  const isSelected = selectedArchetypeId === archetype.id;
                  return (
                    <Card
                      key={archetype.id}
                      className={`flex aspect-square w-[min(100%,280px)] flex-col overflow-hidden p-0 transition-colors ${isSelected ? 'border-primary ring-1 ring-primary' : ''}`}>
                      <div
                        className='min-h-0 flex-1 bg-muted bg-cover bg-center'
                        style={
                          archetype.image
                            ? { backgroundImage: `url(${archetype.image})` }
                            : undefined
                        }
                      />
                      <div className='flex shrink-0 flex-col gap-2 border-t p-3'>
                        <div className='flex min-w-0 flex-col gap-0.5'>
                          <h2 className='truncate text-sm font-semibold'>{archetype.name}</h2>
                          {archetype.category && (
                            <span className='truncate text-xs text-muted-foreground'>
                              {archetype.category}
                            </span>
                          )}
                        </div>
                        <div className='flex items-center gap-2'>
                          <Button
                            variant={isSelected ? 'default' : 'outline'}
                            size='sm'
                            className='h-8 flex-1'
                            onClick={() => {
                              setSelectedArchetypeId(isSelected ? null : archetype.id);
                              setSelectedVariant(null);
                              setStep(1);
                            }}>
                            {isSelected ? 'Selected' : 'Select'}
                          </Button>
                          {archetype.description && (
                            <Button
                              variant='outline'
                              size='sm'
                              className='h-8 flex-1'
                              onClick={() => setDetailsArchetype(archetype)}>
                              Details
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
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
            {step === 1 && (
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

      <Sheet open={detailsArchetype !== null} onOpenChange={(o) => !o && setDetailsArchetype(null)}>
        <SheetContent side='right' className='flex flex-col'>
          <SheetHeader>
            <SheetTitle>{detailsArchetype?.name}</SheetTitle>
            {detailsArchetype?.category && (
              <SheetDescription>{detailsArchetype.category}</SheetDescription>
            )}
          </SheetHeader>
          <div className='min-h-0 flex-1 overflow-y-auto'>
            <MarkdownPanel value={detailsArchetype?.description ?? ''} readOnly />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
