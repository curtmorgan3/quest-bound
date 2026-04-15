import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components';
import { useArchetypes, useAssets, useCharts } from '@/lib/compass-api';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useRulesetFiltersStore } from '@/stores/ruleset-filters-store';
import { useListFilterParams } from '../utils/list-filter-query-params';
import { ArchetypeCard } from './archetype-card';

const ALL_CATEGORIES = 'all';

export const Archetypes = () => {
  const { rulesetId } = useParams();
  const { archetypes, updateArchetype, deleteArchetype, reorderArchetypes } =
    useArchetypes(rulesetId);
  const { assets } = useAssets(rulesetId);
  const { charts } = useCharts(rulesetId);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAssetId, setEditAssetId] = useState<string | null>(null);
  const [editImage, setEditImage] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState<string | null>(null);
  const [editUseChartForVariants, setEditUseChartForVariants] = useState(false);
  const [editVariantsChartId, setEditVariantsChartId] = useState('');
  const [editVariantsChartColumnHeader, setEditVariantsChartColumnHeader] = useState('');
  const [searchParams] = useSearchParams();
  const { title: filterValue, category: categoryFilter, setTitle: setFilterValue, setCategory: setCategoryFilter } =
    useListFilterParams();
  const setListFilters = useRulesetFiltersStore((s) => s.setListFilters);

  useEffect(() => {
    if (!rulesetId) return;
    setListFilters(rulesetId, 'archetypes', {
      title: searchParams.get('title') ?? undefined,
      category: searchParams.get('category') ?? undefined,
    });
  }, [rulesetId, searchParams, setListFilters]);

  const handleTitleChange = (value: string) => {
    setFilterValue(value);
    if (rulesetId) setListFilters(rulesetId, 'archetypes', { title: value || null });
  };

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    if (rulesetId) setListFilters(rulesetId, 'archetypes', { category: value === ALL_CATEGORIES ? null : value });
  };

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
      setEditCategory(a.category ?? null);
      const hasChart = !!(a.variantsChartRef != null && a.variantsChartColumnHeader);
      setEditUseChartForVariants(hasChart);
      setEditVariantsChartId(a.variantsChartRef != null ? String(a.variantsChartRef) : '');
      setEditVariantsChartColumnHeader(a.variantsChartColumnHeader ?? '');
    }
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await updateArchetype(editingId, {
      name: editName.trim(),
      description: editDescription.trim(),
      assetId: editAssetId,
      image: editImage,
      category: editCategory ?? undefined,
      variantsChartRef:
        editUseChartForVariants && editVariantsChartId && editVariantsChartColumnHeader
          ? (editVariantsChartId as unknown as number)
          : undefined,
      variantsChartColumnHeader:
        editUseChartForVariants && editVariantsChartId && editVariantsChartColumnHeader
          ? editVariantsChartColumnHeader
          : undefined,
    });
    setEditingId(null);
  };

  const handleEditImageUpload = (uploadedAssetId: string) => {
    setEditAssetId(uploadedAssetId);
    const imageData = getImageFromAssetId(uploadedAssetId);
    if (imageData) setEditImage(imageData);
  };

  const handleEditImageRemove = () => {
    setEditAssetId(null);
    setEditImage(null);
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

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const a of archetypes) {
      if (a.category?.trim()) set.add(a.category.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [archetypes]);

  const existingCategories = [
    ...new Set(
      archetypes.map((a) => a.category).filter((c): c is string => !!c && c.trim() !== ''),
    ),
  ];

  const filteredArchetypes = archetypes.filter((a) => {
    const matchesText = a.name.toLowerCase().includes(filterValue.toLowerCase());
    const matchesCategory =
      categoryFilter === ALL_CATEGORIES || a.category?.trim() === categoryFilter;
    return matchesText && matchesCategory;
  });

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-wrap items-center gap-2'>
        <Input
          className='max-w-md'
          data-testid='preview-filter'
          placeholder='Filter by name'
          value={filterValue}
          onChange={(e) => handleTitleChange(e.target.value)}
        />
        <Select value={categoryFilter} onValueChange={handleCategoryChange}>
          <SelectTrigger className='w-[180px]' data-testid='category-filter'>
            <SelectValue placeholder='Category' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className='flex flex-col gap-2' data-testid='archetypes-list'>
        {archetypes.length > 0 && (
          <p className='italic text-sm text-muted-foreground'>
            Order determines the load order of archetype scripts
          </p>
        )}
        {filteredArchetypes.map((archetype) => {
          const index = archetypes.findIndex((a) => a.id === archetype.id);
          return (
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
              editCategory={editCategory}
              editUseChartForVariants={editUseChartForVariants}
              editVariantsChartId={editVariantsChartId}
              editVariantsChartColumnHeader={editVariantsChartColumnHeader}
              existingCategories={existingCategories}
              charts={charts}
              onMoveUp={() => moveUp(index)}
              onMoveDown={() => moveDown(index)}
              onStartEdit={() => startEdit(archetype.id)}
              onSaveEdit={saveEdit}
              onCancelEdit={() => setEditingId(null)}
              onEditNameChange={setEditName}
              onEditDescriptionChange={setEditDescription}
              onEditImageUpload={handleEditImageUpload}
              onEditImageRemove={handleEditImageRemove}
              onEditCategoryChange={setEditCategory}
              onEditUseChartForVariantsChange={setEditUseChartForVariants}
              onEditVariantsChartIdChange={setEditVariantsChartId}
              onEditVariantsChartColumnHeaderChange={setEditVariantsChartColumnHeader}
              onDelete={() => deleteArchetype(archetype.id)}
              confirmBeforeDelete={doNotAsk}
            />
          );
        })}
      </div>

      {archetypes.length === 0 && (
        <p className='text-muted-foreground py-8'>No archetypes yet. Create one to get started.</p>
      )}
    </div>
  );
};
