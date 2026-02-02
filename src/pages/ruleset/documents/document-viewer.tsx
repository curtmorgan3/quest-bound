import { Button } from '@/components';
import { useIsMobileDevice } from '@/hooks/use-mobile-device';
import { useCharacter, useDocuments } from '@/lib/compass-api';
import { ArrowLeft, Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MobileDocumentViewer } from './mobile-document-viewer';

// Convert base64 data URL to Blob URL for PDF rendering
const base64ToBlobUrl = (base64Data: string): string | null => {
  try {
    // Extract the base64 content after the data URL prefix
    const base64Content = base64Data.split(',')[1];
    if (!base64Content) return null;

    // Decode base64 to binary
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Create blob and URL
    const blob = new Blob([bytes], { type: 'application/pdf' });
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error('Failed to convert base64 to blob URL:', e);
    return null;
  }
};

export const DocumentViewer = () => {
  const { documentId, characterId } = useParams();
  const { character } = useCharacter(characterId);
  // Use character's rulesetId if viewing from character path, otherwise use activeRuleset
  const { documents } = useDocuments(character?.rulesetId);
  const navigate = useNavigate();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const isMobileDevice = useIsMobileDevice();

  const document = documents.find((d) => d.id === documentId);

  // Convert PDF data to blob URL when document changes
  useEffect(() => {
    if (document?.pdfData) {
      const url = base64ToBlobUrl(document.pdfData);
      setBlobUrl(url);

      // Cleanup blob URL on unmount or when document changes
      return () => {
        if (url) {
          URL.revokeObjectURL(url);
        }
      };
    } else {
      setBlobUrl(null);
    }
  }, [document?.pdfData]);

  if (!document) {
    return (
      <div className='flex flex-col items-center justify-center h-full gap-4'>
        <p className='text-muted-foreground'>Document not found</p>
        <Button variant='outline' onClick={() => navigate(-1)}>
          <ArrowLeft className='h-4 w-4 mr-2' />
          Go Back
        </Button>
      </div>
    );
  }

  const handleDownload = () => {
    if (!document.pdfData) return;

    const link = window.document.createElement('a');
    link.href = document.pdfData;
    link.download = `${document.title}.pdf`;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  // On mobile/tablet devices, use react-pdf based viewer for better compatibility
  if (isMobileDevice && document.pdfData) {
    return (
      <div className='flex flex-col h-[calc(100vh-2rem)]'>
        {/* Header */}
        <div className='flex items-center gap-4 p-4 border-b'>
          <Button variant='ghost' size='sm' onClick={() => navigate(-1)}>
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <div className='flex-1 min-w-0'>
            <h1 className='text-lg font-semibold truncate'>{document.title}</h1>
            {document.category && (
              <p className='text-sm text-muted-foreground'>{document.category}</p>
            )}
          </div>
        </div>

        {/* Mobile PDF Viewer */}
        <div className='flex-1 min-h-0'>
          <MobileDocumentViewer
            pdfData={document.pdfData}
            title={document.title}
            onDownload={handleDownload}
          />
        </div>

        {/* Description */}
        {document.description && (
          <div className='p-4 border-t'>
            <h2 className='text-sm font-medium mb-2'>Description</h2>
            <p className='text-sm text-muted-foreground'>{document.description}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className='flex flex-col h-[calc(100vh-2rem)]'>
      {/* Header */}
      <div className='flex items-center justify-between p-4 border-b'>
        <div className='flex items-center gap-4'>
          <Button variant='ghost' size='sm' onClick={() => navigate(-1)}>
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <div>
            <h1 className='text-xl font-semibold'>{document.title}</h1>
            {document.category && (
              <p className='text-sm text-muted-foreground'>{document.category}</p>
            )}
          </div>
        </div>
        {document.pdfData && (
          <Button variant='outline' size='sm' onClick={handleDownload}>
            <Download className='h-4 w-4 mr-2' />
            Download
          </Button>
        )}
      </div>

      {/* PDF Viewer */}
      <div className='flex-1 p-4'>
        {blobUrl ? (
          <iframe
            src={blobUrl}
            className='w-full h-full rounded-lg border'
            title={document.title}
          />
        ) : document.pdfData ? (
          <div className='flex items-center justify-center h-full'>
            <p className='text-muted-foreground'>Loading PDF...</p>
          </div>
        ) : (
          <div className='flex items-center justify-center h-full'>
            <p className='text-muted-foreground'>No PDF attached to this document</p>
          </div>
        )}
      </div>

      {/* Description */}
      {document.description && (
        <div className='p-4 border-t'>
          <h2 className='text-sm font-medium mb-2'>Description</h2>
          <p className='text-sm text-muted-foreground'>{document.description}</p>
        </div>
      )}
    </div>
  );
};
