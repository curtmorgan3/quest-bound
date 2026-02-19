import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useImportRuleset, useRulesets, type ImportRulesetResult } from '@/lib/compass-api';
import { AlertCircle, CheckCircle, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import Markdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';

export const Rulesets = () => {
  const { rulesets, createRuleset, deleteRuleset } = useRulesets();
  const { importRuleset, isImporting } = useImportRuleset();

  const sortedRulesets = [...rulesets].sort((a, b) => a.title.localeCompare(b.title));

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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleCreate = async () => {
    await createRuleset({
      title: title || 'New Ruleset',
      description,
    });
  };

  const handleImport = () => {
    fileInputRef.current?.click();
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
    <div className='flex h-full w-full flex-col p-4 gap-4'>
      <h1 className='text-4xl font-bold'>Rulesets</h1>
      <div className='flex items-center gap-4'>
        <Dialog>
          <form>
            <DialogTrigger asChild>
              <Button className='w-[180px]' data-testid='create-ruleset-button'>
                Create New
              </Button>
            </DialogTrigger>
            <DialogContent className='sm:max-w-[425px]'>
              <DialogHeader>
                <DialogTitle>New Ruleset</DialogTitle>
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

        <div className='flex items-center gap-4'>
          <Input
            ref={fileInputRef}
            type='file'
            accept='.zip'
            onChange={handleFileSelect}
            className='hidden'
          />
          <Button
            className='gap-2 w-[50px]'
            variant='outline'
            disabled={isImporting}
            onClick={handleImport}
            data-testid='import-ruleset-button'>
            {isImporting ? (
              <Upload className='h-4 w-4 animate-pulse' />
            ) : (
              <Upload className='h-4 w-4' />
            )}
          </Button>

          {importResult && (
            <div
              className={`p-3 rounded-lg border ${
                importResult.success
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
              <div className='flex items-center gap-2'>
                {importResult.success ? (
                  <CheckCircle className='h-4 w-4' />
                ) : (
                  <AlertCircle className='h-4 w-4' />
                )}
                <span className='text-sm font-medium'>{importResult.message}</span>
              </div>

              {importResult.success && importResult.importedRuleset && (
                <div className='mt-2 text-xs'>
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
                <div className='mt-2'>
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

          <Dialog open={replaceConfirmOpen} onOpenChange={setReplaceConfirmOpen}>
            <DialogContent className='sm:max-w-[425px]'>
              <DialogHeader>
                <DialogTitle>Replace existing ruleset?</DialogTitle>
              </DialogHeader>
              <p className='text-sm text-muted-foreground'>{pendingReplaceResult?.message}</p>
              <DialogFooter>
                <Button variant='outline' onClick={handleCancelReplace}>
                  Cancel
                </Button>
                <Button onClick={handleConfirmReplace} disabled={isImporting}>
                  {isImporting ? 'Replacing…' : 'Replace'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={duplicateConfirmOpen} onOpenChange={setDuplicateConfirmOpen}>
            <DialogContent className='sm:max-w-[425px]'>
              <DialogHeader>
                <DialogTitle>Save as new ruleset?</DialogTitle>
              </DialogHeader>
              <p className='text-sm text-muted-foreground'>{pendingDuplicateResult?.message}</p>
              <div className='mt-4 grid gap-4'>
                <div className='grid gap-2'>
                  <Label htmlFor='duplicate-title'>Title</Label>
                  <Input
                    id='duplicate-title'
                    value={duplicateTitle}
                    onChange={(e) => setDuplicateTitle(e.target.value)}
                    placeholder={pendingDuplicateResult?.importedRuleset?.title}
                  />
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='duplicate-version'>Version</Label>
                  <Input
                    id='duplicate-version'
                    value={duplicateVersion}
                    onChange={(e) => setDuplicateVersion(e.target.value)}
                    placeholder={pendingDuplicateResult?.importedRuleset?.version}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant='outline' onClick={handleCancelDuplicate}>
                  Cancel
                </Button>
                <Button onClick={handleConfirmDuplicate} disabled={isImporting}>
                  {isImporting ? 'Creating…' : 'Create copy'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className='flex flex-col gap-3'>
        {sortedRulesets?.map((r) => {
          const doNotAsk = localStorage.getItem('qb.confirmOnDelete') === 'false';
          return (
            <Card key={r.id} className='flex flex-row overflow-hidden p-0 h-32 min-h-[200px] gap-0'>
              <div
                className='w-40 shrink-0 bg-muted bg-cover bg-center'
                style={r.image ? { backgroundImage: `url(${r.image})` } : undefined}
              />
              <div className='flex min-w-0 flex-1 flex-col justify-between p-4'>
                <div className='min-w-0'>
                  <div className='flex items-center w-full justify-between'>
                    <h2 className='truncate text-lg font-semibold'>{r.title}</h2>
                    <span className='text-xs text-muted-foreground'>v{r.version}</span>
                  </div>
                  {r.description ? (
                    <div className='md-content mt-0.5 max-h-[90%] overflow-scroll text-sm text-muted-foreground'>
                      <Markdown>{r.description}</Markdown>
                    </div>
                  ) : null}
                </div>
                <div className='mt-2 flex items-center justify-end gap-2'>
                  {doNotAsk ? (
                    <Button
                      variant='ghost'
                      size='sm'
                      className='text-red-500'
                      data-testid='preview-card-delete'
                      onClick={() => deleteRuleset(r.id)}>
                      Delete
                    </Button>
                  ) : (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='text-red-500'
                          data-testid='preview-card-delete'>
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Permanently delete this content?</AlertDialogTitle>
                          <div className='flex gap-2'>
                            <Label htmlFor='preview-card-do-not-ask-again'>Do not ask again</Label>
                            <Checkbox
                              id='preview-card-do-not-ask-again'
                              onCheckedChange={(checked) =>
                                localStorage.setItem('qb.confirmOnDelete', String(!checked))
                              }
                            />
                          </div>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            data-testid='preview-card-delete-confirm'
                            onClick={() => deleteRuleset(r.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => navigate(`/rulesets/${r.id}`)}
                    data-testid='preview-card-open'>
                    Open
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
