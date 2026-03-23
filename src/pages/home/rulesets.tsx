import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Card,
  Checkbox,
  Input,
  Label,
  Textarea,
} from '@/components';
import { ImportRulesetOverwriteModals, Loading, PageWrapper } from '@/components/composites';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { officialRulesets } from '@/content/official-rulesets';
import { isCloudConfigured } from '@/lib/cloud/client';
import { useSyncStateStore } from '@/lib/cloud/sync/sync-state';
import {
  useCloudRulesets,
  useImportRuleset,
  useRulesets,
  type ImportRulesetResult,
} from '@/lib/compass-api';
import { useCloudAuthStore } from '@/stores/cloud-auth-store';
import {
  AlertCircle,
  CheckCircle,
  Cloud,
  Download,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const DELETE_SPINNER_DELAY_MS = 1000;

export const Rulesets = () => {
  const { rulesets, createRuleset, deleteRuleset } = useRulesets();
  const { importRuleset, isImporting, importStep } = useImportRuleset();
  const {
    cloudRulesets,
    installFromCloud,
    deleteFromCloud,
    isInstalling: isInstallingCloud,
    installingRulesetId,
    isDeletingCloud,
    deletingCloudRulesetId,
  } = useCloudRulesets();
  const isAuthenticated = useCloudAuthStore((s) => s.isAuthenticated);
  const cloudSyncEnabled = useCloudAuthStore((s) => s.cloudSyncEnabled);
  const cloudSyncEligibilityLoading = useCloudAuthStore((s) => s.isCloudSyncEligibilityLoading);
  const isCloudSynced = useSyncStateStore((s) => s.isCloudSynced);
  console.log(isCloudSynced);
  const showCloudBadge =
    isCloudConfigured && isAuthenticated && cloudSyncEnabled && !cloudSyncEligibilityLoading;

  const localIds = new Set(rulesets.map((r) => r.id));
  const cloudOnlyRulesets = cloudRulesets.filter((r) => !localIds.has(r.id));
  const sortedRulesets = [...rulesets].sort((a, b) => a.title.localeCompare(b.title));
  const sortedCloudOnly = [...cloudOnlyRulesets].sort((a, b) => a.title.localeCompare(b.title));
  const hasNoRulesetsToShow =
    sortedRulesets.length === 0 && (!showCloudBadge || sortedCloudOnly.length === 0);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [importResult, setImportResult] = useState<ImportRulesetResult | null>(null);
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false);
  const [pendingReplaceFile, setPendingReplaceFile] = useState<File | null>(null);
  const [pendingReplaceResult, setPendingReplaceResult] = useState<ImportRulesetResult | null>(
    null,
  );
  const [duplicateConfirmOpen, setDuplicateConfirmOpen] = useState(false);
  const [pendingDuplicateFile, setPendingDuplicateFile] = useState<File | null>(null);
  const [pendingDuplicateResult, setPendingDuplicateResult] = useState<ImportRulesetResult | null>(
    null,
  );
  const [duplicateTitle, setDuplicateTitle] = useState('');
  const [duplicateVersion, setDuplicateVersion] = useState('');
  const [deletingRulesetId, setDeletingRulesetId] = useState<string | null>(null);
  const [showDeletingSpinner, setShowDeletingSpinner] = useState(false);
  const [cloudDeleteError, setCloudDeleteError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const deleteSpinnerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (deletingRulesetId) {
      deleteSpinnerTimeoutRef.current = setTimeout(() => {
        setShowDeletingSpinner(true);
        deleteSpinnerTimeoutRef.current = null;
      }, DELETE_SPINNER_DELAY_MS);
    } else {
      if (deleteSpinnerTimeoutRef.current) {
        clearTimeout(deleteSpinnerTimeoutRef.current);
        deleteSpinnerTimeoutRef.current = null;
      }
      setShowDeletingSpinner(false);
    }
    return () => {
      if (deleteSpinnerTimeoutRef.current) {
        clearTimeout(deleteSpinnerTimeoutRef.current);
      }
    };
  }, [deletingRulesetId]);

  const handleDelete = async (id: string) => {
    setDeletingRulesetId(id);
    try {
      await deleteRuleset(id);
    } finally {
      setDeletingRulesetId(null);
    }
  };

  const handleCloudDelete = async (id: string) => {
    setCloudDeleteError(null);
    const result = await deleteFromCloud(id);
    if (result.error) setCloudDeleteError(result.error);
  };

  const handleCreate = async () => {
    const id = await createRuleset({
      title: title || 'New Ruleset',
      description,
    });

    navigate(`/rulesets/${id}`);
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const navigateToLandingWithReload = (rulesetId: string) => {
    window.location.replace(`/#/landing/${rulesetId}`);
    window.location.reload();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportResult(null);
    setPendingReplaceFile(null);
    setPendingReplaceResult(null);
    setReplaceConfirmOpen(false);
    setPendingDuplicateFile(null);
    setPendingDuplicateResult(null);
    setDuplicateConfirmOpen(false);

    try {
      const result = await importRuleset(file);
      if (result.needsReplaceConfirmation) {
        setPendingReplaceFile(file);
        setPendingReplaceResult(result);
        setReplaceConfirmOpen(true);
      } else if (result.needsDuplicateConfirmation) {
        setPendingDuplicateFile(file);
        setPendingDuplicateResult(result);
        setDuplicateTitle(result.importedRuleset?.title || '');
        setDuplicateVersion(result.importedRuleset?.version || '');
        setDuplicateConfirmOpen(true);
      } else {
        if (result.success && result.importedRuleset?.id) {
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          navigateToLandingWithReload(result.importedRuleset.id);
          return;
        }
        setImportResult(result);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Import failed:', error);
    }
  };

  const handleConfirmReplace = async () => {
    if (!pendingReplaceFile) return;
    setReplaceConfirmOpen(false);
    try {
      const result = await importRuleset(pendingReplaceFile, { replaceIfNewer: true });
      if (result.success && result.importedRuleset?.id) {
        navigateToLandingWithReload(result.importedRuleset.id);
        return;
      }
      setImportResult(result);
    } finally {
      setPendingReplaceFile(null);
      setPendingReplaceResult(null);
    }
  };

  const handleCancelReplace = () => {
    setReplaceConfirmOpen(false);
    setPendingReplaceFile(null);
    setPendingReplaceResult(null);
    if (pendingReplaceResult) {
      setImportResult(pendingReplaceResult);
    }
  };

  const handleConfirmDuplicate = async () => {
    if (!pendingDuplicateFile) return;
    setDuplicateConfirmOpen(false);
    try {
      const result = await importRuleset(pendingDuplicateFile, {
        duplicateAsNew: true,
        duplicateTitle: duplicateTitle || pendingDuplicateResult?.importedRuleset?.title,
        duplicateVersion: duplicateVersion || pendingDuplicateResult?.importedRuleset?.version,
      });
      if (result.success && result.importedRuleset?.id) {
        navigateToLandingWithReload(result.importedRuleset.id);
        return;
      }
      setImportResult(result);
    } finally {
      setPendingDuplicateFile(null);
      setPendingDuplicateResult(null);
      setDuplicateTitle('');
      setDuplicateVersion('');
    }
  };

  const handleCancelDuplicate = () => {
    setDuplicateConfirmOpen(false);
    setPendingDuplicateFile(null);
    setPendingDuplicateResult(null);
    setDuplicateTitle('');
    setDuplicateVersion('');
    if (pendingDuplicateResult) {
      setImportResult(pendingDuplicateResult);
    }
  };

  return (
    <PageWrapper
      title='Rulesets'
      headerActions={
        <div className='flex items-center gap-2'>
          <Dialog>
            <form>
              <DialogTrigger asChild>
                <Button
                  size='sm'
                  className='gap-1'
                  data-testid='create-ruleset-button'
                  disabled={!!deletingRulesetId || !!deletingCloudRulesetId}>
                  <Plus className='h-4 w-4' />
                  Create Ruleset
                </Button>
              </DialogTrigger>
              <DialogContent className='sm:max-w-[425px]'>
                <DialogHeader>
                  <DialogTitle>New Ruleset</DialogTitle>
                  <DialogDescription>New Ruleset</DialogDescription>
                </DialogHeader>
                <div className='grid gap-4'>
                  <div className='grid gap-3'>
                    <Label htmlFor='ruleset-title'>Title</Label>
                    <Input
                      id='ruleset-title'
                      name='title'
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div className='grid gap-3'>
                    <Label htmlFor='ruleset-description'>Description</Label>
                    <Textarea
                      id='ruleset-description'
                      name='username'
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant='outline'>Cancel</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button data-testid='create-ruleset-submit' onClick={handleCreate}>
                      Create
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </form>
          </Dialog>

          <Input
            ref={fileInputRef}
            type='file'
            accept='.zip'
            onChange={handleFileSelect}
            className='hidden'
          />
          <Button
            variant='outline'
            size='sm'
            className='gap-1'
            disabled={isImporting || !!deletingRulesetId || !!deletingCloudRulesetId}
            onClick={handleImport}
            data-testid='import-ruleset-button'>
            {isImporting ? (
              <>
                <Upload className='h-4 w-4 animate-pulse' />
                Upload
              </>
            ) : (
              <>
                <Upload className='h-4 w-4' />
                Upload
              </>
            )}
          </Button>

          <ImportRulesetOverwriteModals
            replaceOpen={replaceConfirmOpen}
            onReplaceOpenChange={setReplaceConfirmOpen}
            pendingReplaceResult={pendingReplaceResult}
            onConfirmReplace={handleConfirmReplace}
            onCancelReplace={handleCancelReplace}
            duplicateOpen={duplicateConfirmOpen}
            onDuplicateOpenChange={setDuplicateConfirmOpen}
            pendingDuplicateResult={pendingDuplicateResult}
            duplicateTitle={duplicateTitle}
            duplicateVersion={duplicateVersion}
            onDuplicateTitleChange={setDuplicateTitle}
            onDuplicateVersionChange={setDuplicateVersion}
            onConfirmDuplicate={handleConfirmDuplicate}
            onCancelDuplicate={handleCancelDuplicate}
            isImporting={isImporting}
          />
        </div>
      }>
      <div className='flex flex-wrap gap-4'>
        {hasNoRulesetsToShow ? (
          <div className='flex w-full flex-col gap-4'>
            <p className='text-sm text-muted-foreground'>
              Try one of Quest Bound's official rulesets
            </p>
            <div className='flex flex-wrap gap-4'>
              {officialRulesets.map((o) => (
                <Card
                  key={o.id}
                  className='flex aspect-square w-[min(100%,280px)] flex-col overflow-hidden p-0'
                  data-testid='official-ruleset-card'>
                  <div className='relative min-h-0 flex-1 bg-muted'>
                    {o.image ? (
                      <img
                        src={o.image}
                        alt=''
                        className='h-full w-full object-cover'
                        loading='lazy'
                      />
                    ) : null}
                  </div>
                  <div className='flex shrink-0 flex-col gap-2 border-t p-3'>
                    <h2 className='truncate text-sm font-semibold'>{o.title}</h2>
                    {o.description ? (
                      <p className='line-clamp-3 text-xs text-muted-foreground'>{o.description}</p>
                    ) : null}
                    <Button asChild variant='outline' size='sm' className='h-8 w-full'>
                      <Link to={`/play/${encodeURIComponent(o.slug)}`}>Install</Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : null}
        {!hasNoRulesetsToShow &&
          sortedRulesets?.map((r) => {
            const doNotAsk = localStorage.getItem('qb.confirmOnDelete') === 'false';
            return (
              <Card
                key={r.id}
                className='flex aspect-square w-[min(100%,280px)] flex-col overflow-hidden p-0'
                data-testid='ruleset-card'>
                <div
                  className='min-h-0 flex-1 bg-muted bg-cover bg-center'
                  style={r.image ? { backgroundImage: `url(${r.image})` } : undefined}
                />
                <div className='flex shrink-0 flex-col gap-2 border-t p-3'>
                  <div className='flex min-w-0 items-baseline justify-between gap-2'>
                    <h2 className='flex min-w-0 items-center gap-1.5 truncate text-sm font-semibold'>
                      <span className='truncate'>{r.title}</span>
                      {showCloudBadge && isCloudSynced(r.id) && (
                        <Cloud
                          className='h-3.5 w-3.5 shrink-0 text-muted-foreground'
                          aria-label='Synced with Quest Bound Cloud'
                          data-testid='ruleset-cloud-badge'
                        />
                      )}
                    </h2>
                    <span className='shrink-0 text-xs text-muted-foreground'>v{r.version}</span>
                  </div>
                  <div className='flex items-center gap-2'>
                    {doNotAsk ? (
                      <Button
                        variant='ghost'
                        size='sm'
                        className='h-8 flex-1 text-red-500'
                        data-testid='preview-card-delete'
                        disabled={!!deletingRulesetId || !!deletingCloudRulesetId}
                        onClick={() => handleDelete(r.id)}>
                        {deletingRulesetId === r.id && showDeletingSpinner ? (
                          <>
                            <Loader2 className='h-3.5 w-3.5 animate-spin' />
                            Deleting…
                          </>
                        ) : (
                          'Delete'
                        )}
                      </Button>
                    ) : (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant='ghost'
                            size='sm'
                            className='h-8 flex-1 text-red-500'
                            data-testid='preview-card-delete'
                            disabled={!!deletingRulesetId || !!deletingCloudRulesetId}>
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Permanently delete this content?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Permanently delete this content?
                            </AlertDialogDescription>
                            <div className='flex gap-2'>
                              <Label htmlFor='preview-card-do-not-ask-again'>
                                Do not ask again
                              </Label>
                              <Checkbox
                                id='preview-card-do-not-ask-again'
                                onCheckedChange={(checked) =>
                                  localStorage.setItem('qb.confirmOnDelete', String(!checked))
                                }
                              />
                            </div>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel
                              disabled={!!deletingRulesetId || !!deletingCloudRulesetId}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              data-testid='preview-card-delete-confirm'
                              disabled={deletingRulesetId === r.id}
                              onClick={() => handleDelete(r.id)}>
                              {deletingRulesetId === r.id && showDeletingSpinner ? (
                                <>
                                  <Loader2 className='h-3.5 w-3.5 animate-spin' />
                                  Deleting…
                                </>
                              ) : (
                                'Delete'
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    <Button
                      variant='outline'
                      size='sm'
                      className='h-8 flex-1'
                      disabled={!!deletingRulesetId || !!deletingCloudRulesetId}
                      onClick={() => navigate(`/landing/${r.id}`)}
                      data-testid='preview-card-open'>
                      Open
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        {!hasNoRulesetsToShow &&
          showCloudBadge &&
          sortedCloudOnly.map((r) => (
            <Card
              key={r.id}
              className='flex aspect-square w-[min(100%,280px)] flex-col overflow-hidden p-0'
              data-testid='ruleset-card-cloud'>
              <div
                className='min-h-0 flex-1 bg-muted bg-cover bg-center'
                style={r.image ? { backgroundImage: `url(${r.image})` } : undefined}
              />
              <div className='flex shrink-0 flex-col gap-2 border-t p-3'>
                <div className='flex min-w-0 items-baseline justify-between gap-2'>
                  <h2 className='flex min-w-0 items-center gap-1.5 truncate text-sm font-semibold'>
                    <span className='truncate'>{r.title}</span>
                    <Cloud
                      className='h-3.5 w-3.5 shrink-0 text-muted-foreground'
                      aria-label='In Quest Bound Cloud'
                      data-testid='ruleset-cloud-badge'
                    />
                  </h2>
                  <span className='shrink-0 text-xs text-muted-foreground'>v{r.version}</span>
                </div>
                <div className='flex items-center gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-8 flex-1 gap-1'
                    disabled={isInstallingCloud || !!deletingCloudRulesetId}
                    onClick={() => installFromCloud(r.id)}
                    data-testid='ruleset-card-install'>
                    {installingRulesetId === r.id ? (
                      <>
                        <Download className='h-3.5 w-3.5 animate-pulse' />
                        Installing…
                      </>
                    ) : (
                      <>
                        <Download className='h-3.5 w-3.5' />
                        Install
                      </>
                    )}
                  </Button>
                  {r.ownedByCurrentUser ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant='outline'
                          size='sm'
                          className='h-8 flex-1 gap-1 text-destructive hover:text-destructive'
                          disabled={isInstallingCloud || !!deletingCloudRulesetId}
                          data-testid='ruleset-card-cloud-delete'>
                          <Trash2 className='h-3.5 w-3.5' />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete from Quest Bound Cloud?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This permanently removes this ruleset and all cloud data tied to it for
                            your account (campaigns, characters, assets, and other synced content).
                            This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel
                            disabled={deletingCloudRulesetId === r.id}
                            data-testid='ruleset-card-cloud-delete-cancel'>
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                            data-testid='ruleset-card-cloud-delete-confirm'
                            disabled={deletingCloudRulesetId === r.id}
                            onClick={() => void handleCloudDelete(r.id)}>
                            Delete from cloud
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
      </div>

      {(isImporting || isInstallingCloud || showDeletingSpinner || isDeletingCloud) && (
        <div className='fixed inset-0 z-50 bg-background'>
          <Loading />
          {isImporting && importStep && (
            <p className='absolute inset-x-0 bottom-1/3 text-center text-sm text-muted-foreground'>
              {importStep}...
            </p>
          )}
          {isInstallingCloud && !isImporting && !showDeletingSpinner && !isDeletingCloud && (
            <p className='absolute inset-x-0 bottom-1/3 text-center text-sm text-muted-foreground'>
              Installing from cloud...
            </p>
          )}
          {showDeletingSpinner && !isImporting && !isInstallingCloud && !isDeletingCloud && (
            <p className='absolute inset-x-0 bottom-1/3 text-center text-sm text-muted-foreground'>
              Deleting ruleset...
            </p>
          )}
          {isDeletingCloud && !isImporting && !isInstallingCloud && !showDeletingSpinner && (
            <p className='absolute inset-x-0 bottom-1/3 text-center text-sm text-muted-foreground'>
              Deleting from cloud...
            </p>
          )}
        </div>
      )}

      {importResult && (
        <div
          className={`fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2 rounded-lg border p-3 shadow-lg ${
            importResult.success
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}>
          <div className='flex items-start justify-between gap-2'>
            <div className='flex items-center gap-2'>
              {importResult.success ? (
                <CheckCircle className='h-4 w-4 shrink-0' />
              ) : (
                <AlertCircle className='h-4 w-4 shrink-0' />
              )}
              <span className='text-sm font-medium'>{importResult.message}</span>
            </div>
            <Button
              variant='ghost'
              size='icon'
              className='h-6 w-6 shrink-0'
              onClick={() => setImportResult(null)}
              aria-label='Dismiss'>
              <X className='h-4 w-4' />
            </Button>
          </div>

          {importResult.success && importResult.importedRuleset && (
            <div className='text-xs'>
              <p>
                Imported: <strong>{importResult.importedRuleset.title}</strong>
              </p>
              <div className='flex gap-4'>
                <span>Attributes: {importResult.importedCounts.attributes}</span>
                <span>Actions: {importResult.importedCounts.actions}</span>
                <span>Items: {importResult.importedCounts.items}</span>
                <span>Charts: {importResult.importedCounts.charts}</span>
              </div>
            </div>
          )}

          {importResult.errors.length > 0 && (
            <div>
              <p className='text-xs font-medium'>Errors:</p>
              <ul className='list-disc list-inside text-xs'>
                {importResult.errors.slice(0, 3).map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
                {importResult.errors.length > 3 && (
                  <li>...and {importResult.errors.length - 3} more errors</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {cloudDeleteError && (
        <div className='fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 shadow-lg'>
          <div className='flex items-start justify-between gap-2'>
            <div className='flex items-center gap-2'>
              <AlertCircle className='h-4 w-4 shrink-0' />
              <span className='text-sm font-medium'>{cloudDeleteError}</span>
            </div>
            <Button
              variant='ghost'
              size='icon'
              className='h-6 w-6 shrink-0'
              onClick={() => setCloudDeleteError(null)}
              aria-label='Dismiss'>
              <X className='h-4 w-4' />
            </Button>
          </div>
        </div>
      )}
    </PageWrapper>
  );
};
