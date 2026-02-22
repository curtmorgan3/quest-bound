import { Button } from '@/components';
import { DocumentMarkdownContent } from '@/components/composites/document-markdown-content';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DocumentLookup,
  useCampaignEventLocationsByLocation,
  useDocuments,
} from '@/lib/compass-api';
import { useQBScriptClient } from '@/lib/compass-logic/worker/hooks';
import { CampaignPlayContext } from '@/stores';
import type { Document } from '@/types';
import { FileText, Zap } from 'lucide-react';
import { useCallback, useContext, useEffect, useState } from 'react';

function base64ToBlobUrl(base64Data: string): string | null {
  try {
    const base64Content = base64Data.split(',')[1];
    if (!base64Content) return null;
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'application/pdf' });
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error('Failed to convert base64 to blob URL:', e);
    return null;
  }
}

interface LocationDetailsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worldId: string | undefined;
  locationId: string | undefined;
  locationLabel?: string;
  /** When set (e.g. in campaign play), show World and Campaign tabs. */
  campaignId?: string;
}

function DocumentContent({ document, blobUrl }: { document: Document; blobUrl: string | null }) {
  const hasContent = document.pdfData || document.pdfAssetId || document.markdownData;

  if (!hasContent) {
    return (
      <div className='flex flex-1 items-center justify-center p-6 text-muted-foreground'>
        <p>This document has no PDF or markdown content yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className='min-h-0 flex-1 overflow-auto p-6'>
        {blobUrl ? (
          <iframe
            src={blobUrl}
            className='h-full min-h-[60vh] w-full rounded-lg border'
            title={document.title}
          />
        ) : document.pdfData ? (
          <div className='flex h-40 items-center justify-center text-muted-foreground'>
            Loading PDF…
          </div>
        ) : document.markdownData ? (
          <div className='prose prose-sm dark:prose-invert max-w-none'>
            <DocumentMarkdownContent
              value={document.markdownData}
              mode='view'
              placeholder='No content.'
            />
          </div>
        ) : null}
      </div>
      {document.description && (
        <div className='shrink-0 border-t px-6 py-4'>
          <h2 className='text-sm font-medium mb-2'>Description</h2>
          <p className='text-sm text-muted-foreground'>{document.description}</p>
        </div>
      )}
    </>
  );
}

export function LocationDetailsPanel({
  open,
  onOpenChange,
  worldId,
  locationId,
  locationLabel,
  campaignId,
}: LocationDetailsPanelProps) {
  const [activeTab, setActiveTab] = useState<'world' | 'campaign'>('campaign');

  const { documents: worldDocuments } = useDocuments(
    worldId && locationId ? { worldId, locationId } : undefined,
  );
  const { documents: campaignDocuments } = useDocuments(
    campaignId && locationId ? { campaignId, locationId } : undefined,
  );
  const eventLocationsAtLocation = useCampaignEventLocationsByLocation(locationId);
  const campaignEventsAtLocation =
    campaignId && locationId
      ? eventLocationsAtLocation.filter((el) => el.event.campaignId === campaignId)
      : [];

  const campaignContext = useContext(CampaignPlayContext);
  const client = useQBScriptClient();
  const actingCharacterId =
    campaignContext?.selectedCharacters?.[0]?.characterId ??
    campaignContext?.charactersInThisLocation?.[0]?.characterId;

  const handleActivateEvent = useCallback(
    (campaignEventLocationId: string) => {
      if (!actingCharacterId) return;
      client
        .executeCampaignEventEvent(campaignEventLocationId, actingCharacterId, 'on_activate')
        .catch((err) => console.warn('[Campaign] on_activate script failed:', err));
    },
    [actingCharacterId, client],
  );

  const { updateDocument: updateCampaignDocument } = useDocuments(
    campaignId ? { campaignId } : undefined,
  );

  const worldDocument = worldDocuments?.[0] as Document | undefined;
  const campaignDocument = campaignDocuments?.[0] as Document | undefined;

  const displayDocument = activeTab === 'world' ? worldDocument : campaignDocument;
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!displayDocument?.pdfData) {
      setBlobUrl(null);
      return;
    }
    const url = base64ToBlobUrl(displayDocument.pdfData);
    setBlobUrl(url);
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [displayDocument?.id, displayDocument?.pdfData]);

  const showTabs = Boolean(campaignId && worldId && locationId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side='right'
        className='flex w-full flex-col gap-0 border-l p-0 sm:max-w-2xl [&>button]:absolute [&>button]:right-4 [&>button]:top-4'>
        <SheetHeader className='shrink-0 border-b px-6 py-4'>
          <SheetTitle className='pr-8'>
            {locationLabel ? `${locationLabel} — Details` : 'Location details'}
          </SheetTitle>
          <SheetDescription>
            {displayDocument
              ? displayDocument.title
              : locationId
                ? 'No document linked to this location.'
                : 'Select a location to view its document.'}
          </SheetDescription>
        </SheetHeader>
        <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
          {!worldId || !locationId ? (
            <div className='flex flex-1 items-center justify-center p-6 text-muted-foreground'>
              <div className='flex flex-col items-center gap-2'>
                <FileText className='h-12 w-12' />
                <p>No location selected</p>
              </div>
            </div>
          ) : showTabs ? (
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as 'world' | 'campaign')}
              className='flex min-h-0 flex-1 flex-col'>
              <div className='shrink-0 border-b px-6 pt-2'>
                <TabsList className='w-full'>
                  <TabsTrigger value='campaign' className='flex-1'>
                    Campaign
                  </TabsTrigger>
                  <TabsTrigger value='world' className='flex-1'>
                    World
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent
                value='world'
                className='flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden'>
                {!worldDocument ? (
                  <div className='flex flex-1 items-center justify-center p-6 text-muted-foreground'>
                    <div className='flex flex-col items-center gap-2'>
                      <FileText className='h-12 w-12' />
                      <p>No world document linked to this location</p>
                    </div>
                  </div>
                ) : (
                  <DocumentContent
                    document={worldDocument}
                    blobUrl={activeTab === 'world' ? blobUrl : null}
                  />
                )}
              </TabsContent>
              <TabsContent
                value='campaign'
                className='flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden'>
                {campaignEventsAtLocation.length > 0 && (
                  <div className='shrink-0 border-b px-6 py-4'>
                    <h3 className='text-sm font-medium mb-2'>Events at this location</h3>
                    <div className='flex flex-wrap gap-2'>
                      {campaignEventsAtLocation.map((el) => {
                        const canActivate = Boolean(el.event.scriptId && actingCharacterId);
                        return (
                          <Button
                            key={el.id}
                            variant='outline'
                            size='sm'
                            className='gap-1.5'
                            disabled={!canActivate}
                            title={
                              canActivate
                                ? `Run on_activate`
                                : !el.event.scriptId
                                  ? 'No script assigned'
                                  : 'No character in this location'
                            }
                            onClick={() => handleActivateEvent(el.id)}>
                            <Zap className='h-4 w-4' />
                            {el.event.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {!campaignDocument ? (
                  <div className='flex flex-1 flex-col gap-4 overflow-auto p-6'>
                    <p className='text-sm text-muted-foreground'>
                      Associate a campaign document to this location.
                    </p>
                    <DocumentLookup
                      campaignId={campaignId}
                      label='Document'
                      placeholder='Search documents...'
                      value={null}
                      onSelect={(doc) =>
                        updateCampaignDocument(doc.id, {
                          campaignId: campaignId!,
                          locationId: locationId!,
                        })
                      }
                    />
                  </div>
                ) : (
                  <>
                    <div className='shrink-0 flex items-center justify-between border-b px-6 py-2'>
                      <span className='text-sm text-muted-foreground'>
                        {campaignDocument.title}
                      </span>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() =>
                          updateCampaignDocument(campaignDocument.id, {
                            campaignId: null,
                            locationId: null,
                          })
                        }>
                        Unlink
                      </Button>
                    </div>
                    <DocumentContent
                      document={campaignDocument}
                      blobUrl={activeTab === 'campaign' ? blobUrl : null}
                    />
                  </>
                )}
              </TabsContent>
            </Tabs>
          ) : !worldDocument ? (
            <div className='flex flex-1 items-center justify-center p-6 text-muted-foreground'>
              <div className='flex flex-col items-center gap-2'>
                <FileText className='h-12 w-12' />
                <p>No document linked to this location</p>
              </div>
            </div>
          ) : (
            <DocumentContent document={worldDocument} blobUrl={blobUrl} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
