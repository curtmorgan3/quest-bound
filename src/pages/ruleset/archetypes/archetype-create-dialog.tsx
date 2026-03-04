import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  ImageUpload,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components';
import { useArchetypes, useAssets, useCharts } from '@/lib/compass-api';
import { Plus } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

export function ArchetypeCreateDialog() {
  const { rulesetId } = useParams();
  const { createArchetype } = useArchetypes(rulesetId);
  const { assets, deleteAsset } = useAssets(rulesetId);
  const { charts } = useCharts(rulesetId);

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAssetId, setNewAssetId] = useState<string | null>(null);
  const [newImage, setNewImage] = useState<string | null>(null);
  const [useChartForVariants, setUseChartForVariants] = useState(false);
  const [variantsChartId, setVariantsChartId] = useState('');
  const [variantsChartColumnHeader, setVariantsChartColumnHeader] = useState('');
  const justCreatedRef = useRef(false);

  const variantsChartColumnHeaders = useMemo(() => {
    if (!variantsChartId) return [];
    const chart = charts.find((c) => c.id === variantsChartId);
    if (!chart?.data) return [];
    try {
      const rows = JSON.parse(chart.data) as string[][];
      return (rows[0] || []).filter(Boolean);
    } catch {
      return [];
    }
  }, [charts, variantsChartId]);

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
      setUseChartForVariants(false);
      setVariantsChartId('');
      setVariantsChartColumnHeader('');
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createArchetype({
      name: newName.trim(),
      description: newDescription.trim(),
      assetId: newAssetId,
      variantsChartRef:
        useChartForVariants && variantsChartId && variantsChartColumnHeader
          ? (variantsChartId as unknown as number)
          : undefined,
      variantsChartColumnHeader:
        useChartForVariants && variantsChartId && variantsChartColumnHeader
          ? variantsChartColumnHeader
          : undefined,
    });
    justCreatedRef.current = true;
    setNewName('');
    setNewDescription('');
    setNewAssetId(null);
    setNewImage(null);
    setUseChartForVariants(false);
    setVariantsChartId('');
    setVariantsChartColumnHeader('');
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
          <DialogDescription>New Archetype</DialogDescription>
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
            />
          </div>
          <div className='space-y-2'>
            <div className='flex items-center gap-2'>
              <Checkbox
                id='use-chart-variants'
                checked={useChartForVariants}
                onCheckedChange={(checked) => {
                  setUseChartForVariants(!!checked);
                  if (!checked) {
                    setVariantsChartId('');
                    setVariantsChartColumnHeader('');
                  }
                }}
              />
              <Label htmlFor='use-chart-variants'>Variants from chart</Label>
            </div>
            {useChartForVariants && (
              <div className='flex flex-row gap-4'>
                <div className='grid gap-2 flex-1'>
                  <Label htmlFor='variants-chart'>Chart</Label>
                  <Select
                    value={variantsChartId}
                    onValueChange={(value) => {
                      setVariantsChartId(value);
                      setVariantsChartColumnHeader('');
                    }}>
                    <SelectTrigger id='variants-chart'>
                      <SelectValue placeholder='Select a chart' />
                    </SelectTrigger>
                    <SelectContent>
                      {charts.map((chart) => (
                        <SelectItem key={chart.id} value={chart.id}>
                          {chart.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='grid gap-2 flex-1'>
                  <Label htmlFor='variants-column'>Column</Label>
                  <Select
                    value={variantsChartColumnHeader}
                    onValueChange={setVariantsChartColumnHeader}
                    disabled={!variantsChartId}>
                    <SelectTrigger id='variants-column'>
                      <SelectValue placeholder='Select a column' />
                    </SelectTrigger>
                    <SelectContent>
                      {variantsChartColumnHeaders.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
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
