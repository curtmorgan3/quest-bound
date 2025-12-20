import { useCurrentUser } from '@/libs/compass-api';
import { Navigate } from 'react-router-dom';
import { SelectMenu } from './select-menu';

export const HomePage = () => {
  const { isCreator } = useCurrentUser();
  const lastRulesetId = localStorage.getItem('last-viewed-ruleset-id');

  if (lastRulesetId && isCreator) {
    return <Navigate to={`/rulesets/${lastRulesetId}/attributes`} />;
  }

  return <SelectMenu />;
};
