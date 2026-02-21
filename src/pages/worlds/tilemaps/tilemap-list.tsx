import { Button, Input, Label } from '@/components';
import { ImageUpload } from '@/components/composites/image-upload';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAssets, useTilemaps, useWorld } from '@/lib/compass-api';
import { Layers, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

interface TilemapListProps {
  onCreated?: (tilemapId: string) => void;
}

export function TilemapList({ onCreated }: TilemapListProps) {
  const { worldId } = useParams<{ worldId: string }>();
  const world = useWorld(worldId);
  const { tilemaps, createTilemap } = useTilemaps(worldId);
  const { assets } = useAssets(world?.rulesetId ?? null);
  const [createOpen, setCreateOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [assetId, setAssetId] = useState<string | null>(null);
  const [tileWidth, setTileWidth] = useState(32);
  const [tileHeight, setTileHeight] = useState(32);

  const list = tilemaps ?? [];

  const handleCreate = async () => {
    if (!worldId || !assetId) return;
    const id = await createTilemap(worldId, {
      label: label.trim() || 'New Tilemap',
      assetId,
      tileWidth,
      tileHeight,
    });
    if (id) {
      setCreateOpen(false);
      setLabel('');
      setAssetId(null);
      setTileWidth(32);
      setTileHeight(32);
      onCreated?.(id);
    }
  };

  return (
    <div className='flex w-52 shrink-0 flex-col gap-2 border-l bg-muted/30 p-3'>
      <div className='flex items-center gap-2'>
        <Layers className='h-4 w-4' />
        <h2 className='text-sm font-semibold'>Tilemaps</h2>
      </div>
      <Button
        variant='outline'
        size='sm'
        className='gap-1'
        onClick={() => setCreateOpen(true)}
        data-testid='create-tilemap-button'>
        <Plus className='h-4 w-4' />
        Create tilemap
      </Button>
      <ul className='flex flex-col gap-1 overflow-auto'>
        {list.map((tm) => (
          <li key={tm.id}>
            <Button
              variant='ghost'
              size='sm'
              className='h-auto w-full justify-start truncate py-1'
              asChild>
              <Link
                to={`/worlds/${worldId}/tilemaps/${tm.id}`}
                data-testid={`tilemap-edit-${tm.id}`}>
                <span className='truncate' title={tm.label || `${tm.tileWidth}×${tm.tileHeight}`}>
                  {tm.label || `${tm.tileWidth}×${tm.tileHeight}`}
                </span>
              </Link>
            </Button>
          </li>
        ))}
      </ul>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Create tilemap</DialogTitle>
          </DialogHeader>
          <div className='grid gap-4'>
            <div className='grid gap-2'>
              <Label htmlFor='tilemap-label'>Label</Label>
              <Input
                id='tilemap-label'
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder='New Tilemap'
              />
            </div>
            <div className='grid gap-2'>
              <Label>Image</Label>
              <ImageUpload
                image={assetId ? assets.find((a) => a.id === assetId)?.data ?? null : null}
                alt='Tilemap'
                onUpload={setAssetId}
                onRemove={() => setAssetId(null)}
                rulesetId={world?.rulesetId ?? undefined}
              />
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div className='grid gap-2'>
                <Label htmlFor='tilemap-tile-width'>Tile width</Label>
                <Input
                  id='tilemap-tile-width'
                  type='number'
                  min={8}
                  value={tileWidth}
                  onChange={(e) => setTileWidth(parseInt(e.target.value, 10) || 32)}
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='tilemap-tile-height'>Tile height</Label>
                <Input
                  id='tilemap-tile-height'
                  type='number'
                  value={tileHeight}
                  onChange={(e) => setTileHeight(parseInt(e.target.value, 10) || 32)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!assetId}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
