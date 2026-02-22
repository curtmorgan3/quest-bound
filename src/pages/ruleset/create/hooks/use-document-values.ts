import { useDocuments } from '@/lib/compass-api';
import type { Document } from '@/types';
import { useEffect, useState } from 'react';

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
    campaignId != null
      ? { campaignId }
      : worldId != null
        ? { worldId }
        : undefined;
  const { documents, createDocument, updateDocument } = useDocuments(options);
  const isEditMode = !!id;

  const activeDocument = documents.find((d) => d.id === id);

  useEffect(() => {
    if (isEditMode && activeDocument) {
      setTitle(activeDocument.title);
      setDescription(activeDocument.description);
      setCategory(activeDocument.category || '');

      setImage(activeDocument.image ?? null);
      setAssetId(activeDocument.assetId ?? null);
      setPdfAssetId(activeDocument.pdfAssetId ?? null);
      setPdfData(activeDocument.pdfData ?? null);
    } else {
      resetAll();
    }
  }, [activeDocument]);

  const [image, setImage] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [pdfAssetId, setPdfAssetId] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<string | null>(null);

  const resetAll = () => {
    setImage(null);
    setAssetId(null);
    setPdfAssetId(null);
    setPdfData(null);
  };

  const documentProperties: Partial<Document> = {
    image,
    assetId,
    pdfAssetId,
    pdfData,
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
        campaignId != null
          ? { ...data, campaignId }
          : worldId
            ? { ...data, worldId }
            : data;
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
  };
};
