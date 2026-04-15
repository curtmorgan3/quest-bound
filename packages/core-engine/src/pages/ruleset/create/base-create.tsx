import { Button, DescriptionEditor, Input, Label } from '@/components';
import { CategoryField } from '@/components/composites/category-field';
import {
  useActions,
  useAttributes,
  useCharts,
  useDocuments,
  useItems,
  useRulesetPages,
  useWindows,
} from '@/lib/compass-api';
import { cn } from '@/lib/utils';
import {
  AppWindow,
  ArrowLeft,
  FileSpreadsheet,
  HandFist,
  LayoutTemplate,
  Newspaper,
  SlidersHorizontal,
  Sword,
  UserRoundPen,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import { ActionCreate } from './action-create';
import { AttributeCreate } from './attribute-create';
import { ChartCreate } from './chart-create';
import { EntityCustomPropertiesEditor } from './entity-custom-properties-editor';
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
import { PageCreate } from './page-create';
import { WindowCreate } from './window-create';

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
  /** When set, only document creation is shown (for world documents). */
  worldId?: string;
  /** When set, only document creation is shown (for campaign documents). */
  campaignId?: string;
}

export const BaseCreate = ({ onCreate, worldId, campaignId }: BaseCreateProps) => {
  const { pathname } = useLocation();
  const { rulesetId } = useParams<{ rulesetId: string }>();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const isEditMode = !!editId;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  const { attributes } = useAttributes();
  const { actions } = useActions();
  const { items } = useItems();
  const { charts } = useCharts();
  const documentsOptions =
    worldId != null ? { worldId } : campaignId != null ? { campaignId } : undefined;
  const { documents } = useDocuments(documentsOptions);
  const { windows } = useWindows();
  const { pages } = useRulesetPages();

  const baseProperties = { title, description, category };

  const {
    saveAttribute,
    entityCustomProperties: attributeEntityCustomProperties,
    setEntityCustomProperties: setAttributeEntityCustomProperties,
    ...attributeProps
  } = useAttributeValues({
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

  const { saveWindow, hideFromPlayerView, setHideFromPlayerView } = useWindowValues({
    id: editId || undefined,
    baseProperties,
    onCreate: () => {
      document.getElementById('create-title')?.focus();
    },
    setTitle,
    setCategory,
    setDescription,
  });

  const {
    savePage,
    hideFromPlayerView: hidePageFromPlayerView,
    setHideFromPlayerView: setHidePageFromPlayerView,
  } = usePageValues({
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
    worldId,
    campaignId,
  });

  const initialType = (worldId || campaignId ? 'documents' : pathname.split('/').pop()) as
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

  const [customPropertiesFormOpen, setCustomPropertiesFormOpen] = useState(false);

  const hideBaseFieldsForCustomProperties =
    customPropertiesFormOpen && activeType === 'attributes';

  const existingCategories = useMemo(() => {
    const list =
      activeType === 'attributes'
        ? (attributes ?? [])
        : activeType === 'actions'
          ? (actions ?? [])
          : activeType === 'items'
            ? (items ?? [])
            : activeType === 'charts'
              ? (charts ?? [])
              : activeType === 'documents'
                ? (documents ?? [])
                : activeType === 'windows'
                  ? (windows ?? [])
                  : activeType === 'pages'
                    ? (pages ?? [])
                    : [];
    const categories = list
      .map((e: { category?: string }) => e.category)
      .filter((c): c is string => Boolean(c?.trim()));
    return [...new Set(categories)].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' }),
    );
  }, [activeType, attributes, actions, items, charts, documents, windows, pages]);

  useEffect(() => {
    resetAll();
    setCustomPropertiesFormOpen(false);
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
    <div className='flex flex-col gap-4 max-h-[80vh] overflow-auto'>
      {!worldId && !campaignId && (
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
            onClick={() => setActiveType('pages')}
            data-testid='base-create-type-pages'>
            <iconset.pages />
          </Button>
        </div>
      )}

      <div className='grid gap-4'>
        {!hideBaseFieldsForCustomProperties && (
          <div className='w-full flex flex-row gap-4'>
            <div className='grid gap-2 w-[50%]'>
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
              <CategoryField
                value={category || null}
                onChange={(v) => setCategory(v ?? '')}
                existingCategories={existingCategories}
                label='Category'
              />
            </div>
          </div>
        )}
        {activeType === 'attributes' && !customPropertiesFormOpen && (
          <AttributeCreate {...attributeProps} rulesetId={rulesetId} />
        )}
        {activeType === 'attributes' && customPropertiesFormOpen && (
          <EntityCustomPropertiesEditor
            items={attributeEntityCustomProperties}
            onChange={setAttributeEntityCustomProperties}
          />
        )}
        {activeType === 'actions' && (
          <ActionCreate {...actionProps} rulesetId={rulesetId} />
        )}
        {activeType === 'items' && <ItemCreate {...itemProps} />}
        {activeType === 'charts' && <ChartCreate {...chartProps} rulesetId={rulesetId} />}
        {activeType === 'documents' && <DocumentCreate {...documentProps} rulesetId={rulesetId} />}
        {activeType === 'windows' && (
          <WindowCreate
            hideFromPlayerView={hideFromPlayerView}
            setHideFromPlayerView={setHideFromPlayerView}
          />
        )}
        {activeType === 'pages' && (
          <PageCreate
            hideFromPlayerView={hidePageFromPlayerView}
            setHideFromPlayerView={setHidePageFromPlayerView}
          />
        )}

        {!hideBaseFieldsForCustomProperties && (
          <DescriptionEditor
            id='create-description'
            value={description}
            onChange={(value) => setDescription(value)}
            onSave={handleCreate}
          />
        )}
      </div>
      <div className='flex justify-end items-end gap-2 flex-grow w-full'>
        {activeType === 'attributes' && (
          <Button
            type='button'
            variant='outline'
            size='icon'
            className='shrink-0'
            title={customPropertiesFormOpen ? 'Back to main fields' : 'Custom properties'}
            aria-label={
              customPropertiesFormOpen ? 'Back to main fields' : 'Edit custom properties'
            }
            aria-expanded={customPropertiesFormOpen}
            onClick={() => setCustomPropertiesFormOpen((open) => !open)}
            data-testid='base-create-custom-properties-toggle'>
            {customPropertiesFormOpen ? (
              <ArrowLeft className='size-4' />
            ) : (
              <SlidersHorizontal className='size-4' />
            )}
          </Button>
        )}
        <Button
          type='submit'
          className={cn('min-w-0 flex-1')}
          onClick={handleCreate}
          disabled={!title}
          data-testid='base-create-submit'>
          {isEditMode ? 'Save Changes' : 'Create'}
        </Button>
      </div>
    </div>
  );
};
