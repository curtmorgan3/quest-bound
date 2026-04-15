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
} from '@/components';
import { PageWrapper } from '@/components/composites';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCampaigns, useImportCampaign, useRulesets } from '@/lib/compass-api';
import { NewCampaignModal } from '@/pages/campaigns/new-campaign-modal';
import { AlertCircle, Plus, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function Campaigns() {
  const [searchParams] = useSearchParams();
  const rulesetIdParam = searchParams.get('rulesetId');
  const [newCampaignModalOpen, setNewCampaignModalOpen] = useState(false);

  const { campaigns, deleteCampaign } = useCampaigns();
  const { rulesets } = useRulesets();
  const { importCampaign, isImporting } = useImportCampaign();
  const navigate = useNavigate();

  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    rulesetMissing: boolean;
    wrongRuleset: boolean;
  } | null>(null);
  const [rulesetWarningOpen, setRulesetWarningOpen] = useState(false);
  const [wrongRulesetOpen, setWrongRulesetOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await importCampaign(file, {
        expectedRulesetId: rulesetIdParam ?? undefined,
      });
      setImportResult({
        success: result.success,
        message: result.message,
        rulesetMissing: result.rulesetMissing,
        wrongRuleset: result.wrongRuleset,
      });
      if (result.rulesetMissing) {
        setRulesetWarningOpen(true);
      }
      if (result.wrongRuleset) {
        setWrongRulesetOpen(true);
      }
    } catch (error) {
      setImportResult({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Campaign import failed due to an unknown error.',
        rulesetMissing: false,
        wrongRuleset: false,
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setNewCampaignModalOpen(true);
      const nextSearch = new URLSearchParams(searchParams);
      nextSearch.delete('new');
      const search = nextSearch.toString();
      navigate('/campaigns' + (search ? `?${search}` : ''), { replace: true });
    }
  }, [searchParams, navigate]);

  const getRulesetTitle = (id: string) =>
    rulesets.find((r) => r.id === id)?.title ?? 'Unknown ruleset';

  const filteredCampaigns = useMemo(
    () =>
      !rulesetIdParam
        ? []
        : [...campaigns]
            .filter((c) => c.rulesetId === rulesetIdParam)
            .sort((a, b) =>
              getRulesetTitle(a.rulesetId).localeCompare(getRulesetTitle(b.rulesetId)),
            ),
    [campaigns, rulesetIdParam, rulesets],
  );

  return (
    <PageWrapper
      title='Campaigns'
      headerActions={
        <div className='flex items-center gap-2'>
          <Button
            size='sm'
            className='gap-1'
            data-testid='campaigns-create'
            onClick={() => setNewCampaignModalOpen(true)}>
            <Plus className='h-4 w-4' />
            Create Campaign
          </Button>

          <input
            ref={fileInputRef}
            type='file'
            accept='.zip'
            onChange={handleFileSelect}
            className='hidden'
            aria-label='Import campaign from zip'
          />
          <Button
            variant='outline'
            size='sm'
            className='gap-1'
            disabled={isImporting}
            onClick={handleImportClick}
            data-testid='campaigns-upload'>
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

          {importResult && (
            <div
              className={`p-3 rounded-lg border text-sm ${
                importResult.success
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
              <div className='flex items-center gap-2'>
                {importResult.success ? null : <AlertCircle className='h-4 w-4' />}
                <span className='font-medium'>{importResult.message}</span>
              </div>
            </div>
          )}

          <Dialog open={rulesetWarningOpen} onOpenChange={setRulesetWarningOpen}>
            <DialogContent className='sm:max-w-[425px]'>
              <DialogHeader>
                <DialogTitle>Ruleset not found</DialogTitle>
                <DialogDescription>
                  The ruleset for this campaign is not in this library.
                </DialogDescription>
              </DialogHeader>
              <p className='text-sm text-muted-foreground'>
                Import the ruleset first, then import the campaign zip again. Campaign data depends
                on that ruleset (characters, scripts, and documents are tied to it).
              </p>
              <DialogFooter>
                <Button onClick={() => setRulesetWarningOpen(false)}>OK</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={wrongRulesetOpen} onOpenChange={setWrongRulesetOpen}>
            <DialogContent className='sm:max-w-[425px]'>
              <DialogHeader>
                <DialogTitle>Wrong ruleset</DialogTitle>
                <DialogDescription>
                  This campaign export belongs to a different ruleset than the one you are viewing.
                </DialogDescription>
              </DialogHeader>
              <p className='text-sm text-muted-foreground'>
                Open the Campaigns page for the ruleset this file was exported from, then import
                there. Nothing was changed in your library.
              </p>
              <DialogFooter>
                <Button onClick={() => setWrongRulesetOpen(false)}>OK</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      }>
      <NewCampaignModal open={newCampaignModalOpen} onOpenChange={setNewCampaignModalOpen} />
      <div className='flex flex-wrap gap-4'>
        {filteredCampaigns.map((campaign) => (
          <Card
            key={campaign.id}
            className='flex aspect-square w-[min(100%,280px)] flex-col overflow-hidden p-0'
            data-testid='campaign-card'>
            <div
              className='min-h-0 flex-1 bg-muted bg-cover bg-center'
              style={campaign.image ? { backgroundImage: `url(${campaign.image})` } : undefined}
            />
            <div className='flex shrink-0 flex-col gap-2 border-t p-3'>
              <div className='flex min-w-0 flex-col gap-0.5'>
                <h2 className='truncate text-sm font-semibold'>
                  {campaign.label || 'Unnamed campaign'}
                </h2>
                <span className='truncate text-xs text-muted-foreground'>
                  {getRulesetTitle(campaign.rulesetId)}
                </span>
              </div>
              <div className='flex items-center gap-2'>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      className='h-8 flex-1 text-red-500'
                      aria-label='Delete campaign'
                      data-testid='campaign-card-delete'>
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete campaign?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the campaign. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                        onClick={() => deleteCampaign(campaign.id)}
                        data-testid='campaign-delete-confirm'>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button
                  variant='outline'
                  size='sm'
                  className='h-8 flex-1'
                  onClick={() => navigate(`/campaigns/${campaign.id}/scenes`)}
                  data-testid='campaign-card-open'>
                  Open
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredCampaigns.length === 0 && (
        <div className='flex flex-col items-center justify-center gap-4 py-12 text-center text-muted-foreground'>
          <p className='text-lg'>No Campaigns</p>
          <p className='text-sm'>Create your first campaign to get started</p>
          <Button
            size='sm'
            className='gap-1'
            data-testid='campaigns-create-empty-cta'
            onClick={() => setNewCampaignModalOpen(true)}>
            <Plus className='h-4 w-4' />
            Create Campaign
          </Button>
        </div>
      )}
    </PageWrapper>
  );
}
