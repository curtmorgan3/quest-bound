import { Button, Checkbox, Label } from '@/components';
import { useCampaign, useCampaigns, useScriptLogs } from '@/lib/compass-api';
import type { ScriptLog } from '@/types';
import { format } from 'date-fns';
import { CircleOff, ScrollText } from 'lucide-react';

const AUTO_CONTEXTS = ['load', 'character_load'];

function isAutoEntry(log: ScriptLog): boolean {
  return Boolean(log.context && AUTO_CONTEXTS.includes(log.context));
}

interface CampaignGameLogProps {
  /** Campaign ID (for details.showAutoEntries). When set, the show-auto-entries checkbox is shown. */
  campaignId: string | undefined;
  /** Ruleset ID for the campaign (script logs are stored per ruleset). */
  rulesetId: string | undefined;
  /** Max number of log entries to show (newest first). */
  limit?: number;
}

export function CampaignGameLog({ campaignId, rulesetId, limit = 250 }: CampaignGameLogProps) {
  const campaign = useCampaign(campaignId);
  const { updateCampaign } = useCampaigns();
  const { logs: scriptLogs, clearLogs } = useScriptLogs(limit, rulesetId);

  const showAutoEntries = campaign?.details?.showAutoEntries !== false;

  const filteredLogs = showAutoEntries
    ? scriptLogs
    : scriptLogs.filter((l) => !isAutoEntry(l));

  const logs: { msg: string; time: string }[] = [...filteredLogs]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .map((l) => {
      try {
        const logArray = JSON.parse(l.argsJson) as unknown[];
        return {
          msg: Array.isArray(logArray) ? logArray.join(', ') : String(logArray),
          time: format(new Date(l.timestamp), 'MM/dd HH:mm'),
        };
      } catch {
        return { msg: l.argsJson, time: format(new Date(l.timestamp), 'MM/dd HH:mm') };
      }
    })
    .filter((log) => !!log.msg);

  const setShowAutoEntries = (checked: boolean) => {
    if (!campaignId || !campaign) return;
    updateCampaign(campaignId, {
      details: { ...(campaign.details ?? {}), showAutoEntries: checked },
    });
  };

  return (
    <div className='flex min-h-0 min-w-[240px] flex-1 flex-col border-r bg-muted/20 p-3'>
      <div className='mb-2 flex items-center justify-between gap-2'>
        <p className='text-sm text-muted-foreground flex items-center gap-1.5'>
          <ScrollText className='h-4 w-4 shrink-0' />
          Game log
        </p>
        <Button
          variant='ghost'
          size='icon'
          onClick={clearLogs}
          aria-label='Clear game log'
          className='size-7 shrink-0'
          disabled={logs.length === 0}>
          <CircleOff className='size-3.5' />
        </Button>
      </div>
      {campaignId && campaign && (
        <div className='mb-2 flex items-center gap-2'>
          <Checkbox
            id='campaign-game-log-show-auto'
            checked={showAutoEntries}
            onCheckedChange={(c) => setShowAutoEntries(c === true)}
            aria-label='Show auto entries'
            data-testid='campaign-game-log-show-auto'
          />
          <Label
            htmlFor='campaign-game-log-show-auto'
            className='text-xs font-normal text-muted-foreground cursor-pointer'>
            Show auto entries
          </Label>
        </div>
      )}
      <div className='min-h-0 flex-1 overflow-y-auto'>
        {logs.length === 0 ? (
          <p className='text-xs text-muted-foreground'>No log entries yet.</p>
        ) : (
          <div className='flex flex-col gap-0.5 font-mono text-xs'>
            {logs.map((log, i) => (
              <div key={i} className='break-words'>
                <span className='text-muted-foreground'>{`[${log.time}]: `}</span>
                <span>{log.msg}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
