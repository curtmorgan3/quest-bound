import { useDocuments } from '@/lib/compass-api';
import type { Document } from '@/types';
import { useEffect, useMemo, useState } from 'react';

interface UseDocumentValueProps {
  id?: string;
  baseProperties: {
    title: string;
    description: string;
    category: string;
  };
  onCreate?: () => void;
  setTitle: (title: string) => void;
  setDescription: (description: string) => void;
  setCategory: (category: string) => void;
  /** When set, documents are scoped to this world (create/list use worldId). */
  worldId?: string;
  /** When set, documents are scoped to this campaign (create/list use campaignId). */
  campaignId?: string;
}

export const useDocumentValues = ({
  id = '',
  baseProperties,
  onCreate,
  setTitle,
  setDescription,
  setCategory,
  worldId,
  campaignId,
}: UseDocumentValueProps) => {
  const options =
    campaignId != null ? { campaignId } : worldId != null ? { worldId } : undefined;
  const { documents, createDocument, updateDocument } = useDocuments(options);
  const isEditMode = !!id;

  /** Only changes when the loaded row changes, not when `documents` emits a new array reference. */
  const hydrateKey = useMemo(() => {
    if (!isEditMode || !id) return 'create';
    const d = documents.find((x) => x.id === id);
    return d ? `${d.id}:${d.updatedAt}` : `pending:${id}`;
  }, [isEditMode, id, documents]);

  const [image, setImage] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [pdfAssetId, setPdfAssetId] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<string | null>(null);
  const [order, setOrder] = useState(0);

  const resetAll = () => {
    setImage(null);
    setAssetId(null);
    setPdfAssetId(null);
    setPdfData(null);
    setOrder(0);
  };

  useEffect(() => {
    if (isEditMode && id) {
      const doc = documents.find((d) => d.id === id);
      if (!doc) return;
      setTitle(doc.title);
      setDescription(doc.description);
      setCategory(doc.category || '');

      setImage(doc.image ?? null);
      setAssetId(doc.assetId ?? null);
      setPdfAssetId(doc.pdfAssetId ?? null);
      setPdfData(doc.pdfData ?? null);
      setOrder(doc.order ?? 0);
    } else if (!isEditMode) {
      resetAll();
    }
  }, [hydrateKey]);

  const documentProperties: Partial<Document> = {
    image,
    assetId,
    pdfAssetId,
    pdfData,
    order,
    // Enforce either PDF or markdown: when saving with PDF, clear markdown
    ...(pdfData || pdfAssetId ? { markdownData: null } : {}),
  };

  const saveDocument = () => {
    const data = {
      ...baseProperties,
      ...documentProperties,
    };

    if (isEditMode) {
      updateDocument(id, data);
    } else {
      const createData =
        campaignId != null ? { ...data, campaignId } : worldId ? { ...data, worldId } : data;
      createDocument(createData);
      resetAll();
    }

    onCreate?.();
  };

  return {
    saveDocument,
    image,
    assetId,
    pdfAssetId,
    pdfData,
    setImage,
    setAssetId,
    setPdfAssetId,
    setPdfData,
    order,
    setOrder,
  };
};
