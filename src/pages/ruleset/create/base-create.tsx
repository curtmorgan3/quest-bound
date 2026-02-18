import { Button, DescriptionEditor, Input, Label } from '@/components';
import {
  AppWindow,
  FileSpreadsheet,
  HandFist,
  LayoutTemplate,
  Newspaper,
  Sword,
  UserRoundPen,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { ActionCreate } from './action-create';
import { AttributeCreate } from './attribute-create';
import { ChartCreate } from './chart-create';
import { DocumentCreate } from './document-create';
import {
  useActionValues,
  useAttributeValues,
  useChartValues,
  useDocumentValues,
  useItemValues,
  usePageValues,
  useWindowValues,
} from './hooks';
import { ItemCreate } from './item-create';

const iconset = {
  attributes: UserRoundPen,
  actions: HandFist,
  items: Sword,
  charts: FileSpreadsheet,
  documents: Newspaper,
  windows: AppWindow,
  pages: LayoutTemplate,
};

interface BaseCreateProps {
  onCreate?: (editMode: boolean) => void;
}

export const BaseCreate = ({ onCreate }: BaseCreateProps) => {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
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

  const { saveAction, ...actionProps } = useActionValues({
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

  const { saveWindow } = useWindowValues({
    id: editId || undefined,
    baseProperties,
    onCreate: () => {
      document.getElementById('create-title')?.focus();
    },
    setTitle,
    setCategory,
    setDescription,
  });

  const { savePage } = usePageValues({
    id: editId || undefined,
    baseProperties,
    onCreate: () => {
      document.getElementById('create-title')?.focus();
    },
    setTitle,
    setCategory,
    setDescription,
  });

  const { saveDocument, ...documentProps } = useDocumentValues({
    id: editId || undefined,
    baseProperties,
    onCreate: () => {
      document.getElementById('create-title')?.focus();
    },
    setTitle,
    setDescription,
    setCategory,
  });

  const initialType = pathname.split('/').pop() as
    | 'attributes'
    | 'items'
    | 'actions'
    | 'charts'
    | 'documents'
    | 'windows'
    | 'pages';
  const [activeType, setActiveType] = useState<
    'attributes' | 'items' | 'actions' | 'charts' | 'documents' | 'windows' | 'pages'
  >(initialType || 'attributes');

  useEffect(() => {
    resetAll();
  }, [activeType]);

  const resetAll = () => {
    setTitle('');
    setDescription('');
    setCategory('');
  };

  const handleCreate = () => {
    if (!title) return;
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
      case 'documents':
        saveDocument();
        break;
      case 'windows':
        saveWindow();
        break;
      case 'pages':
        savePage();
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

  const handleKeySubmit = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleCreate();
    }
  };

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex justify-around items-center gap-2 mb-4'>
        <Button
          variant={activeType === 'attributes' ? 'default' : 'outline'}
          onClick={() => setActiveType('attributes')}
          data-testid='base-create-type-attributes'>
          <iconset.attributes />
        </Button>
        <Button
          variant={activeType === 'actions' ? 'default' : 'outline'}
          onClick={() => setActiveType('actions')}
          data-testid='base-create-type-actions'>
          <iconset.actions />
        </Button>
        <Button
          variant={activeType === 'items' ? 'default' : 'outline'}
          onClick={() => setActiveType('items')}
          data-testid='base-create-type-items'>
          <iconset.items />
        </Button>
        <Button
          variant={activeType === 'charts' ? 'default' : 'outline'}
          onClick={() => setActiveType('charts')}>
          <iconset.charts />
        </Button>
        <Button
          variant={activeType === 'documents' ? 'default' : 'outline'}
          onClick={() => setActiveType('documents')}>
          <iconset.documents />
        </Button>
        <Button
          variant={activeType === 'windows' ? 'default' : 'outline'}
          onClick={() => setActiveType('windows')}
          data-testid='base-create-type-windows'>
          <iconset.windows />
        </Button>
        <Button
          variant={activeType === 'pages' ? 'default' : 'outline'}
          onClick={() => setActiveType('pages')}>
          <iconset.pages />
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
              onKeyDown={(e) => handleKeySubmit(e)}
            />
          </div>
          <div className='grid gap-3 w-[50%]'>
            <Label htmlFor='create-category'>Category</Label>
            <Input
              id='create-category'
              name='category'
              onChange={(e) => setCategory(e.target.value)}
              value={category}
              onKeyDown={(e) => handleKeySubmit(e)}
            />
          </div>
        </div>
        {activeType === 'attributes' && <AttributeCreate {...attributeProps} />}
        {activeType === 'actions' && <ActionCreate {...actionProps} />}
        {activeType === 'items' && <ItemCreate {...itemProps} />}
        {activeType === 'charts' && <ChartCreate {...chartProps} />}
        {activeType === 'documents' && <DocumentCreate {...documentProps} />}

        <DescriptionEditor
          id='create-description'
          value={description}
          onChange={(value) => setDescription(value)}
          onSave={handleCreate}
        />
      </div>
      <div className='flex justify-end items-end flex-grow'>
        <Button
          type='submit'
          className='w-full'
          onClick={handleCreate}
          disabled={!title}
          data-testid='base-create-submit'>
          {isEditMode ? 'Save Changes' : 'Create'}
        </Button>
      </div>
    </div>
  );
};
