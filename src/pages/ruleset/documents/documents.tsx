import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components';
import { useActiveRuleset, useDocuments } from '@/lib/compass-api';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRulesetFiltersStore } from '@/stores/ruleset-filters-store';
import { PreviewCard } from '../components';
import { useListFilterParams } from '../utils/list-filter-query-params';
import { MarkdownEditorPanel } from './markdown-editor-panel';

interface DocumentChartProps {
  onEditDetails?: (id: string) => void;
  /** When set, show and create documents for this world instead of the active ruleset. */
  worldId?: string;
  /** When set, show and create documents for this campaign. */
  campaignId?: string;
}

const ALL_CATEGORIES = 'all';

export const Documents = ({ onEditDetails, worldId, campaignId }: DocumentChartProps) => {
  const options =
    campaignId != null
      ? { campaignId }
      : worldId != null
        ? { worldId }
        : undefined;
  const { documents, deleteDocument, updateDocument } = useDocuments(options);
  const { activeRuleset } = useActiveRuleset();
  const navigate = useNavigate();
  const documentOpenUrl = campaignId
    ? (docId: string) => `/campaigns/${campaignId}/documents/${docId}`
    : worldId
      ? (docId: string) => `/worlds/${worldId}/documents/${docId}`
      : (docId: string) => `/rulesets/${activeRuleset?.id}/documents/${docId}`;
  const [searchParams] = useSearchParams();
  const { title: filterValue, category: categoryFilter, setTitle: setFilterValue, setCategory: setCategoryFilter } =
    useListFilterParams();
  const setListFilters = useRulesetFiltersStore((s) => s.setListFilters);
  const [markdownPanelDocumentId, setMarkdownPanelDocumentId] = useState<string | null>(null);
  const [markdownPanelOpen, setMarkdownPanelOpen] = useState(false);

  const isRulesetContext = worldId == null && campaignId == null;
  const rulesetId = isRulesetContext ? activeRuleset?.id : undefined;

  useEffect(() => {
    if (!rulesetId) return;
    setListFilters(rulesetId, 'documents', {
      title: searchParams.get('title') ?? undefined,
      category: searchParams.get('category') ?? undefined,
    });
  }, [rulesetId, searchParams, setListFilters]);

  const handleTitleChange = (value: string) => {
    setFilterValue(value);
    if (rulesetId) setListFilters(rulesetId, 'documents', { title: value || null });
  };

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    if (rulesetId) setListFilters(rulesetId, 'documents', { category: value === ALL_CATEGORIES ? null : value });
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const d of documents) {
      if (d.category?.trim()) set.add(d.category.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [documents]);

  const sortedDocuments = [...documents].sort((a, b) => a.title.localeCompare(b.title));
  const filteredDocuments = sortedDocuments.filter((d) => {
    const matchesText = d.title.toLowerCase().includes(filterValue.toLowerCase());
    const matchesCategory =
      categoryFilter === ALL_CATEGORIES || d.category?.trim() === categoryFilter;
    return matchesText && matchesCategory;
  });

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-wrap items-center gap-2'>
        <Input
          className='max-w-md'
          data-testid='preview-filter'
          placeholder='Filter by title'
          value={filterValue}
          onChange={(e) => handleTitleChange(e.target.value)}
        />
        <Select value={categoryFilter} onValueChange={handleCategoryChange}>
          <SelectTrigger className='w-[180px]' data-testid='category-filter'>
            <SelectValue placeholder='Category' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className='flex gap-2 flex-wrap'>
        {filteredDocuments.map((doc) => {
          const hasPdf = !!doc.pdfData || !!doc.pdfAssetId;
          const hasMarkdown = !!doc.markdownData;
          const canOpen = hasPdf || hasMarkdown;
          const canEditMarkdown = !hasPdf; // Either add or edit markdown when no PDF
          const descriptionExtra = hasPdf ? (
            <span className='text-xs text-primary'>PDF</span>
          ) : hasMarkdown ? (
            <span className='text-xs text-primary'>Markdown</span>
          ) : undefined;
          return (
            <PreviewCard
              key={doc.id}
              id={doc.id}
              title={doc.title}
              type='documents'
              category={doc.category}
              image={doc.image}
              titleClassName={doc.moduleId ? 'text-module-origin' : undefined}
              descriptionExtra={descriptionExtra}
              openDisabled={!canOpen}
              existingCategories={categories}
              onDelete={() => deleteDocument(doc.id)}
              onOpen={() => navigate(documentOpenUrl(doc.id))}
              onEdit={(title, category) => updateDocument(doc.id, { title, category })}
              onEditDetails={onEditDetails ? () => onEditDetails(doc.id) : undefined}
              onEditMarkdown={
                canEditMarkdown
                  ? () => {
                      setMarkdownPanelDocumentId(doc.id);
                      setMarkdownPanelOpen(true);
                    }
                  : undefined
              }
            />
          );
        })}
      </div>
      <MarkdownEditorPanel
        open={markdownPanelOpen}
        onOpenChange={(open) => {
          setMarkdownPanelOpen(open);
          if (!open) setMarkdownPanelDocumentId(null);
        }}
        documentId={markdownPanelDocumentId}
        mode='edit'
        rulesetId={worldId || campaignId ? undefined : activeRuleset?.id}
        worldId={worldId}
        campaignId={campaignId}
      />
    </div>
  );
};
