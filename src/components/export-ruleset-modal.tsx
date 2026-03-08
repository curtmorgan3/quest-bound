import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Campaign, Character } from '@/types';
import { Download, Loader2 } from 'lucide-react';
import { useState } from 'react';

export interface ExportRulesetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  characters: Character[];
  campaigns: Campaign[];
  onExport: (options: { characterIds: string[]; campaignIds: string[] }) => Promise<void>;
  isExporting?: boolean;
}

export function ExportRulesetModal({
  open,
  onOpenChange,
  characters,
  campaigns,
  onExport,
  isExporting = false,
}: ExportRulesetModalProps) {
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<Set<string>>(new Set());
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set());

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSelectedCharacterIds(new Set());
      setSelectedCampaignIds(new Set());
    }
    onOpenChange(next);
  };

  const toggleCharacter = (id: string, checked: boolean | string) => {
    setSelectedCharacterIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleCampaign = (id: string, checked: boolean | string) => {
    setSelectedCampaignIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const selectAllCharacters = (checked: boolean) => {
    if (checked) setSelectedCharacterIds(new Set(characters.map((c) => c.id)));
    else setSelectedCharacterIds(new Set());
  };

  const selectAllCampaigns = (checked: boolean) => {
    if (checked) setSelectedCampaignIds(new Set(campaigns.map((c) => c.id)));
    else setSelectedCampaignIds(new Set());
  };

  const handleExport = async () => {
    await onExport({
      characterIds: Array.from(selectedCharacterIds),
      campaignIds: Array.from(selectedCampaignIds),
    });
    handleOpenChange(false);
  };

  const hasCharacters = characters.length > 0;
  const hasCampaigns = campaigns.length > 0;
  const hasAnyOptions = hasCharacters || hasCampaigns;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="z-[1100] max-w-md" overlayClassName="z-[1100]">
        <DialogHeader>
          <DialogTitle>Export ruleset</DialogTitle>
          <DialogDescription>
            Optionally include player characters and campaigns. NPCs are included automatically when
            you select campaigns that contain them. The ruleset definition is always included.
          </DialogDescription>
        </DialogHeader>

        {hasAnyOptions ? (
          <div className="flex flex-col gap-4 py-2">
            {hasCharacters && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Player characters</span>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox
                      checked={
                        characters.length > 0 &&
                        selectedCharacterIds.size === characters.length
                      }
                      onCheckedChange={selectAllCharacters}
                    />
                    Select all
                  </label>
                </div>
                <ScrollArea className="h-[140px] rounded-md border p-2">
                  <div className="flex flex-col gap-1.5">
                    {characters.map((c) => (
                      <label
                        key={c.id}
                        className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-muted/60"
                      >
                        <Checkbox
                          checked={selectedCharacterIds.has(c.id)}
                          onCheckedChange={(checked) => toggleCharacter(c.id, checked)}
                        />
                        <span className="truncate text-sm">{c.name ?? c.id}</span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {hasCampaigns && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Campaigns</span>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox
                      checked={
                        campaigns.length > 0 && selectedCampaignIds.size === campaigns.length
                      }
                      onCheckedChange={selectAllCampaigns}
                    />
                    Select all
                  </label>
                </div>
                <ScrollArea className="h-[140px] rounded-md border p-2">
                  <div className="flex flex-col gap-1.5">
                    {campaigns.map((c) => (
                      <label
                        key={c.id}
                        className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-muted/60"
                      >
                        <Checkbox
                          checked={selectedCampaignIds.has(c.id)}
                          onCheckedChange={(checked) => toggleCampaign(c.id, checked)}
                        />
                        <span className="truncate text-sm">{c.label ?? c.id}</span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        ) : (
          <p className="py-2 text-sm text-muted-foreground">
            No player characters or campaigns for this ruleset. Export will include only the
            ruleset definition and test characters.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Exporting…
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
