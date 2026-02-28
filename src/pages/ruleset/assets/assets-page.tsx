import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Input,
} from '@/components';
import { PageWrapper } from '@/components/composites';
import { useAssets } from '@/lib/compass-api';
import { clearAssetReferences, db, getAssetReferenceCount } from '@/stores';
import { Pencil, Trash } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

export function AssetsPage() {
  const { rulesetId } = useParams<{ rulesetId: string }>();
  const { assets, updateAsset, deleteAsset } = useAssets(rulesetId ?? undefined);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFilename, setEditFilename] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    filename: string;
    refCount: number;
  } | null>(null);

  const handleStartRename = (id: string, filename: string) => {
    setEditingId(id);
    setEditFilename(filename);
    setEditError(null);
  };

  const handleSaveRename = async () => {
    if (!editingId || !editFilename.trim()) return;
    setEditError(null);
    try {
      await updateAsset(editingId, { filename: editFilename.trim() });
      setEditingId(null);
      setEditFilename('');
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Failed to rename');
    }
  };

  const handleCancelRename = () => {
    setEditingId(null);
    setEditFilename('');
    setEditError(null);
  };

  const handleDeleteClick = async (id: string, filename: string) => {
    const refCount = await getAssetReferenceCount(db, id);
    setDeleteConfirm({ id, filename, refCount });
  };

  const handleDeleteConfirm = async (clearRefs: boolean) => {
    if (!deleteConfirm) return;
    if (clearRefs) {
      await clearAssetReferences(db, deleteConfirm.id);
    }
    await deleteAsset(deleteConfirm.id);
    setDeleteConfirm(null);
  };

  const sortedAssets = [...assets].sort((a, b) =>
    a.filename.localeCompare(b.filename, undefined, { sensitivity: 'base' }),
  );

  return (
    <PageWrapper title='Assets'>
      <div className='flex flex-col gap-4'>
        <p className='text-sm text-muted-foreground'>
          Images and URL-backed assets for this ruleset. Names must be unique within the ruleset.
        </p>
        <div className='grid gap-0 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7'>
          {sortedAssets.map((asset) => (
            <div
              key={asset.id}
              className='flex w-[180px] flex-col gap-1.5 rounded-lg border bg-card p-2'>
              <div className='h-[120px] shrink-0 overflow-hidden rounded bg-muted'>
                {asset.data && (asset.type === 'url' || asset.type.startsWith('image/')) ? (
                  <img
                    src={asset.type === 'url' ? asset.data : asset.data}
                    alt={asset.filename}
                    className='h-full w-full object-contain'
                  />
                ) : (
                  <div className='flex h-full w-full items-center justify-center text-xs text-muted-foreground'>
                    {asset.type}
                  </div>
                )}
              </div>
              {editingId === asset.id ? (
                <div className='flex flex-col gap-1'>
                  <Input
                    value={editFilename}
                    onChange={(e) => {
                      setEditFilename(e.target.value);
                      setEditError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRename();
                      if (e.key === 'Escape') handleCancelRename();
                    }}
                    className='h-7 text-xs'
                  />
                  {editError && <p className='text-xs text-destructive'>{editError}</p>}
                  <div className='flex gap-1'>
                    <Button
                      size='sm'
                      variant='secondary'
                      className='h-7 flex-1 text-xs'
                      onClick={handleCancelRename}>
                      Cancel
                    </Button>
                    <Button
                      size='sm'
                      className='h-7 flex-1 text-xs'
                      onClick={handleSaveRename}
                      disabled={!editFilename.trim()}>
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className='flex items-center justify-between gap-0.5'>
                  <span className='min-w-0 truncate text-xs font-medium' title={asset.filename}>
                    {asset.filename}
                  </span>
                  <div className='flex shrink-0 gap-0.5'>
                    <Button
                      size='icon'
                      variant='ghost'
                      className='h-6 w-6'
                      onClick={() => handleStartRename(asset.id, asset.filename)}>
                      <Pencil className='h-3 w-3' />
                    </Button>
                    <Button
                      size='icon'
                      variant='ghost'
                      className='h-6 w-6 text-destructive hover:text-destructive'
                      onClick={() => handleDeleteClick(asset.id, asset.filename)}>
                      <Trash className='h-3 w-3' />
                    </Button>
                  </div>
                </div>
              )}
              <span className='text-[10px] text-muted-foreground'>
                {asset.type === 'url' ? 'URL' : asset.type}
              </span>
            </div>
          ))}
        </div>
        {sortedAssets.length === 0 && (
          <p className='text-muted-foreground'>No assets in this ruleset yet.</p>
        )}
      </div>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete asset</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm && deleteConfirm.refCount > 0 ? (
                <>
                  &quot;{deleteConfirm.filename}&quot; is used in {deleteConfirm.refCount} place
                  {deleteConfirm.refCount === 1 ? '' : 's'}. Do you want to remove it and clear
                  those references, or cancel?
                </>
              ) : (
                <>Delete &quot;{deleteConfirm?.filename}&quot;? This cannot be undone.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                handleDeleteConfirm(deleteConfirm?.refCount ? deleteConfirm.refCount > 0 : false)
              }
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
              {deleteConfirm && deleteConfirm.refCount > 0
                ? 'Remove and clear references'
                : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
