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
  Tabs,
  TabsList,
  TabsTrigger,
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
} from '@/components/ui/dialog';
import { isCloudConfigured } from '@/lib/cloud/client';
import { getNonOwnerCloudInstallRulesetIds } from '@/lib/cloud/sync/non-owner-cloud-install-ids';
import { pullEntireRulesetFromCloud } from '@/lib/cloud/sync/sync-service';
import { useSyncStateStore } from '@/lib/cloud/sync/sync-state';
import {
  useCloudRulesets,
  useImportRuleset,
  useRulesets,
  type ImportRulesetResult,
} from '@/lib/compass-api';
import { compareVersion } from '@/lib/compass-api/hooks/export/utils';
import { db, useCloudAuthStore, useCloudSyncSummaryPanelStore } from '@/stores';
import type { DB } from '@/stores/db/hooks/types';
import {
  AlertCircle,
  Building2,
  CheckCircle,
  Cloud,
  Download,
  Loader2,
  Plus,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyModulesState } from './empty-modules-state';

const DELETE_SPINNER_DELAY_MS = 1000;

type RulesetsListTab = 'rulesets' | 'modules';

export const Rulesets = () => {
  const { rulesets, createRuleset, deleteRuleset } = useRulesets();
  const { importRuleset, isImporting, importStep } = useImportRuleset();
  const {
    cloudRulesets,
    cloudRulesetListFetchOk,
    installFromCloud,
    deleteFromCloud,
    loading: cloudRulesetsLoading,
    isInstalling: isInstallingCloud,
    installingRulesetId,
    isDeletingCloud,
    deletingCloudRulesetId,
  } = useCloudRulesets();
  const isAuthenticated = useCloudAuthStore((s) => s.isAuthenticated);
  const cloudSyncEnabled = useCloudAuthStore((s) => s.cloudSyncEnabled);
  const cloudSyncEligibilityLoading = useCloudAuthStore((s) => s.isCloudSyncEligibilityLoading);
  const isCloudSynced = useSyncStateStore((s) => s.isCloudSynced);
  const isCloudSyncing = useSyncStateStore((s) => s.isSyncing);
  const showCloudBadge =
    isCloudConfigured && isAuthenticated && cloudSyncEnabled && !cloudSyncEligibilityLoading;

  const localIds = new Set(rulesets.map((r) => r.id));
  const cloudRulesetById = useMemo(
    () => new Map(cloudRulesets.map((c) => [c.id, c])),
    [cloudRulesets],
  );
  const cloudOnlyRulesets = cloudRulesets.filter((r) => !localIds.has(r.id));
  const sortedRulesets = [...rulesets].sort((a, b) => a.title.localeCompare(b.title));
  const sortedCloudOnly = [...cloudOnlyRulesets].sort((a, b) => a.title.localeCompare(b.title));

  const [listTab, setListTab] = useState<RulesetsListTab>('rulesets');

  const isModuleRuleset = (isModule: boolean | undefined) => isModule === true;
  const visibleLocalRulesets = sortedRulesets.filter((r) =>
    listTab === 'modules' ? isModuleRuleset(r.isModule) : !isModuleRuleset(r.isModule),
  );
  const visibleCloudOnly = sortedCloudOnly.filter((r) =>
    listTab === 'modules' ? isModuleRuleset(r.isModule) : !isModuleRuleset(r.isModule),
  );
  const hasNoRulesetsToShow =
    visibleLocalRulesets.length === 0 && (!showCloudBadge || visibleCloudOnly.length === 0);

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
  const [cloudUpdateError, setCloudUpdateError] = useState<string | null>(null);
  const [createRulesetDialogOpen, setCreateRulesetDialogOpen] = useState(false);
  const [createFlowBusy, setCreateFlowBusy] = useState(false);
  const [createFlowStatus, setCreateFlowStatus] = useState<string | null>(null);
  const [createFlowError, setCreateFlowError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const deleteSpinnerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (createRulesetDialogOpen) setCreateFlowError(null);
  }, [createRulesetDialogOpen]);

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

  useEffect(() => {
    if (!showCloudBadge || cloudRulesetListFetchOk !== true || cloudRulesetsLoading) return;
    let cancelled = false;
    void (async () => {
      const nonOwnerIds = await getNonOwnerCloudInstallRulesetIds();
      if (cancelled) return;
      const cloudIdSet = new Set(cloudRulesets.map((c) => c.id));
      const staleLocal = rulesets.filter((r) => nonOwnerIds.has(r.id) && !cloudIdSet.has(r.id));
      for (const r of staleLocal) {
        if (cancelled) return;
        await deleteRuleset(r.id);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    showCloudBadge,
    cloudRulesetListFetchOk,
    cloudRulesetsLoading,
    cloudRulesets,
    rulesets,
    deleteRuleset,
  ]);

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

  const handlePullUpdateFromCloud = async (rulesetId: string) => {
    setCloudUpdateError(null);
    const result = await pullEntireRulesetFromCloud(rulesetId, db as DB);
    if (result.error) {
      setCloudUpdateError(result.error);
      return;
    }
    useCloudSyncSummaryPanelStore.getState().showSummary(result);
  };

  const handleCreate = async () => {
    setCreateFlowError(null);
    setCreateRulesetDialogOpen(false);
    setCreateFlowBusy(true);
    setCreateFlowStatus(null);
    let newRulesetId: string | undefined;
    try {
      setCreateFlowStatus('Creating ruleset');
      newRulesetId = await createRuleset({
        title: title || 'New Ruleset',
        description,
      });

      navigate(`/rulesets/${newRulesetId}`);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setCreateFlowError(
        newRulesetId
          ? `${message} Your ruleset was saved; you can open it from the list.`
          : message,
      );
    } finally {
      setCreateFlowBusy(false);
      setCreateFlowStatus(null);
    }
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
    <Dialog open={createRulesetDialogOpen} onOpenChange={setCreateRulesetDialogOpen}>
      <Tabs
        value={listTab}
        onValueChange={(v) => setListTab(v as RulesetsListTab)}
        className='flex h-full min-h-0 flex-1 flex-col gap-0'>
        <PageWrapper
          title='Rulesets'
          filterRow={
            <div className='flex justify-start px-4 py-2'>
              <TabsList aria-label='Ruleset library sections' className='w-fit'>
                <TabsTrigger value='rulesets' data-testid='rulesets-tab-rulesets'>
                  Rulesets
                </TabsTrigger>
                <TabsTrigger value='modules' data-testid='rulesets-tab-modules'>
                  Modules
                </TabsTrigger>
              </TabsList>
            </div>
          }
          headerActions={
            <div className='flex items-center gap-2'>
              <Button
                size='sm'
                className='gap-1'
                data-testid='create-ruleset-button'
                disabled={createFlowBusy || !!deletingRulesetId || !!deletingCloudRulesetId}
                onClick={() => setCreateRulesetDialogOpen(true)}>
                <Plus className='h-4 w-4' />
                Create Ruleset
              </Button>

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
          <div className='flex min-h-0 min-w-0 flex-1 flex-wrap content-start items-start gap-4'>
            {hasNoRulesetsToShow && listTab === 'modules' ? (
              <EmptyModulesState
                importRuleset={importRuleset}
                isImporting={isImporting}
                installDisabled={createFlowBusy || !!deletingRulesetId || !!deletingCloudRulesetId}
                onInstalled={(rulesetId) => {
                  window.location.replace(`/#/landing/${rulesetId}`);
                  window.location.reload();
                }}
              />
            ) : null}
            {hasNoRulesetsToShow && listTab !== 'modules' ? (
              <div className='flex min-h-[min(60vh,28rem)] w-full flex-1 flex-col items-center justify-center gap-4 px-4 py-12'>
                <p className='max-w-md text-center text-lg font-medium text-muted-foreground sm:text-xl'>
                  Create a Ruleset to Get Started
                </p>
                <Button
                  size='lg'
                  data-testid='empty-state-create-ruleset'
                  disabled={createFlowBusy || !!deletingRulesetId || !!deletingCloudRulesetId}
                  onClick={() => setCreateRulesetDialogOpen(true)}>
                  Start Building
                </Button>
              </div>
            ) : null}
            {!hasNoRulesetsToShow &&
              visibleLocalRulesets.map((r) => {
                const doNotAsk = localStorage.getItem('qb.confirmOnDelete') === 'false';
                const cloudSummary = cloudRulesetById.get(r.id);
                const cloudHasNewerVersion =
                  !!cloudSummary &&
                  isCloudSynced(r.id) &&
                  compareVersion(cloudSummary.version, r.version ?? '') > 0;
                const cloudUpdateBusy =
                  isCloudSyncing ||
                  isInstallingCloud ||
                  !!deletingRulesetId ||
                  !!deletingCloudRulesetId;
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
                        <h2 className='flex min-w-0 items-center gap-1.5 text-sm font-semibold'>
                          <span className='min-w-0 truncate'>{r.title}</span>
                          {showCloudBadge && isCloudSynced(r.id) ? (
                            <span className='flex shrink-0 items-center gap-1'>
                              {cloudSummary?.linkedToAdministeredOrganization ? (
                                <Building2
                                  className='h-3.5 w-3.5 text-muted-foreground'
                                  aria-label='Linked to organization you administer'
                                  data-testid='ruleset-org-badge'
                                />
                              ) : null}
                              <Cloud
                                className='h-3.5 w-3.5 text-muted-foreground'
                                aria-label='Synced with Quest Bound Cloud'
                                data-testid='ruleset-cloud-badge'
                              />
                              {cloudHasNewerVersion ? (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      type='button'
                                      variant='link'
                                      className='h-auto p-0 text-xs font-medium'
                                      disabled={cloudUpdateBusy}
                                      data-testid='ruleset-cloud-update'>
                                      Update
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>{`Update ${r.title}?`}</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This ruleset is on version {cloudSummary.version}. Your
                                        local copy is v{r.version}. This will update the ruleset and
                                        replace your local data. Characters and campaigns will not
                                        be deleted, but may not work properly on the new version.
                                        This cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel disabled={cloudUpdateBusy}>
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        disabled={cloudUpdateBusy}
                                        data-testid='ruleset-cloud-update-confirm'
                                        onClick={() => void handlePullUpdateFromCloud(r.id)}>
                                        Update from cloud
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              ) : null}
                            </span>
                          ) : null}
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
                                <AlertDialogTitle>
                                  Permanently delete this content?
                                </AlertDialogTitle>
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
              visibleCloudOnly.map((r) => (
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
                        {r.linkedToAdministeredOrganization ? (
                          <Building2
                            className='h-3.5 w-3.5 shrink-0 text-muted-foreground'
                            aria-label='Linked to organization you administer'
                            data-testid='ruleset-org-badge'
                          />
                        ) : null}
                        <Cloud
                          className='h-3.5 w-3.5 shrink-0 text-muted-foreground'
                          aria-label='In Quest Bound Cloud'
                          data-testid='ruleset-cloud-badge'
                        />
                      </h2>
                      <span className='shrink-0 text-xs text-muted-foreground'>v{r.version}</span>
                    </div>
                    <div className='flex items-center gap-2'>
                      {r.ownedByCurrentUser ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant='ghost'
                              size='sm'
                              className='h-8 flex-1 gap-1 text-destructive hover:text-destructive'
                              disabled={isInstallingCloud || !!deletingCloudRulesetId}
                              data-testid='ruleset-card-cloud-delete'>
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete from Quest Bound Cloud?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This permanently removes this ruleset and all cloud data tied to it
                                for your account (campaigns, characters, assets, and other synced
                                content). This cannot be undone.
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
                      <Button
                        variant='outline'
                        size='sm'
                        className='h-8 flex-1 gap-1'
                        disabled={isInstallingCloud || !!deletingCloudRulesetId}
                        onClick={() =>
                          void installFromCloud(r.id, { ownedByCurrentUser: r.ownedByCurrentUser })
                        }
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
                    </div>
                  </div>
                </Card>
              ))}
          </div>

          {(isImporting ||
            createFlowBusy ||
            isInstallingCloud ||
            showDeletingSpinner ||
            isDeletingCloud) && (
            <div className='fixed inset-0 z-50 bg-background'>
              <Loading />
              {(isImporting || createFlowBusy) && (
                <div className='absolute inset-x-0 bottom-1/3 flex flex-col items-center gap-1 px-4 text-center'>
                  <p className='text-sm text-muted-foreground'>
                    {isImporting && importStep
                      ? `${importStep}...`
                      : createFlowStatus
                        ? `${createFlowStatus}...`
                        : 'Working...'}
                  </p>
                </div>
              )}
              {isInstallingCloud &&
                !isImporting &&
                !createFlowBusy &&
                !showDeletingSpinner &&
                !isDeletingCloud && (
                  <p className='absolute inset-x-0 bottom-1/3 text-center text-sm text-muted-foreground'>
                    Installing from cloud...
                  </p>
                )}
              {showDeletingSpinner &&
                !isImporting &&
                !createFlowBusy &&
                !isInstallingCloud &&
                !isDeletingCloud && (
                  <p className='absolute inset-x-0 bottom-1/3 text-center text-sm text-muted-foreground'>
                    Deleting ruleset...
                  </p>
                )}
              {isDeletingCloud &&
                !isImporting &&
                !createFlowBusy &&
                !isInstallingCloud &&
                !showDeletingSpinner && (
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

          {cloudUpdateError && (
            <div className='fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 shadow-lg'>
              <div className='flex items-start justify-between gap-2'>
                <div className='flex items-center gap-2'>
                  <AlertCircle className='h-4 w-4 shrink-0' />
                  <span className='text-sm font-medium'>{cloudUpdateError}</span>
                </div>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-6 w-6 shrink-0'
                  onClick={() => setCloudUpdateError(null)}
                  aria-label='Dismiss'>
                  <X className='h-4 w-4' />
                </Button>
              </div>
            </div>
          )}

          {createFlowError && (
            <div className='fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 shadow-lg'>
              <div className='flex items-start justify-between gap-2'>
                <div className='flex items-center gap-2'>
                  <AlertCircle className='h-4 w-4 shrink-0' />
                  <span className='text-sm font-medium'>{createFlowError}</span>
                </div>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-6 w-6 shrink-0'
                  onClick={() => setCreateFlowError(null)}
                  aria-label='Dismiss'>
                  <X className='h-4 w-4' />
                </Button>
              </div>
            </div>
          )}
        </PageWrapper>
      </Tabs>

      <DialogContent className='flex max-h-[min(90vh,720px)] flex-col overflow-hidden sm:max-w-[425px]'>
        <form
          className='flex min-h-0 flex-1 flex-col gap-4'
          onSubmit={(e) => {
            e.preventDefault();
            void handleCreate();
          }}>
          <DialogHeader>
            <DialogTitle>New Ruleset</DialogTitle>
            <DialogDescription>Enter a title and description for your ruleset.</DialogDescription>
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

          <DialogFooter className='mt-auto shrink-0 gap-2 sm:gap-2'>
            <DialogClose asChild>
              <Button type='button' variant='outline'>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type='submit'
              data-testid='create-ruleset-submit'
              disabled={!!deletingRulesetId || !!deletingCloudRulesetId}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
