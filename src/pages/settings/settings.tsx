import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useActiveRuleset, useCharacter, useWorld } from '@/lib/compass-api';
import { Globe, NotebookPen, User, UserRoundPen } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CharacterSettings } from './character-settings';
import { RulesetSettings } from './ruleset-settings';
import { UserSettings } from './user-settings';
import { WorldSettings } from './world-settings';

export const Settings = () => {
  const { rulesetId, worldId } = useParams();
  const { activeRuleset } = useActiveRuleset();
  const { character } = useCharacter();
  const world = useWorld(worldId);

  const isOnRulesetRoute = Boolean(rulesetId && rulesetId !== 'undefined');
  const isOnWorldRoute = Boolean(worldId && worldId !== 'undefined');

  const [page, setPage] = useState<string>('user');
  const prevParamsRef = useRef({ rulesetId, worldId });
  const hasSetInitialRef = useRef(false);

  useEffect(() => {
    const paramsChanged =
      prevParamsRef.current.rulesetId !== rulesetId ||
      prevParamsRef.current.worldId !== worldId;

    if (!hasSetInitialRef.current || paramsChanged) {
      hasSetInitialRef.current = true;
      prevParamsRef.current = { rulesetId, worldId };
      if (character) {
        setPage('character');
      } else if (isOnRulesetRoute && activeRuleset) {
        setPage('ruleset');
      } else if (isOnWorldRoute && world) {
        setPage('world');
      } else {
        setPage('user');
      }
    } else {
      if (page === 'ruleset' && (!isOnRulesetRoute || !activeRuleset)) {
        setPage('user');
      } else if (page === 'world' && (!isOnWorldRoute || !world)) {
        setPage('user');
      } else if (page === 'character' && !character) {
        setPage('user');
      }
    }
  }, [
    activeRuleset,
    character,
    isOnRulesetRoute,
    isOnWorldRoute,
    page,
    rulesetId,
    worldId,
    world,
  ]);

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
            {isOnWorldRoute && world && (
              <SidebarMenuItem className={`${page === 'world' ? 'text-primary' : ''}`}>
                <SidebarMenuButton asChild onClick={() => setPage('world')}>
                  <div>
                    <Globe />
                    <span>{world.label}</span>
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
        {page === 'world' && world && <WorldSettings world={world} />}
      </div>
    </div>
  );
};
