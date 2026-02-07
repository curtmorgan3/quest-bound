import { Input } from '@/components';
import { useActiveRuleset, useDocuments } from '@/lib/compass-api';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PreviewCard } from '../components';

interface DocumentChartProps {
  onEditDetails?: (id: string) => void;
}

export const Documents = ({ onEditDetails }: DocumentChartProps) => {
  const { documents, deleteDocument, updateDocument } = useDocuments();
  const { activeRuleset } = useActiveRuleset();
  const navigate = useNavigate();
  const [filterValue, setFilterValue] = useState('');

  const sortedDocuments = [...documents].sort((a, b) => a.title.localeCompare(b.title));
  const filteredDocuments = sortedDocuments.filter(
    (d) =>
      d.title.toLowerCase().includes(filterValue.toLowerCase()) ||
      d.category?.toLowerCase().includes(filterValue.toLowerCase()),
  );

  return (
    <div className='flex flex-col gap-4'>
      <Input
        className='max-w-md'
        data-testid='preview-filter'
        placeholder='Filter by title or category...'
        value={filterValue}
        onChange={(e) => setFilterValue(e.target.value)}
      />
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
