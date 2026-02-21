import { Button } from '@/components';
import { DocumentMarkdownContent, type DocumentMarkdownMode } from '@/components/composites/document-markdown-content';
import { useDocuments } from '@/lib/compass-api';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface MarkdownEditorPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string | null;
  mode: DocumentMarkdownMode;
  /** When provided, document is resolved from this ruleset (e.g. when not in character context). */
  rulesetId?: string;
}

export function MarkdownEditorPanel({
  open,
  onOpenChange,
  documentId,
  mode,
  rulesetId,
}: MarkdownEditorPanelProps) {
  const { documents, updateDocument } = useDocuments(rulesetId);
  const document = documentId ? documents.find((d) => d.id === documentId) : undefined;
  const [localValue, setLocalValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && document) {
      setLocalValue(document.markdownData ?? '');
    }
  }, [open, document?.id, document?.markdownData]);

  const handleSave = useCallback(async () => {
    if (!documentId || !document || mode !== 'edit') return;
    setSaving(true);
    try {
      await updateDocument(documentId, {
        markdownData: localValue,
        pdfAssetId: null,
        pdfData: null,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }, [documentId, document, mode, localValue, updateDocument, onOpenChange]);

  const handleChange = useCallback((value: string) => {
    setLocalValue(value);
  }, []);

  const isEdit = mode === 'edit';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-4 border-l p-0 sm:max-w-lg [&>button]:absolute [&>button]:right-4 [&>button]:top-4">
        <SheetHeader className="shrink-0 border-b px-6 py-4">
          <SheetTitle>{document?.title ?? 'Document'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Edit markdown content. PDF will be removed if this document currently has one.'
              : 'View markdown content.'}
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-6">
          {!document && documentId ? (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : document ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-auto">
              <DocumentMarkdownContent
                value={isEdit ? localValue : (document.markdownData ?? '')}
                onChange={isEdit ? handleChange : undefined}
                mode={mode}
                onSave={isEdit ? handleSave : undefined}
                placeholder="No content."
              />
            </div>
          ) : null}
        </div>
        {isEdit && document && (
          <div className="shrink-0 border-t px-6 py-4">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full gap-2">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Save
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
