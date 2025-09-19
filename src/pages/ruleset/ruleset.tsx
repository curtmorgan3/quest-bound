import { useRulesets } from '@/lib/compass-api';
import { useAttributes } from '@/lib/compass-api/hooks/rulesets/use-attributes';
import type { Attribute } from '@/types';
import { Navigate } from 'react-router-dom';
import { QuickCreate } from './quick-create';

export const Ruleset = ({ page }: { page?: 'attributes' | 'items' | 'actions' | 'charts' }) => {
  const { activeRuleset } = useRulesets();

  const { attributes, createAttribute } = useAttributes();

  console.log(attributes);

  const onCreate = (data: Partial<Attribute>) => {
    createAttribute(data);
  };

  if (!page) {
    return <Navigate to={`/rulesets/${activeRuleset?.id}/attributes`} replace={true} />;
  }

  return (
    <div className='flex flex-col p-4 gap-4'>
      <QuickCreate type={page} onCreate={onCreate} />
    </div>
  );
};
