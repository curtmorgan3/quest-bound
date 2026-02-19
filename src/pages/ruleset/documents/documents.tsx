import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components';
import { useActiveRuleset, useDocuments } from '@/lib/compass-api';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PreviewCard } from '../components';

interface DocumentChartProps {
  onEditDetails?: (id: string) => void;
}

const ALL_CATEGORIES = 'all';

export const Documents = ({ onEditDetails }: DocumentChartProps) => {
  const { documents, deleteDocument, updateDocument } = useDocuments();
  const { activeRuleset } = useActiveRuleset();
  const navigate = useNavigate();
  const [filterValue, setFilterValue] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);

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
          onChange={(e) => setFilterValue(e.target.value)}
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
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
          const hasPdf = !!doc.pdfData;
          return (
            <PreviewCard
              key={doc.id}
              id={doc.id}
              title={doc.title}
              type='documents'
              category={doc.category}
              image={doc.image}
              titleClassName={doc.moduleId ? 'text-module-origin' : undefined}
              descriptionExtra={
                hasPdf ? <span className='text-xs text-primary'>PDF attached</span> : undefined
              }
              openDisabled={!hasPdf}
              onDelete={() => deleteDocument(doc.id)}
              onOpen={() => navigate(`/rulesets/${activeRuleset?.id}/documents/${doc.id}`)}
              onEdit={(title, category) => updateDocument(doc.id, { title, category })}
              onEditDetails={onEditDetails ? () => onEditDetails(doc.id) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
};
