import { Label, Switch } from '@/components';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { CampaignCharacter, Character } from '@/types';
import { Globe } from 'lucide-react';
import { CampaignPlayInvitePanel } from './campaign-play-invite-panel';

const HOST_REALTIME_SWITCH_ID = 'campaign-play-host-realtime';

export interface CampaignPlayInviteSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  rulesetId: string;
  campaignLabel?: string | null;
  campaignCharacters: CampaignCharacter[];
  charactersById: Map<string, Character>;
  hostCloudUserId: string | null;
  hostRealtimeEnabled: boolean;
  onHostRealtimeEnabledChange: (enabled: boolean) => void;
}

export function CampaignPlayInviteSheet({
  open,
  onOpenChange,
  campaignId,
  rulesetId,
  campaignLabel,
  campaignCharacters,
  charactersById,
  hostCloudUserId,
  hostRealtimeEnabled,
  onHostRealtimeEnabledChange,
}: CampaignPlayInviteSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side='right'
        className='flex w-full flex-col gap-0 border-l p-0 sm:max-w-xl [&>button]:absolute [&>button]:right-4 [&>button]:top-4'>
        <SheetHeader className='shrink-0 border-b px-6 py-4'>
          <SheetTitle className='flex items-center gap-2 pr-8'>
            <Globe className='size-5 shrink-0' aria-hidden />
            Host this Campaign
          </SheetTitle>
          <SheetDescription>
            {hostRealtimeEnabled
              ? 'Share a join token so signed-in players can join this campaign as guests.'
              : 'Turn on Host to connect to campaign realtime and create join tokens.'}
          </SheetDescription>
        </SheetHeader>
        <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-6'>
          <div className='flex items-center justify-between gap-3 rounded-md border border-border bg-muted/20 px-3 py-2.5'>
            <div className='min-w-0 space-y-0.5'>
              <Label htmlFor={HOST_REALTIME_SWITCH_ID} className='text-sm font-medium'>
                Host
              </Label>
            </div>
            <Switch
              id={HOST_REALTIME_SWITCH_ID}
              checked={hostRealtimeEnabled}
              onCheckedChange={onHostRealtimeEnabledChange}
              data-testid='campaign-play-host-realtime-switch'
            />
          </div>
          {!hostRealtimeEnabled ? (
            <Alert className='border-muted'>
              <AlertDescription>
                You are in local mode. Enable Host to go online for this campaign and generate join
                tokens for guests.
              </AlertDescription>
            </Alert>
          ) : (
            <CampaignPlayInvitePanel
              campaignId={campaignId}
              rulesetId={rulesetId}
              campaignLabel={campaignLabel}
              campaignCharacters={campaignCharacters}
              charactersById={charactersById}
              hostCloudUserId={hostCloudUserId}
              variant='plain'
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
