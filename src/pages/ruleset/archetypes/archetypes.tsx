import { useArchetypes, useAssets } from '@/lib/compass-api';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArchetypeCard } from './archetype-card';

export const Archetypes = () => {
  const { rulesetId } = useParams();
  const { archetypes, updateArchetype, deleteArchetype, reorderArchetypes } =
    useArchetypes(rulesetId);
  const { assets, deleteAsset } = useAssets(rulesetId);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAssetId, setEditAssetId] = useState<string | null>(null);
  const [editImage, setEditImage] = useState<string | null>(null);
  const [editMapWidth, setEditMapWidth] = useState<number | undefined>(undefined);
  const [editMapHeight, setEditMapHeight] = useState<number | undefined>(undefined);
  const [editSprites, setEditSprites] = useState<string[]>([]);

  const getImageFromAssetId = (id: string | null) => {
    if (!id) return null;
    const asset = assets.find((a) => a.id === id);
    return asset?.data ?? null;
  };

  const startEdit = (id: string) => {
    const a = archetypes.find((x) => x.id === id);
    if (a) {
      setEditingId(id);
      setEditName(a.name);
      setEditDescription(a.description ?? '');
      setEditAssetId(a.assetId ?? null);
      setEditImage(a.image ?? null);
      setEditMapWidth(a.mapWidth);
      setEditMapHeight(a.mapHeight);
      setEditSprites(a.sprites ?? []);
    }
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await updateArchetype(editingId, {
      name: editName.trim(),
      description: editDescription.trim(),
      assetId: editAssetId,
      image: editImage,
      mapWidth: editMapWidth,
      mapHeight: editMapHeight,
      sprites: editSprites,
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

  const editSpriteAssetId = editSprites[0] ?? null;
  const handleEditSpriteUpload = (uploadedAssetId: string) => {
    setEditSprites([uploadedAssetId]);
  };
  const handleEditSpriteSetUrl = (url: string) => {
    setEditSprites([url]);
  };
  const handleEditSpriteRemove = async () => {
    if (editSpriteAssetId && !editSpriteAssetId.startsWith('http')) {
      await deleteAsset(editSpriteAssetId);
    }
    setEditSprites([]);
  };

  const moveUp = async (index: number) => {
    if (index <= 1) return;
    const defaultId = archetypes.find((a) => a.isDefault)?.id;
    const displayIds = archetypes.map((a) => a.id);
    [displayIds[index - 1], displayIds[index]] = [displayIds[index], displayIds[index - 1]];
    const ids = defaultId ? [defaultId, ...displayIds] : displayIds;
    await reorderArchetypes(ids);
  };

  const moveDown = async (index: number) => {
    if (index >= archetypes.length - 1) return;
    const defaultId = archetypes.find((a) => a.isDefault)?.id;
    const displayIds = archetypes.map((a) => a.id);
    [displayIds[index], displayIds[index + 1]] = [displayIds[index + 1], displayIds[index]];
    const ids = defaultId ? [defaultId, ...displayIds] : displayIds;
    await reorderArchetypes(ids);
  };

  const doNotAsk = localStorage.getItem('qb.confirmOnDelete') === 'false';

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-2' data-testid='archetypes-list'>
        {archetypes.length > 0 && (
          <p className='italic text-sm text-muted-foreground'>
            Order determines the load order of archetype scripts
          </p>
        )}
        {archetypes.map((archetype, index) => (
          <ArchetypeCard
            key={archetype.id}
            archetype={archetype}
            index={index}
            totalCount={archetypes.length}
            rulesetId={rulesetId}
            getImageFromAssetId={getImageFromAssetId}
            isEditing={editingId === archetype.id}
            editName={editName}
            editDescription={editDescription}
            editAssetId={editAssetId}
            editImage={editImage}
            editMapWidth={editMapWidth}
            editMapHeight={editMapHeight}
            editSprites={editSprites}
            onMoveUp={() => moveUp(index)}
            onMoveDown={() => moveDown(index)}
            onStartEdit={() => startEdit(archetype.id)}
            onSaveEdit={saveEdit}
            onCancelEdit={() => setEditingId(null)}
            onEditNameChange={setEditName}
            onEditDescriptionChange={setEditDescription}
            onEditImageUpload={handleEditImageUpload}
            onEditImageRemove={handleEditImageRemove}
            onEditSetUrl={handleEditSetUrl}
            onEditMapWidthChange={setEditMapWidth}
            onEditMapHeightChange={setEditMapHeight}
            onEditSpriteUpload={handleEditSpriteUpload}
            onEditSpriteRemove={handleEditSpriteRemove}
            onEditSpriteSetUrl={handleEditSpriteSetUrl}
            onDelete={() => deleteArchetype(archetype.id)}
            confirmBeforeDelete={doNotAsk}
          />
        ))}
      </div>

      {archetypes.length === 0 && (
        <p className='text-muted-foreground py-8'>No archetypes yet. Create one to get started.</p>
      )}
    </div>
  );
};
