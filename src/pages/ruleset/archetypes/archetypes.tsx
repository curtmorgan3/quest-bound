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
  DialogTrigger,
} from '@/components/ui/dialog';
import { useArchetypes, useAssets } from '@/lib/compass-api';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

export const Archetypes = () => {
  const { rulesetId } = useParams();
  const { archetypes, createArchetype, updateArchetype, deleteArchetype, reorderArchetypes } =
    useArchetypes(rulesetId);
  const { assets, deleteAsset } = useAssets(rulesetId);

  const displayArchetypes = archetypes.filter((a) => !a.isDefault);

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAssetId, setNewAssetId] = useState<string | null>(null);
  const [newImage, setNewImage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAssetId, setEditAssetId] = useState<string | null>(null);
  const [editImage, setEditImage] = useState<string | null>(null);
  const justCreatedRef = useRef(false);

  const getImageFromAssetId = (id: string | null) => {
    if (!id) return null;
    const asset = assets.find((a) => a.id === id);
    return asset?.data ?? null;
  };

  const handleImageUpload = (uploadedAssetId: string) => {
    setNewAssetId(uploadedAssetId);
    const imageData = getImageFromAssetId(uploadedAssetId);
    if (imageData) setNewImage(imageData);
  };

  const handleSetUrl = (url: string) => {
    setNewAssetId(null);
    setNewImage(url);
  };

  const handleImageRemove = async () => {
    if (newAssetId) await deleteAsset(newAssetId);
    setNewAssetId(null);
    setNewImage(null);
  };

  const handleCreateOpenChange = (open: boolean) => {
    if (!open && newAssetId && !justCreatedRef.current) {
      deleteAsset(newAssetId);
    }
    justCreatedRef.current = false;
    setCreateOpen(open);
    if (!open) {
      setNewName('');
      setNewDescription('');
      setNewAssetId(null);
      setNewImage(null);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createArchetype({
      name: newName.trim(),
      description: newDescription.trim(),
      assetId: newAssetId,
      image: newImage,
    });
    justCreatedRef.current = true;
    setNewName('');
    setNewDescription('');
    setNewAssetId(null);
    setNewImage(null);
    setCreateOpen(false);
  };

  const startEdit = (id: string) => {
    const a = displayArchetypes.find((x) => x.id === id);
    if (a) {
      setEditingId(id);
      setEditName(a.name);
      setEditDescription(a.description ?? '');
      setEditAssetId(a.assetId ?? null);
      setEditImage(a.image ?? null);
    }
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await updateArchetype(editingId, {
      name: editName.trim(),
      description: editDescription.trim(),
      assetId: editAssetId,
      image: editImage,
    });
    setEditingId(null);
  };

  const handleEditImageUpload = (uploadedAssetId: string) => {
    setEditAssetId(uploadedAssetId);
    const imageData = getImageFromAssetId(uploadedAssetId);
    if (imageData) setEditImage(imageData);
  };

  const handleEditSetUrl = (url: string) => {
    setEditAssetId(null);
    setEditImage(url);
  };

  const handleEditImageRemove = () => {
    setEditAssetId(null);
    setEditImage(null);
  };

  const moveUp = async (index: number) => {
    if (index <= 0) return;
    const defaultId = archetypes.find((a) => a.isDefault)?.id;
    const displayIds = displayArchetypes.map((a) => a.id);
    [displayIds[index - 1], displayIds[index]] = [displayIds[index], displayIds[index - 1]];
    const ids = defaultId ? [defaultId, ...displayIds] : displayIds;
    await reorderArchetypes(ids);
  };

  const moveDown = async (index: number) => {
    if (index >= displayArchetypes.length - 1) return;
    const defaultId = archetypes.find((a) => a.isDefault)?.id;
    const displayIds = displayArchetypes.map((a) => a.id);
    [displayIds[index], displayIds[index + 1]] = [displayIds[index + 1], displayIds[index]];
    const ids = defaultId ? [defaultId, ...displayIds] : displayIds;
    await reorderArchetypes(ids);
  };

  const doNotAsk = localStorage.getItem('qb.confirmOnDelete') === 'false';

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex gap-2'>
        <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
          <DialogTrigger asChild>
            <Button className='w-[180px]' data-testid='archetypes-new-button'>
              <Plus className='h-4 w-4' />
              New Archetype
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Archetype</DialogTitle>
            </DialogHeader>
            <div className='grid gap-4 py-4'>
              <div className='grid gap-2'>
                <Label htmlFor='archetype-name'>Name</Label>
                <Input
                  id='archetype-name'
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder='e.g. Fighter'
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='archetype-desc'>Description</Label>
                <Input
                  id='archetype-desc'
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder='Optional description'
                />
              </div>
              <div className='grid gap-2'>
                <Label>Image</Label>
                <ImageUpload
                  image={newImage || getImageFromAssetId(newAssetId)}
                  alt='Archetype image'
                  rulesetId={rulesetId}
                  onUpload={handleImageUpload}
                  onRemove={handleImageRemove}
                  onSetUrl={handleSetUrl}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={() => handleCreateOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!newName.trim()}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className='flex flex-col gap-2' data-testid='archetypes-list'>
        {displayArchetypes.length > 0 && (
          <p className='italic text-sm text-muted-foreground'>
            Order determines default load order of archetype scripts. This is overridable during
            character creation.
          </p>
        )}
        {displayArchetypes.map((archetype, index) => (
          <Card
            key={archetype.id}
            className='p-4 flex flex-row items-center gap-3'
            data-testid={`archetype-item-${archetype.id}`}>
            <div className='flex flex-col gap-0'>
              <Button
                variant='ghost'
                size='icon'
                className='h-6 w-6'
                onClick={() => moveUp(index)}
                disabled={index === 0}>
                <ChevronUp className='h-4 w-4' />
              </Button>
              <Button
                variant='ghost'
                size='icon'
                className='h-6 w-6'
                onClick={() => moveDown(index)}
                disabled={index === displayArchetypes.length - 1}>
                <ChevronDown className='h-4 w-4' />
              </Button>
            </div>
            {(archetype.image || getImageFromAssetId(archetype.assetId ?? null)) && (
              <img
                src={archetype.image ?? getImageFromAssetId(archetype.assetId ?? null) ?? undefined}
                alt={archetype.name}
                className='h-12 w-12 shrink-0 rounded-md object-cover'
              />
            )}
            <div className='flex-1 min-w-0'>
              {editingId === archetype.id ? (
                <div className='flex flex-col gap-2'>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder='Name'
                  />
                  <Input
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder='Description'
                  />
                  <div className='grid gap-2'>
                    <Label>Image</Label>
                    <ImageUpload
                      image={editImage || getImageFromAssetId(editAssetId)}
                      alt='Archetype image'
                      rulesetId={rulesetId}
                      onUpload={handleEditImageUpload}
                      onRemove={handleEditImageRemove}
                      onSetUrl={handleEditSetUrl}
                    />
                  </div>
                  <div className='flex gap-2'>
                    <Button size='sm' onClick={saveEdit}>
                      Save
                    </Button>
                    <Button size='sm' variant='outline' onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className='font-medium'>{archetype.name}</div>
                  {archetype.description && (
                    <p className='text-sm text-muted-foreground mt-0.5'>{archetype.description}</p>
                  )}
                  {archetype.scriptId && (
                    <Link
                      to={`/rulesets/${rulesetId}/scripts/${archetype.scriptId}`}
                      className='text-sm text-primary hover:underline'>
                      View script
                    </Link>
                  )}
                </div>
              )}
            </div>
            {editingId !== archetype.id && (
              <div className='flex gap-1 shrink-0'>
                <Button variant='ghost' size='sm' onClick={() => startEdit(archetype.id)}>
                  Edit
                </Button>
                {doNotAsk ? (
                  <Button
                    variant='ghost'
                    size='sm'
                    className='text-destructive'
                    onClick={() => deleteArchetype(archetype.id)}
                    data-testid='archetype-delete-btn'
                    aria-label={`Delete ${archetype.name}`}>
                    <Trash2 className='h-4 w-4' />
                  </Button>
                ) : (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant='ghost'
                        size='sm'
                        className='text-destructive'
                        data-testid='archetype-delete-btn'
                        aria-label={`Delete ${archetype.name}`}>
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete archetype?</AlertDialogTitle>
                        This will delete the test character and all character associations. This
                        cannot be undone.
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className='bg-destructive text-destructive-foreground'
                          onClick={() => deleteArchetype(archetype.id)}
                          data-testid='archetype-delete-confirm'>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

      {displayArchetypes.length === 0 && (
        <p className='text-muted-foreground py-8'>No archetypes yet. Create one to get started.</p>
      )}
    </div>
  );
};
