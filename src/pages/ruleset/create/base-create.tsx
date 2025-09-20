import { Button, Input, Label, Textarea } from '@/components';
import { FileSpreadsheet, HandFist, Sword, UserRoundPen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { AttributeCreate } from './attribute-create';
import { ChartCreate } from './chart-create';
import { useActionValues, useAttributeValues, useChartValues, useItemValues } from './hooks';
import { ItemCreate } from './item-create';

const iconset = {
  attributes: UserRoundPen,
  actions: HandFist,
  items: Sword,
  charts: FileSpreadsheet,
};

interface BaseCreateProps {
  onCreate?: (editMode: boolean) => void;
}

export const BaseCreate = ({ onCreate }: BaseCreateProps) => {
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const isEditMode = !!editId;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  const baseProperties = { title, description, category };

  const { saveAttribute, ...attributeProps } = useAttributeValues({
    id: editId || undefined,
    baseProperties,
    onCreate: () => {
      document.getElementById('create-title')?.focus();
    },
    setTitle,
    setDescription,
    setCategory,
  });

  const { saveAction } = useActionValues({
    id: editId || undefined,
    baseProperties,
    onCreate: () => {
      document.getElementById('create-title')?.focus();
    },
    setTitle,
    setDescription,
    setCategory,
  });

  const { saveItem, ...itemProps } = useItemValues({
    id: editId || undefined,
    baseProperties,
    onCreate: () => {
      document.getElementById('create-title')?.focus();
    },
    setTitle,
    setDescription,
    setCategory,
  });

  const { saveChart, ...chartProps } = useChartValues({
    id: editId || undefined,
    baseProperties,
    onCreate: () => {
      document.getElementById('create-title')?.focus();
    },
    setTitle,
    setDescription,
    setCategory,
  });

  const initialType = pathname.split('/').pop() as 'attributes' | 'items' | 'actions' | 'charts';
  const [activeType, setActiveType] = useState<'attributes' | 'items' | 'actions' | 'charts'>(
    initialType || 'attributes',
  );

  useEffect(() => {
    resetAll();
    searchParams.set('edit', '');
    setSearchParams(searchParams);
  }, [activeType]);

  const resetAll = () => {
    setTitle('');
    setDescription('');
    setCategory('');
  };

  const handleCreate = () => {
    switch (activeType) {
      case 'attributes':
        saveAttribute();
        break;
      case 'items':
        saveItem();
        break;
      case 'actions':
        saveAction();
        break;
      case 'charts':
        saveChart();
        break;
      default:
        break;
    }
    setTitle('');
    setDescription('');
    // Keep cateogry for faster entry
    document.getElementById('create-title')?.focus();
    onCreate?.(isEditMode);
  };

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex justify-around items-center gap-2 mb-4'>
        <Button
          variant={activeType === 'attributes' ? 'default' : 'outline'}
          onClick={() => setActiveType('attributes')}>
          <iconset.attributes />
        </Button>
        <Button
          variant={activeType === 'actions' ? 'default' : 'outline'}
          onClick={() => setActiveType('actions')}>
          <iconset.actions />
        </Button>
        <Button
          variant={activeType === 'items' ? 'default' : 'outline'}
          onClick={() => setActiveType('items')}>
          <iconset.items />
        </Button>
        <Button
          variant={activeType === 'charts' ? 'default' : 'outline'}
          onClick={() => setActiveType('charts')}>
          <iconset.charts />
        </Button>
      </div>

      <div className='grid gap-4'>
        <div className='w-full flex flex-row gap-4'>
          <div className='grid gap-3 w-[50%]'>
            <Label htmlFor='create-title'>Title</Label>
            <Input
              autoFocus
              id='create-title'
              name='title'
              onChange={(e) => setTitle(e.target.value)}
              value={title}
            />
          </div>
          <div className='grid gap-3 w-[50%]'>
            <Label htmlFor='create-category'>Category</Label>
            <Input
              id='create-category'
              name='category'
              onChange={(e) => setCategory(e.target.value)}
              value={category}
            />
          </div>
        </div>
        {activeType === 'attributes' && <AttributeCreate {...attributeProps} />}
        {activeType === 'items' && <ItemCreate {...itemProps} />}
        {activeType === 'charts' && <ChartCreate {...chartProps} />}

        <div className='grid gap-3'>
          <Label htmlFor='create-description'>Description</Label>
          <Textarea
            id='create-description'
            name='description'
            onChange={(e) => setDescription(e.target.value)}
            value={description}
          />
        </div>
      </div>
      <div className='flex justify-end items-end flex-grow'>
        <Button type='submit' className='w-full' onClick={handleCreate}>
          {isEditMode ? 'Save Changes' : 'Create'}
        </Button>
      </div>
    </div>
  );
};
