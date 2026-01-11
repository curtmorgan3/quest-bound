import { Button, ImageUpload, Input } from '@/components';
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAssets, useCharacter, useRulesets } from '@/lib/compass-api';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const Characters = () => {
  const { characters, createCharacter, deleteCharacter } = useCharacter();
  const { rulesets } = useRulesets();
  const { assets, deleteAsset } = useAssets();

  const [name, setName] = useState('');
  const [rulesetId, setRulesetId] = useState('');
  const [assetId, setAssetId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

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
                <Select value={rulesetId} onValueChange={setRulesetId}>
                  <SelectTrigger id='character-ruleset' className='w-full'>
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

      <div className='flex flex-row gap-2 flex-wrap'>
        {characters.map((character) => (
          <Card
            key={character.id}
            className='p-4 w-[350px] h-[200px] flex flex-col justify-between'
            data-testid={`character-card-${character.id}`}
            style={
              character.image
                ? {
                    background: `url(${character.image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }
                : undefined
            }>
            <CardHeader>
              <CardTitle className='text-lg'>{character.name}</CardTitle>
            </CardHeader>
            <CardDescription className='text-sm text-muted-foreground'>
              Ruleset: {getRulesetTitle(character.rulesetId)}
            </CardDescription>
            <div className='flex gap-2 mt-2 bg-secondary rounded-md p-2 justify-between items-center'>
              <Button
                variant='ghost'
                onClick={() => deleteCharacter(character.id)}
                className='text-red-500'
                data-testid={`delete-character-${character.id}`}>
                Delete
              </Button>
              <CardAction>
                <Button
                  variant='link'
                  onClick={() => navigate(`/characters/${character.id}`)}
                  data-testid={`open-character-${character.id}`}>
                  Open
                </Button>
              </CardAction>
            </div>
          </Card>
        ))}
      </div>

      {characters.length === 0 && (
        <div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
          <p className='text-lg'>No characters yet</p>
          <p className='text-sm'>Create your first character to get started</p>
        </div>
      )}
    </div>
  );
};
