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
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components';
import { CategoryField, ImageUpload, PageWrapper } from '@/components/composites';
import { useAssets } from '@/lib/compass-api';
import { clearAssetReferences, db, getAssetReferenceCount } from '@/stores';
import { useRulesetFiltersStore } from '@/stores/ruleset-filters-store';
import type { Asset } from '@/types';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Loader2, Pencil, Plus, Trash, Upload } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useListFilterParams } from '../utils/list-filter-query-params';

function dedupeFileNames(files: File[]): File[] {
  const usedNames = new Set<string>();
  return files.map((file) => {
    const base = file.name.replace(/\.[^.]+$/, '');
    const ext = file.name.match(/\.[^.]+$/)?.[0] ?? '';
    let finalName = file.name;
    let n = 2;
    while (usedNames.has(finalName)) {
      finalName = `${base} (${n})${ext}`;
      n += 1;
    }
    usedNames.add(finalName);
    if (finalName === file.name) return file;
    return new File([file], finalName, { type: file.type });
  });
}

const CARD_WIDTH = 180;
const CARD_GAP = 16;
const ROW_HEIGHT = 170;
const ALL_CATEGORIES = 'all';

export function AssetsPage() {
  const { rulesetId } = useParams<{ rulesetId: string }>();
  const { assets, createAsset, updateAsset, deleteAsset } = useAssets(rulesetId ?? undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [editFilename, setEditFilename] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editCategory, setEditCategory] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const {
    title: filterValue,
    category: categoryFilter,
    setTitle: setFilterValue,
    setCategory: setCategoryFilter,
  } = useListFilterParams();
  const setListFilters = useRulesetFiltersStore((s) => s.setListFilters);

  useEffect(() => {
    if (!rulesetId) return;
    setListFilters(rulesetId, 'assets', {
      title: searchParams.get('title') ?? undefined,
      category: searchParams.get('category') ?? undefined,
    });
  }, [rulesetId, searchParams, setListFilters]);

  const handleTitleChange = (value: string) => {
    setFilterValue(value);
    if (rulesetId) setListFilters(rulesetId, 'assets', { title: value || null });
  };

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    if (rulesetId)
      setListFilters(rulesetId, 'assets', { category: value === ALL_CATEGORIES ? null : value });
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    filename: string;
    refCount: number;
  } | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<string | null>(null);

  const handleOpenEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setEditFilename(asset.filename);
    setEditUrl(asset.type === 'url' ? asset.data : '');
    setEditCategory(asset.category ?? null);
    setEditError(null);
  };

  const handleCloseEdit = () => {
    setEditingAsset(null);
    setEditFilename('');
    setEditUrl('');
    setEditCategory(null);
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingAsset || !editFilename.trim()) return;
    setEditError(null);
    try {
      const updates: Partial<Asset> = {
        filename: editFilename.trim(),
        category: editCategory?.trim() || undefined,
      };
      if (editingAsset.type === 'url' && editUrl.trim()) {
        updates.data = editUrl.trim();
      }
      await updateAsset(editingAsset.id, updates);
      handleCloseEdit();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Failed to save');
    }
  };

  const handleSwapImage = async (newAssetId: string) => {
    if (!editingAsset) return;
    const newAsset = await db.assets.get(newAssetId);
    if (!newAsset) return;
    try {
      await updateAsset(editingAsset.id, { data: newAsset.data, type: newAsset.type });
      await deleteAsset(newAssetId);
      setEditingAsset((prev) =>
        prev ? { ...prev, data: newAsset.data, type: newAsset.type } : null,
      );
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Failed to swap image');
    }
  };

  const doNotAskAgain = localStorage.getItem('qb.confirmOnDelete') === 'false';

  const handleDeleteClick = async (id: string, filename: string) => {
    const refCount = await getAssetReferenceCount(db, id);
    if (doNotAskAgain && refCount === 0) {
      await deleteAsset(id);
      return;
    }
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

  const handleUploadClick = () => {
    setUploadModalOpen(true);
  };

  const handleSelectFilesClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const fileList = Array.from(files);
    e.target.value = '';
    const category = uploadCategory?.trim() || undefined;
    setUploading(true);
    try {
      const deduped = dedupeFileNames(fileList);
      for (const file of deduped) {
        await createAsset(file, undefined, undefined, category);
      }
      setUploadModalOpen(false);
      setUploadCategory(null);
    } finally {
      setUploading(false);
    }
  };

  const sortedAssets = useMemo(
    () =>
      [...assets]
        // .filter((a) => a.type !== 'application/pdf')
        .sort((a, b) => a.filename.localeCompare(b.filename, undefined, { sensitivity: 'base' })),
    [assets],
  );

  const assetCategories = useMemo(
    () =>
      Array.from(
        new Set(sortedAssets.map((a) => a.category).filter((c): c is string => Boolean(c?.trim()))),
      ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
    [sortedAssets],
  );

  const filteredAssets = useMemo(() => {
    return sortedAssets.filter((a) => {
      const matchesName = a.filename.toLowerCase().includes(filterValue.toLowerCase());
      const matchesCategory =
        categoryFilter === ALL_CATEGORIES || (a.category?.trim() ?? '') === categoryFilter;
      return matchesName && matchesCategory;
    });
  }, [sortedAssets, filterValue, categoryFilter]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const columnCount = useMemo(() => {
    const w =
      containerWidth > 0 ? containerWidth : typeof window !== 'undefined' ? window.innerWidth : 800;
    return Math.max(1, Math.floor((w + CARD_GAP) / (CARD_WIDTH + CARD_GAP)));
  }, [containerWidth]);

  const rowCount = useMemo(
    () => (filteredAssets.length === 0 ? 0 : Math.ceil(filteredAssets.length / columnCount)),
    [filteredAssets.length, columnCount],
  );

  const rows = useMemo(() => {
    const out: Asset[][] = [];
    for (let i = 0; i < filteredAssets.length; i += columnCount) {
      out.push(filteredAssets.slice(i, i + columnCount));
    }
    return out;
  }, [filteredAssets, columnCount]);

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
  }, [filteredAssets.length]);

  useEffect(() => {
    if (rowCount === 0) return;
    const raf = requestAnimationFrame(() => virtualizer.measure());
    return () => cancelAnimationFrame(raf);
  }, [rowCount, columnCount, virtualizer]);

  const renderCard = (asset: Asset) => (
    <div key={asset.id} className='flex w-[180px] flex-col gap-1.5 rounded-lg border bg-card p-2'>
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
      <div className='flex items-center justify-between gap-0.5'>
        <span className='min-w-0 truncate text-xs font-medium' title={asset.filename}>
          {asset.filename}
        </span>
        <div className='flex shrink-0 gap-0.5'>
          <Button
            size='icon'
            variant='ghost'
            className='h-6 w-6'
            onClick={() => handleOpenEdit(asset)}>
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
    </div>
  );

  return (
    <PageWrapper
      title='Assets'
      headerActions={
        <div className='flex gap-2'>
          <ImageUpload
            rulesetId={rulesetId ?? undefined}
            hideSelectAsset
            trigger={({ openDialog }) => (
              <Button size='sm' onClick={openDialog} data-testid='assets-create-button'>
                <Plus className='h-4 w-4' />
                Create Asset
              </Button>
            )}
          />
          <Button
            size='sm'
            variant='outline'
            onClick={handleUploadClick}
            disabled={uploading}
            data-testid='assets-upload-button'>
            {uploading ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <Upload className='h-4 w-4' />
            )}
            {uploading ? 'Uploading…' : 'Upload'}
          </Button>
          <input
            ref={fileInputRef}
            type='file'
            accept='image/*'
            multiple
            className='hidden'
            onChange={handleFileChange}
          />
          <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload assets</DialogTitle>
              </DialogHeader>
              <div className='flex flex-col gap-4'>
                <CategoryField
                  value={uploadCategory}
                  onChange={setUploadCategory}
                  existingCategories={assetCategories}
                />
                <Button onClick={handleSelectFilesClick} disabled={uploading}>
                  {uploading ? (
                    <>
                      <Loader2 className='h-4 w-4 animate-spin' />
                      Uploading…
                    </>
                  ) : (
                    'Select Files'
                  )}
                </Button>
              </div>
              <DialogFooter>
                <Button
                  variant='secondary'
                  onClick={() => setUploadModalOpen(false)}
                  disabled={uploading}>
                  Cancel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      }>
      <div className='flex flex-col gap-4'>
        <div className='flex flex-wrap items-center gap-2'>
          <Input
            className='max-w-md'
            placeholder='Filter by name'
            value={filterValue}
            onChange={(e) => handleTitleChange(e.target.value)}
          />
          <Select value={categoryFilter} onValueChange={handleCategoryChange}>
            <SelectTrigger className='w-[180px]'>
              <SelectValue placeholder='Category' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
              {assetCategories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {sortedAssets.length === 0 ? (
          <p className='text-muted-foreground text-sm'>No assets in this ruleset</p>
        ) : filteredAssets.length === 0 ? (
          <p className='text-muted-foreground'>No assets match the current filters.</p>
        ) : (
          <div
            ref={scrollRef}
            className='w-full overflow-auto rounded-md border'
            style={{ height: 'calc(100vh - 180px)', contain: 'strict' }}>
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

      <Dialog open={!!editingAsset} onOpenChange={(open) => !open && handleCloseEdit()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit asset</DialogTitle>
          </DialogHeader>
          {editingAsset && (
            <div className='flex flex-col gap-4'>
              <div className='flex flex-col gap-2'>
                <span className='text-sm font-medium'>Image</span>
                <ImageUpload
                  image={
                    editingAsset.data &&
                    (editingAsset.type === 'url' || editingAsset.type.startsWith('image/'))
                      ? editingAsset.data
                      : undefined
                  }
                  alt={editingAsset.filename}
                  rulesetId={rulesetId ?? undefined}
                  onUpload={handleSwapImage}
                />
              </div>
              {editingAsset.type === 'url' && (
                <div className='flex flex-col gap-2'>
                  <label htmlFor='edit-url' className='text-sm font-medium'>
                    URL
                  </label>
                  <Input
                    id='edit-url'
                    type='url'
                    value={editUrl}
                    onChange={(e) => {
                      setEditUrl(e.target.value);
                      setEditError(null);
                    }}
                    placeholder='https://…'
                  />
                </div>
              )}
              <div className='flex flex-col gap-2'>
                <label htmlFor='edit-filename' className='text-sm font-medium'>
                  Name
                </label>
                <Input
                  id='edit-filename'
                  value={editFilename}
                  onChange={(e) => {
                    setEditFilename(e.target.value);
                    setEditError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit();
                    if (e.key === 'Escape') handleCloseEdit();
                  }}
                />
                {editError && <p className='text-sm text-destructive'>{editError}</p>}
              </div>
              <CategoryField
                value={editCategory}
                onChange={setEditCategory}
                existingCategories={assetCategories}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant='secondary' onClick={handleCloseEdit}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editingAsset || !editFilename.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          <div className='flex items-center gap-2 py-2'>
            <Checkbox
              id='asset-delete-do-not-ask'
              onCheckedChange={(checked) =>
                localStorage.setItem('qb.confirmOnDelete', String(!checked))
              }
            />
            <Label htmlFor='asset-delete-do-not-ask' className='text-sm font-normal cursor-pointer'>
              Do not ask again
            </Label>
          </div>
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
