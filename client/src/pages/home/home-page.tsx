import { Navigate } from 'react-router-dom';
import { SelectMenu } from './select-menu';

export const HomePage = () => {
  const lastRulesetId = localStorage.getItem('last-viewed-ruleset-id');

  if (lastRulesetId) {
    return <Navigate to={`/rulesets/${lastRulesetId}/attributes`} />;
  }

  return <SelectMenu />;
};
