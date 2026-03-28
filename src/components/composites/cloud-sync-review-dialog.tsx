import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CLOUD_SYNC_UI_HIDDEN_ENTITY_TABLES,
  filterSyncEntityCountsForUi,
  getOrderedSyncEntityLines,
  getSyncEntityTypeLabelMany,
  getSyncEntityTypeLabelOne,
  sumSyncEntityCounts,
} from '@/lib/cloud/sync/sync-entity-labels';
import {
  buildPullReviewListItems,
  countHiddenPullDeletes,
  countHiddenPullUpserts,
  formatIsoForReview,
  pickOptionalRowDisplayName,
  type PullReviewListItem,
} from '@/lib/cloud/sync/sync-pull-review-items';
import { db, useCloudSyncReviewStore } from '@/stores';
import type { DB } from '@/stores/db/hooks/types';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

function EntityList({
  counts,
  emptyLabel,
}: {
  counts: Record<string, number>;
  emptyLabel: string;
}) {
  const displayed = filterSyncEntityCountsForUi(counts);
  const lines = getOrderedSyncEntityLines(displayed);
  const anyTotal = sumSyncEntityCounts(counts) > 0;
  const anyDisplayed = sumSyncEntityCounts(displayed) > 0;

  if (lines.length === 0) {
    if (anyTotal && !anyDisplayed) {
      return (
        <p className='text-muted-foreground text-sm'>
          Character sheet data will sync (not listed here).
        </p>
      );
    }
    return <p className='text-muted-foreground text-sm'>{emptyLabel}</p>;
  }
  return (
    <ul className='text-sm'>
      {lines.map((line) => (
        <li key={line.tableName} className='py-0.5'>
          {line.phrase}
        </li>
      ))}
    </ul>
  );
}

function PullReviewRow({
  item,
  deleteDisplayName,
  componentWindowTitle,
}: {
  item: PullReviewListItem;
  deleteDisplayName?: string;
  /** Resolved from local Dexie when not in staged pull */
  componentWindowTitle?: string;
}) {
  if (item.kind === 'componentWindowGroup') {
    const isOrphan = !item.windowId;
    const typeLine = isOrphan ? getSyncEntityTypeLabelOne('components') : getSyncEntityTypeLabelOne('windows');
    const title = !isOrphan ? (item.windowTitleFromPayload ?? componentWindowTitle ?? null) : null;
    const n = item.componentCount;
    const countPhrase = `${n} ${n === 1 ? getSyncEntityTypeLabelOne('components') : getSyncEntityTypeLabelMany('components')}`;
    return (
      <li className='border-border/80 border-b py-2.5 last:border-b-0'>
        <div className='text-muted-foreground text-xs font-medium tracking-wide'>{typeLine}</div>
        {title ? <div className='text-foreground mt-0.5 leading-snug font-medium'>{title}</div> : null}
        <div className='text-foreground mt-0.5 leading-snug font-medium'>{countPhrase}</div>
        <div className='text-muted-foreground mt-1 text-xs'>{formatIsoForReview(item.timestampIso)}</div>
      </li>
    );
  }
  if (item.kind === 'upsert') {
    return (
      <li className='border-border/80 border-b py-2.5 last:border-b-0'>
        <div className='text-muted-foreground text-xs font-medium tracking-wide'>{item.typeLabel}</div>
        {item.displayName ? (
          <div className='text-foreground mt-0.5 leading-snug font-medium'>{item.displayName}</div>
        ) : null}
        <div className='text-muted-foreground mt-1 text-xs'>{formatIsoForReview(item.timestampIso)}</div>
      </li>
    );
  }
  return (
    <li className='border-border/80 border-b py-2.5 last:border-b-0'>
      <div className='text-muted-foreground text-xs font-medium tracking-wide'>
        {item.typeLabel} · removed
      </div>
      {deleteDisplayName ? (
        <div className='text-foreground mt-0.5 leading-snug font-medium'>{deleteDisplayName}</div>
      ) : null}
      <div className='text-muted-foreground mt-1 text-xs'>{formatIsoForReview(item.timestampIso)}</div>
    </li>
  );
}

function PullFromCloudList({
  items,
  deleteDisplayNames,
  componentWindowTitles,
  hiddenUpserts,
  hiddenDeletes,
  hasAnyPullCounts,
}: {
  items: PullReviewListItem[];
  deleteDisplayNames: Record<string, string>;
  componentWindowTitles: Record<string, string>;
  hiddenUpserts: number;
  hiddenDeletes: number;
  hasAnyPullCounts: boolean;
}) {
  const hiddenTotal = hiddenUpserts + hiddenDeletes;
  const hiddenOnly = items.length === 0 && hasAnyPullCounts && hiddenTotal > 0;
  const hiddenNote =
    hiddenTotal > 0 ? 'Additional character sheet updates apply (not listed here).' : null;

  if (!hasAnyPullCounts) {
    return <p className='text-muted-foreground text-sm'>No incoming changes</p>;
  }

  if (hiddenOnly) {
    return (
      <p className='text-muted-foreground text-sm'>
        Character sheet data will sync (not listed here).
      </p>
    );
  }

  if (items.length === 0) {
    return <p className='text-muted-foreground text-sm'>No incoming changes</p>;
  }

  return (
    <div className='flex min-h-0 flex-col gap-2'>
      <ScrollArea className='max-h-[min(50dvh,22rem)] pr-3'>
        <ul className='pr-1'>
            {items.map((item) => (
              <PullReviewRow
                key={item.key}
                item={item}
                deleteDisplayName={item.kind === 'delete' ? deleteDisplayNames[item.key] : undefined}
                componentWindowTitle={
                  item.kind === 'componentWindowGroup' && item.windowId
                    ? componentWindowTitles[item.windowId]
                    : undefined
                }
              />
            ))}
        </ul>
      </ScrollArea>
      {hiddenNote ? (
        <p className='text-muted-foreground text-xs leading-snug'>{hiddenNote}</p>
      ) : null}
    </div>
  );
}

export function CloudSyncReviewDialog() {
  const open = useCloudSyncReviewStore((s) => s.open);
  const plan = useCloudSyncReviewStore((s) => s.plan);
  const committing = useCloudSyncReviewStore((s) => s.committing);
  const cancel = useCloudSyncReviewStore((s) => s.cancel);
  const confirm = useCloudSyncReviewStore((s) => s.confirm);

  const [deleteDisplayNames, setDeleteDisplayNames] = useState<Record<string, string>>({});
  const [componentWindowTitles, setComponentWindowTitles] = useState<Record<string, string>>({});

  const pullItems = useMemo(
    () => (plan ? buildPullReviewListItems(plan.stagedPull) : []),
    [plan],
  );
  const hiddenUpserts = useMemo(
    () => (plan ? countHiddenPullUpserts(plan.stagedPull) : 0),
    [plan],
  );
  const hiddenDeletes = useMemo(
    () => (plan ? countHiddenPullDeletes(plan.stagedPull) : 0),
    [plan],
  );
  const hasAnyPullCounts = plan ? sumSyncEntityCounts(plan.pulledByEntity) > 0 : false;

  useEffect(() => {
    if (!open || !plan) {
      setDeleteDisplayNames({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const next: Record<string, string> = {};
      for (const d of plan.stagedPull.deletes) {
        if (CLOUD_SYNC_UI_HIDDEN_ENTITY_TABLES.has(d.tableName)) continue;
        const key = `d:${d.tableName}:${d.entityId}`;
        try {
          const t = (
            db as unknown as Record<string, { get?: (id: string) => Promise<unknown> } | undefined>
          )[d.tableName];
          const row = await t?.get?.(d.entityId);
          if (row && typeof row === 'object') {
            const label = pickOptionalRowDisplayName(row as Record<string, unknown>);
            if (label) next[key] = label;
          }
        } catch {
          /* no friendly name */
        }
      }
      if (!cancelled) setDeleteDisplayNames(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, plan]);

  useEffect(() => {
    if (!open || !plan) {
      setComponentWindowTitles({});
      return;
    }
    const ids = new Set<string>();
    for (const item of pullItems) {
      if (item.kind === 'componentWindowGroup' && item.windowId) ids.add(item.windowId);
    }
    if (ids.size === 0) {
      setComponentWindowTitles({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const next: Record<string, string> = {};
      for (const id of ids) {
        try {
          const w = await db.windows.get(id);
          const t = typeof w?.title === 'string' ? w.title.trim() : '';
          if (t) next[id] = t;
        } catch {
          /* ignore */
        }
      }
      if (!cancelled) setComponentWindowTitles(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, plan, pullItems]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !committing) cancel();
      }}>
      <DialogContent
        className='max-h-[85dvh] gap-4 sm:max-w-3xl'
        data-testid='cloud-sync-review-dialog'>
        <DialogHeader>
          <DialogTitle>Review Sync</DialogTitle>
          <DialogDescription>
            Apply cloud updates locally, then push your outgoing changes. Asset files download when
            you confirm.
          </DialogDescription>
        </DialogHeader>
        {plan ? (
          <div className='grid max-h-[min(58dvh,26rem)] grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6'>
            <div className='flex min-h-0 min-w-0 flex-col'>
              <div className='text-foreground mb-2 text-sm font-medium tracking-wide'>
                Pull from Cloud
              </div>
              <PullFromCloudList
                items={pullItems}
                deleteDisplayNames={deleteDisplayNames}
                componentWindowTitles={componentWindowTitles}
                hiddenUpserts={hiddenUpserts}
                hiddenDeletes={hiddenDeletes}
                hasAnyPullCounts={hasAnyPullCounts}
              />
            </div>
            <div className='min-w-0'>
              <div className='text-foreground mb-2 text-sm font-medium tracking-wide'>
                Push to Cloud
              </div>
              <EntityList counts={plan.pushedByEntity} emptyLabel='Nothing to push' />
            </div>
          </div>
        ) : null}
        <DialogFooter className='gap-2'>
          <Button type='button' variant='outline' onClick={cancel} disabled={committing}>
            Cancel
          </Button>
          <Button
            type='button'
            onClick={() => void confirm(db as DB)}
            disabled={committing || !plan}>
            {committing ? (
              <>
                <Loader2 className='mr-2 size-4 animate-spin' />
                Syncing…
              </>
            ) : (
              'Confirm Sync'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
