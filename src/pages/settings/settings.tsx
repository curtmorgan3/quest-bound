import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useActiveRuleset, useCharacter } from '@/lib/compass-api';
import { NotebookPen, User, UserRoundPen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CharacterSettings } from './character-settings';
import { RulesetSettings } from './ruleset-settings';
import { UserSettings } from './user-settings';

export const Settings = () => {
  const { rulesetId } = useParams();
  const { activeRuleset } = useActiveRuleset();
  const { character } = useCharacter();

  const isOnRulesetRoute = Boolean(rulesetId && rulesetId !== 'undefined');

  const [page, setPage] = useState<string>('user');

  useEffect(() => {
    if (character) {
      setPage('character');
    } else if (isOnRulesetRoute && activeRuleset) {
      setPage('ruleset');
    } else if (page === 'ruleset' && !isOnRulesetRoute) {
      setPage('user');
    }
  }, [activeRuleset, character, isOnRulesetRoute, setPage]);

  return (
    <div className='p-4 min-h-[90vh]'>
      <Sidebar>
        <SidebarContent className='w-[200px] p-4'>
          <SidebarMenu>
            {character && (
              <SidebarMenuItem className={`${page === 'character' ? 'text-primary' : ''}`}>
                <SidebarMenuButton asChild onClick={() => setPage('character')}>
                  <div>
                    <UserRoundPen />
                    <span>{character.name}</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {isOnRulesetRoute && activeRuleset && (
              <SidebarMenuItem className={`${page === 'ruleset' ? 'text-primary' : ''}`}>
                <SidebarMenuButton asChild onClick={() => setPage('ruleset')}>
                  <div>
                    <NotebookPen />
                    <span>{activeRuleset.title}</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            <SidebarMenuItem className={`${page === 'user' ? 'text-primary' : ''}`}>
              <SidebarMenuButton asChild onClick={() => setPage('user')}>
                <div>
                  <User />
                  <span>User</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <div className='flex flex-col p-4 gap-4 ml-[200px] h-[1000px] overflow-scroll'>
        {page === 'user' && <UserSettings />}
        {page === 'ruleset' && isOnRulesetRoute && activeRuleset && (
          <RulesetSettings activeRuleset={activeRuleset} />
        )}
        {page === 'character' && character && <CharacterSettings character={character} />}
      </div>
    </div>
  );
};
