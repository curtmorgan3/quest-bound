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
  Input,
  Label,
} from '@/components';
import { ImageUpload } from '@/components/composites/image-upload';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MAX_LOCATION_MAP_ASSET_HEIGHT, MAX_LOCATION_MAP_ASSET_WIDTH } from '@/constants';
import { useAssets, useTilemaps, useWorld } from '@/lib/compass-api';
import { db } from '@/stores';
import { ArrowLeft, Layers, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

async function isAssetReferencedElsewhere(assetId: string): Promise<boolean> {
  if (!assetId) return false;
  const [user, ruleset, chart, document, component, character, archetype, world, tilemap] =
    await Promise.all([
      db.users.where('assetId').equals(assetId).first(),
      db.rulesets.where('assetId').equals(assetId).first(),
      db.charts.where('assetId').equals(assetId).first(),
      db.documents.where('assetId').equals(assetId).first(),
      db.components.where('assetId').equals(assetId).first(),
      db.characters.where('assetId').equals(assetId).first(),
      db.archetypes.where('assetId').equals(assetId).first(),
      db.worlds.where('assetId').equals(assetId).first(),
      db.tilemaps.where('assetId').equals(assetId).first(),
    ]);
  return !!(
    user ||
    ruleset ||
    chart ||
    document ||
    component ||
    character ||
    archetype ||
    world ||
    tilemap
  );
}

export function TilemapListPage() {
  const { worldId } = useParams<{ worldId: string }>();
  const navigate = useNavigate();
  const world = useWorld(worldId);
  const { tilemaps, createTilemap, deleteTilemap } = useTilemaps(worldId);
  const { assets, deleteAsset } = useAssets(world?.rulesetId ?? null);
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
      navigate(`/worlds/${worldId}/tilemaps/${id}`);
    }
  };

  const handleDelete = async (tm: { id: string; assetId: string }) => {
    const assetIdToCheck = tm.assetId || null;
    await deleteTilemap(tm.id);
    if (assetIdToCheck && !(await isAssetReferencedElsewhere(assetIdToCheck))) {
      await deleteAsset(assetIdToCheck);
    }
  };

  if (!worldId) return null;
  if (world === undefined) {
    return (
      <div className='flex h-full w-full items-center justify-center p-4'>
        <p className='text-muted-foreground'>Loading…</p>
      </div>
    );
  }
  if (!world) {
    return (
      <div className='flex h-full w-full flex-col items-center justify-center gap-2 p-4'>
        <p className='text-muted-foreground'>World not found.</p>
        <Button asChild variant='link'>
          <Link to='/worlds'>Back to Worlds</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className='flex h-full w-full flex-col'>
      <div className='flex shrink-0 items-center gap-2 border-b bg-background px-4 py-2'>
        <Button variant='ghost' size='sm' asChild>
          <Link to={`/worlds/${worldId}`} data-testid='tilemap-list-back'>
            <ArrowLeft className='h-4 w-4' />
            Back to World
          </Link>
        </Button>
        <span className='text-muted-foreground'>|</span>
        <h1 className='truncate text-lg font-semibold'>{world.label}</h1>
        <span className='text-muted-foreground'>›</span>
        <h1 className='truncate text-lg font-semibold'>Tilemaps</h1>
        <Button
          variant='outline'
          size='sm'
          className='ml-auto gap-1'
          onClick={() => setCreateOpen(true)}
          data-testid='create-tilemap-button'>
          <Plus className='h-4 w-4' />
          Create tilemap
        </Button>
      </div>

      <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4'>
        <ul className='flex flex-col gap-2'>
          {list.map((tm) => (
            <li key={tm.id} className='flex items-center gap-2'>
              <Button variant='outline' className='min-w-0 flex-1 justify-start gap-2' asChild>
                <Link
                  to={`/worlds/${worldId}/tilemaps/${tm.id}`}
                  data-testid={`tilemap-edit-${tm.id}`}>
                  <Layers className='h-4 w-4 shrink-0' />
                  <span className='truncate' title={tm.label || `${tm.tileWidth}×${tm.tileHeight}`}>
                    {tm.label || `${tm.tileWidth}×${tm.tileHeight}`}
                  </span>
                </Link>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='shrink-0 text-destructive hover:text-destructive'
                    aria-label='Delete tilemap'
                    data-testid={`tilemap-delete-${tm.id}`}>
                    <Trash2 className='h-4 w-4' />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this tilemap?</AlertDialogTitle>
                    <p className='text-sm text-muted-foreground'>
                      All tiles in this tilemap will be removed. Locations that used these tiles
                      will keep their layout but the tile reference may be broken.
                    </p>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                      onClick={() => handleDelete(tm)}
                      data-testid={`tilemap-delete-confirm-${tm.id}`}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </li>
          ))}
        </ul>
        {list.length === 0 && (
          <p className='text-muted-foreground'>No tilemaps yet. Create one to get started.</p>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Create tilemap</DialogTitle>
          </DialogHeader>
          <div className='grid gap-4'>
            <p className='text-sm text-muted-foreground'>
              {`Images larger than ${MAX_LOCATION_MAP_ASSET_WIDTH}x${MAX_LOCATION_MAP_ASSET_HEIGHT} will be scaled down`}
            </p>
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
                image={assetId ? (assets.find((a) => a.id === assetId)?.data ?? null) : null}
                alt='Tilemap'
                onUpload={setAssetId}
                onRemove={() => setAssetId(null)}
                worldId={worldId}
                maxWidth={MAX_LOCATION_MAP_ASSET_WIDTH}
                maxHeight={MAX_LOCATION_MAP_ASSET_HEIGHT}
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
