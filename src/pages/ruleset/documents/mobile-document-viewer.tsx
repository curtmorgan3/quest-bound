import { Button } from '@/components';
import { ChevronLeft, ChevronRight, Download, Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface MobileDocumentViewerProps {
  pdfData: string;
  title: string;
  onDownload: () => void;
}

export const MobileDocumentViewer = ({
  pdfData,
  title,
  onDownload,
}: MobileDocumentViewerProps) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('Error loading PDF:', error);
    setError('Failed to load PDF. Please try downloading it instead.');
    setIsLoading(false);
  };

  const goToPreviousPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages || 1));
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3.0));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  if (error) {
    return (
      <div className='flex flex-col items-center justify-center h-full gap-4 p-4'>
        <p className='text-muted-foreground text-center'>{error}</p>
        <Button variant='outline' onClick={onDownload}>
          <Download className='h-4 w-4 mr-2' />
          Download PDF
        </Button>
      </div>
    );
  }

  return (
    <div className='flex flex-col h-full'>
      {/* Controls */}
      <div className='flex items-center justify-between p-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
        {/* Page Navigation */}
        <div className='flex items-center gap-1'>
          <Button
            variant='ghost'
            size='icon'
            onClick={goToPreviousPage}
            disabled={pageNumber <= 1}
            className='h-8 w-8'
          >
            <ChevronLeft className='h-4 w-4' />
          </Button>
          <span className='text-sm min-w-[60px] text-center'>
            {numPages ? `${pageNumber} / ${numPages}` : '...'}
          </span>
          <Button
            variant='ghost'
            size='icon'
            onClick={goToNextPage}
            disabled={!numPages || pageNumber >= numPages}
            className='h-8 w-8'
          >
            <ChevronRight className='h-4 w-4' />
          </Button>
        </div>

        {/* Zoom Controls */}
        <div className='flex items-center gap-1'>
          <Button
            variant='ghost'
            size='icon'
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className='h-8 w-8'
          >
            <ZoomOut className='h-4 w-4' />
          </Button>
          <span className='text-sm min-w-[50px] text-center'>
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant='ghost'
            size='icon'
            onClick={zoomIn}
            disabled={scale >= 3.0}
            className='h-8 w-8'
          >
            <ZoomIn className='h-4 w-4' />
          </Button>
        </div>

        {/* Download */}
        <Button variant='ghost' size='icon' onClick={onDownload} className='h-8 w-8'>
          <Download className='h-4 w-4' />
        </Button>
      </div>

      {/* PDF Viewer */}
      <div className='flex-1 overflow-auto'>
        <div className='flex justify-center p-4'>
          {isLoading && (
            <div className='absolute inset-0 flex items-center justify-center bg-background/50'>
              <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
            </div>
          )}
          <Document
            file={pdfData}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className='flex items-center justify-center h-64'>
                <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
              </div>
            }
            className='max-w-full'
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              loading={
                <div className='flex items-center justify-center h-64'>
                  <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
                </div>
              }
              className='shadow-lg rounded-lg overflow-hidden'
            />
          </Document>
        </div>
      </div>
    </div>
  );
};
