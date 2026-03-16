import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components';
import { PageWrapper } from '@/components/composites';
import {
  useActiveRuleset,
  useAssets,
  useCharts,
  useDocuments,
  useExportChart,
} from '@/lib/compass-api';
import { ArrowDownToLine, Loader2, Pencil, Plus, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { ActionChart } from './actions';
import { ArchetypeCreateDialog } from './archetypes/archetype-create-dialog';
import { Archetypes } from './archetypes/archetypes';
import { AttributeChart } from './attributes/attribute-chart';
import { ChartSelect } from './charts';
import { ChartImport, Export, Import } from './components';
import { BaseCreate } from './create';
import { Documents } from './documents';
import { ItemChart } from './items/item-chart';
import { ManageItemCustomPropertiesModal } from './items/manage-item-custom-properties-modal';
import { PageSelect } from './pages';
import { WindowSelect } from './windows';

const pageToLabel = new Map([
  ['attributes', 'Attributes'],
  ['actions', 'Actions'],
  ['items', 'Items'],
  ['charts', 'Charts'],
  ['documents', 'Documents'],
  ['windows', 'Windows'],
  ['pages', 'Pages'],
  ['archetypes', 'Archetypes'],
]);

export const Ruleset = ({
  page,
}: {
  page?:
    | 'attributes'
    | 'items'
    | 'actions'
    | 'charts'
    | 'documents'
    | 'windows'
    | 'pages'
    | 'archetypes';
}) => {
  const { rulesetId } = useParams();
  const { activeRuleset, isRulesetsLoading } = useActiveRuleset();
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [documentUploadModalOpen, setDocumentUploadModalOpen] = useState(false);
  const [uploadingDocuments, setUploadingDocuments] = useState(false);
  const documentFileInputRef = useRef<HTMLInputElement>(null);
  const { exportChartAsTSV } = useExportChart();
  const { charts } = useCharts();
  const { createDocument } = useDocuments();
  const { createAsset } = useAssets(activeRuleset?.id);

  const chartId = searchParams.get('chart');
  const activeChart = chartId ? charts?.find((c) => c.id === chartId) : undefined;
  const pageLabel =
    page === 'charts' && activeChart ? activeChart.title : (pageToLabel.get(page ?? '') ?? '');

  if (!page) {
    const target =
      activeRuleset?.id != null ? `/rulesets/${activeRuleset.id}/attributes` : '/rulesets';
    return <Navigate to={target} replace={true} />;
  }

  if (!activeRuleset) {
    if (rulesetId && rulesetId !== 'undefined' && isRulesetsLoading) {
      return (
        <PageWrapper title="">
          <div className="flex flex-1 items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </PageWrapper>
      );
    }
    return <Navigate to="/rulesets" replace />;
  }

  const handleDocumentUploadClick = () => {
    setDocumentUploadModalOpen(true);
  };

  const handleDocumentSelectFilesClick = () => {
    documentFileInputRef.current?.click();
  };

  const handleDocumentFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const fileList = Array.from(files);
    e.target.value = '';
    setUploadingDocuments(true);
    try {
      for (const file of fileList) {
        if (file.type !== 'application/pdf') continue;
        const pdfAssetId = await createAsset(file);
        const title = file.name.replace(/\.pdf$/i, '');
        await createDocument({ title, pdfAssetId });
      }
      setDocumentUploadModalOpen(false);
    } finally {
      setUploadingDocuments(false);
    }
  };

  const renderChart = () => {
    switch (page) {
      case 'attributes':
        return <AttributeChart />;
      case 'items':
        return <ItemChart />;
      case 'actions':
        return <ActionChart />;
      case 'charts':
        return (
          <ChartSelect
            onEditDetails={(id) => {
              searchParams.set('edit', id);
              setSearchParams(searchParams);
              setOpen(true);
            }}
          />
        );
      case 'documents':
        return (
          <Documents
            onEditDetails={(id) => {
              searchParams.set('edit', id);
              setSearchParams(searchParams);
              setOpen(true);
            }}
          />
        );
      case 'windows':
        return (
          <WindowSelect
            onEditDetails={(id) => {
              searchParams.set('edit', id);
              setSearchParams(searchParams);
              setOpen(true);
            }}
          />
        );
      case 'pages':
        return (
          <PageSelect
            onEditDetails={(id) => {
              searchParams.set('edit', id);
              setSearchParams(searchParams);
              setOpen(true);
            }}
          />
        );
      case 'archetypes':
        return <Archetypes />;
      default:
        return <p>Not Found</p>;
    }
  };

  return (
    <PageWrapper
      title={pageLabel}
      headerActions={
        <div className='flex items-center gap-2'>
          {page === 'archetypes' && <ArchetypeCreateDialog />}
          {page !== 'archetypes' && (
            <Button
              size='sm'
              id='create-button'
              onClick={() => setOpen(true)}
              data-testid='ruleset-new-button'>
              <Plus className='h-4 w-4' />
              {`Create ${(pageToLabel.get(page) ?? '').slice(0, -1)}`}
            </Button>
          )}
          {page === 'documents' && (
            <Button
              size='sm'
              variant='outline'
              onClick={handleDocumentUploadClick}
              disabled={uploadingDocuments}
              data-testid='documents-upload-button'>
              {uploadingDocuments ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <Upload className='h-4 w-4' />
              )}
              {uploadingDocuments ? 'Uploading…' : 'Upload'}
            </Button>
          )}
          {page === 'documents' && (
            <input
              ref={documentFileInputRef}
              type='file'
              accept='application/pdf'
              multiple
              className='hidden'
              onChange={handleDocumentFileChange}
            />
          )}
          {page === 'charts' && chartId && (
            <div className='flex gap-2'>
              <Button
                size='sm'
                variant='outline'
                onClick={() => {
                  searchParams.set('edit', chartId);
                  setSearchParams(searchParams);
                  setOpen(true);
                }}>
                <Pencil />
              </Button>
              <Button onClick={() => exportChartAsTSV(chartId)} variant='outline' size='sm'>
                <ArrowDownToLine className='h-4 w-4' />
              </Button>
              <ChartImport chartId={chartId} onLoadingChange={setIsImporting} />
            </div>
          )}
          {page === 'items' && <ManageItemCustomPropertiesModal />}
          {page !== 'charts' &&
            page !== 'windows' &&
            page !== 'documents' &&
            page !== 'pages' &&
            page !== 'archetypes' && <Export type={page} />}
          {page !== 'charts' &&
            page !== 'windows' &&
            page !== 'documents' &&
            page !== 'pages' &&
            page !== 'archetypes' && <Import type={page} onLoadingChange={setIsImporting} />}
        </div>
      }>
      <Dialog
        open={open}
        onOpenChange={(open) => {
          if (!open) {
            searchParams.set('edit', '');
            setSearchParams(searchParams);
          }
          setOpen(open);
        }}>
        {page === 'archetypes' ? (
          renderChart()
        ) : isImporting ? (
          <div className='flex items-center justify-center py-12'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
            <span className='ml-3 text-muted-foreground'>Importing...</span>
          </div>
        ) : (
          renderChart()
        )}

        {page !== 'archetypes' && (
          <DialogContent className='min-w-[600px] max-w-[80vw] min-h-[50vh]'>
            <DialogTitle className='hidden'>Quick Create</DialogTitle>
            <DialogDescription className='hidden'>Quick Create</DialogDescription>
            <BaseCreate
              onCreate={(isEditMode) => {
                if (isEditMode) {
                  setOpen(false);
                  searchParams.set('edit', '');
                  setSearchParams(searchParams);
                }
              }}
            />
          </DialogContent>
        )}
      </Dialog>

      {page === 'documents' && (
        <Dialog open={documentUploadModalOpen} onOpenChange={setDocumentUploadModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload documents</DialogTitle>
              <DialogDescription>
                Select one or more PDF files. Each file will be added as a document with its
                filename as the title.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                onClick={handleDocumentSelectFilesClick}
                disabled={uploadingDocuments}
                data-testid='documents-upload-select-files'>
                {uploadingDocuments ? (
                  <>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    Uploading…
                  </>
                ) : (
                  'Select Files'
                )}
              </Button>
              <Button
                variant='secondary'
                onClick={() => setDocumentUploadModalOpen(false)}
                disabled={uploadingDocuments}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </PageWrapper>
  );
};
