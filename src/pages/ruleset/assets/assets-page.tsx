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
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Asset } from '@/types';
import { Pencil, Trash } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

const CARD_WIDTH = 180;
const CARD_GAP = 16;
const ROW_HEIGHT = 170;

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

  const sortedAssets = useMemo(
    () => [...assets].sort((a, b) => a.filename.localeCompare(b.filename, undefined, { sensitivity: 'base' })),
    [assets],
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const columnCount = useMemo(() => {
    const w =
      containerWidth > 0
        ? containerWidth
        : (typeof window !== 'undefined' ? window.innerWidth : 800);
    return Math.max(1, Math.floor((w + CARD_GAP) / (CARD_WIDTH + CARD_GAP)));
  }, [containerWidth]);

  const rowCount = useMemo(
    () => (sortedAssets.length === 0 ? 0 : Math.ceil(sortedAssets.length / columnCount)),
    [sortedAssets.length, columnCount],
  );

  const rows = useMemo(() => {
    const out: Asset[][] = [];
    for (let i = 0; i < sortedAssets.length; i += columnCount) {
      out.push(sortedAssets.slice(i, i + columnCount));
    }
    return out;
  }, [sortedAssets, columnCount]);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: useCallback(() => scrollRef.current, []),
    estimateSize: () => ROW_HEIGHT,
    overscan: 2,
  });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const syncWidth = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setContainerWidth(w);
    };
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry?.contentRect.width) setContainerWidth(entry.contentRect.width);
    });
    ro.observe(el);
    syncWidth();
    return () => ro.disconnect();
  }, [sortedAssets.length]);

  useEffect(() => {
    if (rowCount === 0) return;
    const raf = requestAnimationFrame(() => virtualizer.measure());
    return () => cancelAnimationFrame(raf);
  }, [rowCount, columnCount, virtualizer]);

  const renderCard = (asset: Asset) => (
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
  );

  return (
    <PageWrapper title='Assets'>
      <div className='flex flex-col gap-4'>
        <p className='text-sm text-muted-foreground'>
          Images and URL-backed assets for this ruleset. Names must be unique within the ruleset.
        </p>
        {sortedAssets.length === 0 ? (
          <p className='text-muted-foreground'>No assets in this ruleset yet.</p>
        ) : (
          <div
            ref={scrollRef}
            className='w-full overflow-auto rounded-md border'
            style={{ height: 'calc(100vh - 220px)', contain: 'strict' }}>
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}>
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const rowAssets = rows[virtualRow.index];
                if (!rowAssets) return null;
                return (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    className='absolute left-0 top-0 flex w-full justify-start gap-4'
                    style={{
                      transform: `translateY(${virtualRow.start}px)`,
                      height: ROW_HEIGHT,
                    }}>
                    {rowAssets.map((asset) => renderCard(asset))}
                  </div>
                );
              })}
            </div>
          </div>
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
