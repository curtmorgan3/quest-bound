import { Input } from '@/components';
import { useActiveRuleset, useDocuments } from '@/lib/compass-api';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DocumentPreviewCard } from './document-preview-card';

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
        {filteredDocuments.map((doc) => (
          <DocumentPreviewCard
            key={doc.id}
            document={doc}
            onDelete={() => deleteDocument(doc.id)}
            onOpen={() => navigate(`/rulesets/${activeRuleset?.id}/documents/${doc.id}`)}
            onEdit={(title, category) => updateDocument(doc.id, { title, category })}
            onEditDetails={onEditDetails ? () => onEditDetails(doc.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
};
