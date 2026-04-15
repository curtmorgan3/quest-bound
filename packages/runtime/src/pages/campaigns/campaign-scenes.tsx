import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
} from '@/components';
import { PageWrapper } from '@/components/composites';
import { CategoryField } from '@/components/composites/category-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCampaign, useCampaignScenes } from '@/lib/compass-api';
import { PreviewCard } from '@/pages/ruleset/components';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const ALL_CATEGORIES = 'all';

export function CampaignScenes() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const campaign = useCampaign(campaignId);
  const { campaignScenes, createCampaignScene, updateCampaignScene, deleteCampaignScene } =
    useCampaignScenes(campaignId);

  const [filterValue, setFilterValue] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const s of campaignScenes) {
      if (s.category?.trim()) set.add(s.category.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [campaignScenes]);

  const sortedScenes = [...campaignScenes].sort((a, b) => a.name.localeCompare(b.name));
  const filteredScenes = sortedScenes.filter((s) => {
    const matchesText = s.name.toLowerCase().includes(filterValue.toLowerCase());
    const matchesCategory =
      categoryFilter === ALL_CATEGORIES || s.category?.trim() === categoryFilter;
    return matchesText && matchesCategory;
  });

  const handleCreateOpenChange = (open: boolean) => {
    setCreateOpen(open);
    if (!open) {
      setNewName('');
      setNewCategory(null);
    }
  };

  const handleCreate = async () => {
    if (!campaignId || !newName.trim()) return;
    await createCampaignScene(campaignId, {
      name: newName.trim(),
      category: newCategory ?? undefined,
    });
    setNewName('');
    setNewCategory(null);
    setCreateOpen(false);
  };

  if (campaignId && campaign === undefined) {
    return (
      <div className='flex h-full w-full items-center justify-center p-4'>
        <p className='text-muted-foreground'>Loading…</p>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className='flex h-full w-full flex-col items-center justify-center gap-4 p-4'>
        <p className='text-muted-foreground'>Campaign not found</p>
        <Button variant='outline' onClick={() => navigate('/campaigns')}>
          Back to campaigns
        </Button>
      </div>
    );
  }

  return (
    <PageWrapper
      title='Scenes'
      headerActions={
        <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
          <DialogTrigger asChild>
            <Button size='sm' className='gap-1' data-testid='scenes-new-button'>
              <Plus className='h-4 w-4' />
              Create Scene
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Scene</DialogTitle>
              <DialogDescription>Add a scene to organize characters and items.</DialogDescription>
            </DialogHeader>
            <div className='grid gap-4 py-4'>
              <div className='grid gap-2'>
                <Label htmlFor='scene-name'>Name</Label>
                <Input
                  id='scene-name'
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder='e.g. Tavern, Forest road'
                />
              </div>
              <CategoryField
                value={newCategory}
                onChange={setNewCategory}
                existingCategories={categories}
                label='Category'
              />
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
      }>
      <div className='flex flex-col gap-4'>
        <div className='flex flex-wrap items-center gap-2'>
          <Input
            className='max-w-md'
            data-testid='scenes-filter'
            placeholder='Filter by name'
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
          />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className='w-[180px]' data-testid='scenes-category-filter'>
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
        <div className='flex gap-2 flex-wrap'>
          {filteredScenes.map((scene) => (
            <PreviewCard
              key={scene.id}
              id={scene.id}
              title={scene.name}
              type='documents'
              category={scene.category ?? undefined}
              existingCategories={categories}
              onDelete={() => deleteCampaignScene(scene.id)}
              onOpen={() => navigate(`/campaigns/${campaignId}/scenes/${scene.id}`)}
              onEdit={(name, category) =>
                updateCampaignScene(scene.id, { name, category: category ?? undefined })
              }
            />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
