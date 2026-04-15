import { Button, Card, Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components';
import {
  filterSyncEntityCountsForUi,
  getOrderedSyncEntityLines,
} from '@/lib/cloud/sync/sync-entity-labels';
import { getCloudSyncUiCollapsedSummary } from '@/lib/cloud/sync/sync-service';
import { cn } from '@/lib/utils';
import { useCloudSyncSummaryPanelStore } from '@/stores';
import { ChevronDown, CloudCheck, X } from 'lucide-react';

export function CloudSyncSummaryPanel() {
  const open = useCloudSyncSummaryPanelStore((s) => s.open);
  const expanded = useCloudSyncSummaryPanelStore((s) => s.expanded);
  const outcome = useCloudSyncSummaryPanelStore((s) => s.outcome);
  const dismiss = useCloudSyncSummaryPanelStore((s) => s.dismiss);
  const setExpanded = useCloudSyncSummaryPanelStore((s) => s.setExpanded);

  if (!open || !outcome) {
    return null;
  }

  const pushedLines = getOrderedSyncEntityLines(
    filterSyncEntityCountsForUi(outcome.pushedByEntity ?? {}),
  );
  const pulledLines = getOrderedSyncEntityLines(
    filterSyncEntityCountsForUi(outcome.pulledByEntity ?? {}),
  );
  const hasDetails = pushedLines.length > 0 || pulledLines.length > 0;
  const collapsedText = getCloudSyncUiCollapsedSummary(outcome);

  return (
    <div
      className='animate-in slide-in-from-bottom-4 fade-in fixed right-4 bottom-4 z-[100] w-[min(100vw-2rem,22rem)] duration-300'
      role='status'
      aria-live='polite'>
      <Card className='gap-0 py-0 shadow-lg'>
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <div className='flex gap-3 px-4 pt-4 pb-3'>
            <CloudCheck
              className='mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-500'
              aria-hidden
            />
            <div className='min-w-0 flex-1'>
              <div className='flex items-start justify-between gap-2'>
                <div className='text-sm font-semibold'>Synced to Quest Bound Cloud</div>
                <div className='flex shrink-0 items-center gap-0.5'>
                  {hasDetails ? (
                    <CollapsibleTrigger asChild>
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        className='size-8'
                        aria-expanded={expanded}
                        aria-label={expanded ? 'Hide sync details' : 'Show sync details'}>
                        <ChevronDown
                          className={cn('size-4 transition-transform', expanded && 'rotate-180')}
                        />
                      </Button>
                    </CollapsibleTrigger>
                  ) : null}
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='size-8'
                    onClick={dismiss}
                    aria-label='Dismiss'>
                    <X className='size-4' />
                  </Button>
                </div>
              </div>
              {!expanded ? (
                <p className='text-muted-foreground mt-2 text-sm leading-snug'>{collapsedText}</p>
              ) : null}
            </div>
          </div>
          {hasDetails ? (
            <CollapsibleContent>
              <div className='text-muted-foreground space-y-4 border-t px-4 pt-3 pb-4 text-sm overflow-auto'>
                {pushedLines.length > 0 ? (
                  <div>
                    <div className='text-foreground mb-2 text-xs font-medium tracking-wide uppercase'>
                      Pushed
                    </div>
                    <ul className='space-y-1.5'>
                      {pushedLines.map((line) => (
                        <li key={line.tableName} className='leading-snug'>
                          {line.phrase}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {pulledLines.length > 0 ? (
                  <div>
                    <div className='text-foreground mb-2 text-xs font-medium tracking-wide uppercase'>
                      Applied locally
                    </div>
                    <ul className='space-y-1.5'>
                      {pulledLines.map((line) => (
                        <li key={line.tableName} className='leading-snug'>
                          {line.phrase}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </CollapsibleContent>
          ) : null}
        </Collapsible>
      </Card>
    </div>
  );
}
