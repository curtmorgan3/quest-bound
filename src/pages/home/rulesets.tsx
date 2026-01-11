import { Button, Input, Textarea } from '@/components';
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useImportRuleset, useRulesets, type ImportRulesetResult } from '@/lib/compass-api';
import { AlertCircle, CheckCircle, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const Rulesets = () => {
  const { rulesets, createRuleset, deleteRuleset } = useRulesets();
  const { importRuleset, isImporting } = useImportRuleset();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [importResult, setImportResult] = useState<ImportRulesetResult | null>(null);

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

    // Reset previous result
    setImportResult(null);

    try {
      const result = await importRuleset(file);
      setImportResult(result);

      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Import failed:', error);
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
            onClick={handleImport}>
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
        </div>
      </div>

      <div className='flex flex-row gap-2 flex-wrap'>
        {rulesets?.map((r) => (
          <Card
            key={r.id}
            className='p-4 w-[350px] h-[280px] flex flex-col justify-between'
            data-testid={`ruleset-card-${r.id}`}
            style={
              r.image
                ? {
                    background: `url(${r.image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }
                : undefined
            }>
            <CardHeader>
              <CardTitle className='text-lg'>{r.title}</CardTitle>
            </CardHeader>
            <CardDescription className='grow-1 max-h-[80px] overflow-y-auto'>
              {r.description}
            </CardDescription>
            <div className='flex gap-2 mt-2 bg-secondary rounded-md p-2 justify-between items-center'>
              <Button
                variant='ghost'
                onClick={() => deleteRuleset(r.id)}
                className='text-red-500'
                data-testid={`delete-ruleset-${r.id}`}>
                Delete
              </Button>
              <CardAction>
                <Button
                  variant='link'
                  onClick={() => navigate(`/rulesets/${r.id}`)}
                  data-testid={`open-ruleset-${r.id}`}>
                  Open
                </Button>
              </CardAction>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
