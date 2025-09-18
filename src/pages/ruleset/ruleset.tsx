import { useRulesets } from '@/lib/compass-api';
import { Navigate } from 'react-router-dom';

export const Ruleset = ({ page }: { page?: string }) => {
  const { activeRuleset } = useRulesets();

  if (!page) {
    return <Navigate to={`/rulesets/${activeRuleset?.id}/attributes`} replace={true} />;
  }

  console.log(activeRuleset);
  return <div>Ruleset Page: {page}</div>;
};
