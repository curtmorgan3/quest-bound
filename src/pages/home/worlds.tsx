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
import { useAssets, useRulesets, useWorlds } from '@/lib/compass-api';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const Worlds = () => {
  const { worlds, createWorld, deleteWorld } = useWorlds();
  const { rulesets } = useRulesets();
  const { assets, deleteAsset } = useAssets();

  const [label, setLabel] = useState('');
  const [rulesetId, setRulesetId] = useState('');
  const [assetId, setAssetId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const pendingAssetIdRef = useRef<string | null>(null);
  const navigate = useNavigate();

  const getImageFromAssetId = (id: string | null) => {
    if (!id) return null;
    const asset = assets.find((a) => a.id === id);
    return asset?.data ?? null;
  };

  const getRulesetTitle = (id: string) => {
    const ruleset = rulesets.find((r) => r.id === id);
    return ruleset?.title ?? 'Unknown Ruleset';
  };

  const handleCreate = async () => {
    if (!label.trim() || !rulesetId) return;

    const id = await createWorld({
      label: label.trim(),
      rulesetId,
      assetId: assetId ?? undefined,
    });

    if (id) {
      pendingAssetIdRef.current = null;
      resetForm();
      navigate(`/worlds/${id}`);
    }
  };

  const resetForm = () => {
    setLabel('');
    setRulesetId('');
    setAssetId(null);
    setOpen(false);
  };

  const handleOpenChange = async (isOpen: boolean) => {
    if (!isOpen && pendingAssetIdRef.current) {
      await deleteAsset(pendingAssetIdRef.current);
      pendingAssetIdRef.current = null;
    }
    if (!isOpen) {
      setLabel('');
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

  const isFormValid = label.trim() !== '' && rulesetId !== '';

  const sortedWorlds = [...worlds].sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className='flex h-full w-full flex-col p-4 gap-4'>
      <h1 className='text-4xl font-bold'>Worlds</h1>
      <div className='flex items-center gap-4'>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className='w-[180px]' data-testid='create-world-button'>
              Create New
            </Button>
          </DialogTrigger>
          <DialogContent className='sm:max-w-[425px]'>
            <DialogHeader>
              <DialogTitle>New World</DialogTitle>
            </DialogHeader>
            <div className='grid gap-4'>
              <div className='grid gap-3'>
                <Label htmlFor='world-label'>
                  Label <span className='text-destructive'>*</span>
                </Label>
                <Input
                  id='world-label'
                  name='label'
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder='Enter world name'
                />
              </div>
              <div className='grid gap-3'>
                <Label htmlFor='world-ruleset'>
                  Ruleset <span className='text-destructive'>*</span>
                </Label>
                <Select value={rulesetId} onValueChange={setRulesetId}>
                  <SelectTrigger id='world-ruleset' className='w-full' data-testid='world-ruleset-select'>
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
                  alt={label || 'World image'}
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
                data-testid='create-world-submit'
                onClick={handleCreate}
                disabled={!isFormValid}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className='flex flex-col gap-3'>
        {sortedWorlds.map((world) => {
          const doNotAsk = localStorage.getItem('qb.confirmOnDelete') === 'false';
          const rulesetTitle = getRulesetTitle(world.rulesetId);
          const imageUrl = getImageFromAssetId(world.assetId ?? null);

          return (
            <Card
              key={world.id}
              className='flex flex-row overflow-hidden p-0 h-32 min-h-32'
              data-testid='world-card'>
              <div
                className='w-40 shrink-0 bg-muted bg-cover bg-center'
                style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
              />
              <div className='flex min-w-0 flex-1 flex-col justify-between p-4'>
                <div className='min-w-0'>
                  <h2 className='truncate text-lg font-semibold'>{world.label}</h2>
                  <p className='mt-0.5 text-sm text-muted-foreground'>{rulesetTitle}</p>
                </div>

                <div className='mt-2 flex items-center justify-end gap-2'>
                  {doNotAsk ? (
                    <Button
                      variant='ghost'
                      size='sm'
                      className='text-red-500'
                      data-testid='preview-card-delete'
                      onClick={() => deleteWorld(world.id)}>
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
                            <Label htmlFor='world-card-do-not-ask-again'>Do not ask again</Label>
                            <Checkbox
                              id='world-card-do-not-ask-again'
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
                            onClick={() => deleteWorld(world.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}

                  <Button
                    variant='link'
                    size='sm'
                    onClick={() => navigate(`/worlds/${world.id}`)}
                    data-testid='world-card-open'>
                    Open
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {sortedWorlds.length === 0 && (
        <div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
          <p className='text-lg'>No worlds yet</p>
          <p className='text-sm'>Create a world to get started</p>
        </div>
      )}
    </div>
  );
};
