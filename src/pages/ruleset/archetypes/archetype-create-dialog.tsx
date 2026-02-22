import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  ImageUpload,
  Input,
  Label,
} from '@/components';
import { useArchetypes, useAssets } from '@/lib/compass-api';
import { Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

export function ArchetypeCreateDialog() {
  const { rulesetId } = useParams();
  const { createArchetype } = useArchetypes(rulesetId);
  const { assets, deleteAsset } = useAssets(rulesetId);

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAssetId, setNewAssetId] = useState<string | null>(null);
  const [newImage, setNewImage] = useState<string | null>(null);
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

  return (
    <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
      <DialogTrigger asChild>
        <Button size='sm' className='gap-1' data-testid='archetypes-new-button'>
          <Plus className='h-4 w-4' />
          Create Archetype
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
  );
}
