import { DocumentMarkdownContent } from '@/components/composites/document-markdown-content';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useDocuments } from '@/lib/compass-api';
import type { Document } from '@/types';
import { FileText } from 'lucide-react';
import { useEffect, useState } from 'react';

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
}

export function LocationDetailsPanel({
  open,
  onOpenChange,
  worldId,
  locationId,
  locationLabel,
}: LocationDetailsPanelProps) {
  const { documents } = useDocuments(worldId && locationId ? { worldId, locationId } : undefined);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  const document = documents?.[0] as Document | undefined;

  useEffect(() => {
    if (!document?.pdfData) {
      setBlobUrl(null);
      return;
    }
    const url = base64ToBlobUrl(document.pdfData);
    setBlobUrl(url);
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [document?.id, document?.pdfData]);

  const hasContent = document && (document.pdfData || document.pdfAssetId || document.markdownData);

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
            {document
              ? document.title
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
          ) : !document ? (
            <div className='flex flex-1 items-center justify-center p-6 text-muted-foreground'>
              <div className='flex flex-col items-center gap-2'>
                <FileText className='h-12 w-12' />
                <p>No document linked to this location</p>
              </div>
            </div>
          ) : !hasContent ? (
            <div className='flex flex-1 items-center justify-center p-6 text-muted-foreground'>
              <p>This document has no PDF or markdown content yet.</p>
            </div>
          ) : (
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
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
