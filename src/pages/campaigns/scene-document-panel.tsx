import { Button, Input, Label } from '@/components';
import { CategoryField } from '@/components/composites/category-field';
import { DocumentMarkdownContent } from '@/components/composites/document-markdown-content';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { DocumentLookup, useDocuments } from '@/lib/compass-api';
import type { Document } from '@/types';
import { FileText, Loader2, Pencil, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

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

function DocumentContentView({
  document,
  blobUrl,
}: {
  document: Document;
  blobUrl: string | null;
}) {
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

export interface SceneDocumentPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string | undefined;
  sceneId: string | undefined;
  sceneName?: string;
}

export function SceneDocumentPanel({
  open,
  onOpenChange,
  campaignId,
  sceneId,
  sceneName,
}: SceneDocumentPanelProps) {
  const { documents: sceneDocuments, updateDocument } = useDocuments(
    campaignId && sceneId ? { campaignId, campaignSceneId: sceneId } : undefined,
  );
  const { documents: campaignDocuments } = useDocuments(
    campaignId ? { campaignId } : undefined,
  );
  const sceneDocument = sceneDocuments?.[0];
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editMarkdown, setEditMarkdown] = useState('');
  const [saving, setSaving] = useState(false);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const d of campaignDocuments ?? []) {
      if (d.category?.trim()) set.add(d.category.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [campaignDocuments]);

  useEffect(() => {
    if (!sceneDocument?.pdfData) {
      setBlobUrl(null);
      return;
    }
    const url = base64ToBlobUrl(sceneDocument.pdfData);
    setBlobUrl(url);
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [sceneDocument?.id, sceneDocument?.pdfData]);

  useEffect(() => {
    if (open && sceneDocument) {
      setEditTitle(sceneDocument.title);
      setEditCategory(sceneDocument.category ?? null);
      setEditDescription(sceneDocument.description ?? '');
      setEditMarkdown(sceneDocument.markdownData ?? '');
    }
  }, [open, sceneDocument?.id, sceneDocument?.title, sceneDocument?.category, sceneDocument?.description, sceneDocument?.markdownData]);

  const handleSaveEdit = useCallback(async () => {
    if (!sceneDocument) return;
    setSaving(true);
    try {
      const hasPdf = !!sceneDocument.pdfData || !!sceneDocument.pdfAssetId;
      await updateDocument(sceneDocument.id, {
        title: editTitle.trim(),
        category: editCategory ?? undefined,
        description: editDescription.trim() || undefined,
        ...(hasPdf
          ? {}
          : {
              markdownData: editMarkdown,
              pdfAssetId: null,
              pdfData: null,
            }),
      });
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  }, [sceneDocument, editTitle, editCategory, editDescription, editMarkdown, updateDocument]);

  const handleCancelEdit = useCallback(() => {
    if (sceneDocument) {
      setEditTitle(sceneDocument.title);
      setEditCategory(sceneDocument.category ?? null);
      setEditDescription(sceneDocument.description ?? '');
      setEditMarkdown(sceneDocument.markdownData ?? '');
    }
    setIsEditing(false);
  }, [sceneDocument]);

  const hasScene = Boolean(campaignId && sceneId);
  const hasPdf = Boolean(sceneDocument?.pdfData || sceneDocument?.pdfAssetId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side='right'
        className='flex w-full flex-col gap-0 border-l p-0 sm:max-w-2xl [&>button]:absolute [&>button]:right-4 [&>button]:top-4'>
        <SheetHeader className='shrink-0 border-b px-6 py-4'>
          <SheetTitle className='pr-8'>
            {sceneName ? `${sceneName} — Document` : 'Scene document'}
          </SheetTitle>
          <SheetDescription>
            {sceneDocument
              ? sceneDocument.title
              : hasScene
                ? 'No document linked to this scene.'
                : 'Open a scene to associate a document.'}
          </SheetDescription>
        </SheetHeader>
        <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
          {!hasScene ? (
            <div className='flex flex-1 items-center justify-center p-6 text-muted-foreground'>
              <div className='flex flex-col items-center gap-2'>
                <FileText className='h-12 w-12' />
                <p>Open a scene to associate a document</p>
              </div>
            </div>
          ) : !sceneDocument ? (
            <div className='flex flex-1 flex-col gap-4 overflow-auto p-6'>
              <p className='text-sm text-muted-foreground'>
                Associate a campaign document to this scene.
              </p>
              <DocumentLookup
                campaignId={campaignId}
                label='Document'
                placeholder='Search documents...'
                value={null}
                onSelect={(doc) =>
                  updateDocument(doc.id, {
                    campaignId: campaignId!,
                    campaignSceneId: sceneId!,
                  })
                }
              />
            </div>
          ) : isEditing ? (
            <div className='flex min-h-0 flex-1 flex-col overflow-auto'>
              <div className='flex flex-1 flex-col gap-4 p-6'>
                <div className='grid gap-2'>
                  <Label htmlFor='scene-doc-edit-title'>Title</Label>
                  <Input
                    id='scene-doc-edit-title'
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder='Document title'
                  />
                </div>
                <CategoryField
                  value={editCategory}
                  onChange={setEditCategory}
                  existingCategories={categories}
                  label='Category'
                />
                <div className='grid gap-2'>
                  <Label htmlFor='scene-doc-edit-description'>Description</Label>
                  <Input
                    id='scene-doc-edit-description'
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder='Optional description'
                  />
                </div>
                {hasPdf ? (
                  <p className='text-sm text-muted-foreground'>
                    This document has a PDF. Content cannot be edited here; edit it from the
                    campaign documents page.
                  </p>
                ) : (
                  <div className='grid gap-2'>
                    <Label>Content (markdown)</Label>
                    <DocumentMarkdownContent
                      value={editMarkdown}
                      onChange={setEditMarkdown}
                      mode='edit'
                      onSave={handleSaveEdit}
                      placeholder='No content.'
                    />
                  </div>
                )}
              </div>
              <div className='shrink-0 flex gap-2 border-t px-6 py-4'>
                <Button variant='outline' onClick={handleCancelEdit} className='gap-1'>
                  <X className='h-4 w-4' />
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit} disabled={saving} className='gap-1'>
                  {saving ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : null}
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className='shrink-0 flex items-center justify-between gap-2 border-b px-6 py-2'>
                <span className='text-sm text-muted-foreground truncate min-w-0'>
                  {sceneDocument.title}
                </span>
                <div className='flex shrink-0 gap-1'>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => setIsEditing(true)}
                    aria-label='Edit document'
                    data-testid='scene-doc-edit-btn'>
                    <Pencil className='h-4 w-4' />
                  </Button>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() =>
                      updateDocument(sceneDocument.id, {
                        campaignSceneId: null,
                      })
                    }>
                    Unlink
                  </Button>
                </div>
              </div>
              <DocumentContentView
                document={sceneDocument}
                blobUrl={blobUrl}
              />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
