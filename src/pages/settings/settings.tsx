import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useActiveRuleset, useCampaign, useCharacter } from '@/lib/compass-api';
import { Clapperboard, NotebookPen, User, UserRoundPen } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CampaignSettings } from './campaign-settings';
import { CharacterSettings } from './character-settings';
import { RulesetSettings } from './ruleset-settings';
import { UserSettings } from './user-settings';

export const Settings = () => {
  const { rulesetId, campaignId } = useParams();
  const { activeRuleset } = useActiveRuleset();
  const { character } = useCharacter();
  const campaign = useCampaign(campaignId);

  const isOnRulesetRoute = Boolean(rulesetId && rulesetId !== 'undefined');
  const isOnCampaignRoute = Boolean(campaignId && campaignId !== 'undefined');

  const [page, setPage] = useState<string>('user');
  const prevParamsRef = useRef({ rulesetId, campaignId });
  const hasSetInitialRef = useRef(false);

  useEffect(() => {
    const paramsChanged =
      prevParamsRef.current.rulesetId !== rulesetId ||
      prevParamsRef.current.campaignId !== campaignId;

    if (!hasSetInitialRef.current || paramsChanged) {
      hasSetInitialRef.current = true;
      prevParamsRef.current = { rulesetId, campaignId };
      if (character) {
        setPage('character');
      } else if (isOnCampaignRoute && campaign) {
        setPage('campaign');
      } else if (isOnRulesetRoute && activeRuleset) {
        setPage('ruleset');
      } else {
        setPage('user');
      }
    } else {
      if (page === 'ruleset' && (!isOnRulesetRoute || !activeRuleset)) {
        setPage('user');
      } else if (page === 'character' && !character) {
        setPage('user');
      } else if (page === 'campaign' && (!isOnCampaignRoute || !campaign)) {
        setPage('user');
      }
    }
  }, [activeRuleset, campaign, character, isOnCampaignRoute, isOnRulesetRoute, page, rulesetId, campaignId]);

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
            {isOnCampaignRoute && campaign && (
              <SidebarMenuItem className={`${page === 'campaign' ? 'text-primary' : ''}`}>
                <SidebarMenuButton asChild onClick={() => setPage('campaign')}>
                  <div>
                    <Clapperboard />
                    <span>{campaign.label ?? 'Campaign'}</span>
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
        {page === 'campaign' && isOnCampaignRoute && campaign && (
          <CampaignSettings activeCampaign={campaign} />
        )}
        {page === 'ruleset' && isOnRulesetRoute && activeRuleset && (
          <RulesetSettings activeRuleset={activeRuleset} />
        )}
        {page === 'character' && character && <CharacterSettings character={character} />}
      </div>
    </div>
  );
};
