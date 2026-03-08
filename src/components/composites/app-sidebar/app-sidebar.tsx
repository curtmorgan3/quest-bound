import {
  Dices,
  FolderOpen,
  HelpCircle,
  Settings as SettingsIcon,
  User,
  Wrench,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { useActiveRuleset, useUsers } from '@/lib/compass-api';
import { Settings } from '@/pages';
import { DiceContext } from '@/stores';
import { useContext, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { DialogDescription } from '../../ui/dialog';
import { Drawer, DrawerContent, DrawerTrigger } from '../../ui/drawer';
import { CampaignSidebar } from './campaign-sidebar';
import { CharacterSidebar } from './character-sidebar';
import { RulesetSidebar } from './ruleset-sidebar';

function docsPageFromRoute(path: string): string {
  if (path.includes('/rulesets') && !path.includes('/characters')) {
    if (path.includes('/attributes')) return 'attributes';
    if (path.includes('/actions')) return 'actions';
    if (path.includes('/items')) return 'items';
    if (path.includes('/documents')) return 'documents';
    if (path.includes('/charts')) return 'charts';
    if (path.includes('/windows')) return 'windows';
    if (path.includes('/pages')) return 'pages';
    if (path.includes('/scripts')) return 'scripts';
    if (path.includes('/archetypes')) return 'archetypes';
    return 'rulesets';
  }
  if (path.includes('/characters')) {
    if (path.includes('/documents') || path.includes('/chart/'))
      return path.includes('/chart/') ? 'charts' : 'documents';
    return 'characters';
  }
  return 'rulesets';
}

export function AppSidebar() {
  const { currentUser } = useUsers();
  const { open, setOpen } = useSidebar();
  const location = useLocation();
  const { setDicePanelOpen } = useContext(DiceContext);
  const { activeRuleset } = useActiveRuleset();

  const isLandingRoute = location.pathname.startsWith('/landing/');
  const isHomepage =
    location.pathname === '/rulesets' ||
    location.pathname === '/characters' ||
    location.pathname === '/campaigns';

  const isCharacterRoute = location.pathname.startsWith('/characters/');

  const isDevTools = location.pathname.startsWith('/dev');

  const isCampaignsRoute =
    location.pathname.startsWith('/campaigns/') && location.pathname !== '/campaigns/new';

  const title =
    location.pathname === '/rulesets' || !activeRuleset?.title
      ? 'Quest Bound'
      : activeRuleset.title;

  useEffect(() => {
    const storedState = localStorage.getItem('qb.sidebarCollapsed');
    if (storedState !== null) {
      setOpen(storedState === 'false');
    }
  }, [setOpen]);

  const helpDocsUrl = `https://docs.questbound.com/docs/${docsPageFromRoute(location.pathname)}`;

  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    setSettingsOpen(false);
  }, [location.pathname]);

  const sidebarContent = isLandingRoute ? null : isCharacterRoute ? (
    <CharacterSidebar />
  ) : isCampaignsRoute ? (
    <CampaignSidebar />
  ) : isDevTools ? null : (
    <RulesetSidebar />
  );

  return (
    <Drawer direction='bottom' open={settingsOpen} onOpenChange={setSettingsOpen}>
      <Sidebar collapsible='icon'>
        <SidebarGroup>
          <div className='flex items-center justify-left'>
            <SidebarGroupLabel>{title}</SidebarGroupLabel>
            {open && (
              <SidebarTrigger onClick={() => localStorage.setItem('qb.sidebarCollapsed', 'true')} />
            )}
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {!open && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <SidebarTrigger
                      onClick={() => localStorage.setItem('qb.sidebarCollapsed', 'false')}
                    />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarContent>{sidebarContent}</SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to={`/rulesets`} data-testid='nav-home'>
                  <FolderOpen className='w-4 h-4' />
                  <span>Open</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {!isHomepage && (
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setDicePanelOpen(true)} data-testid='nav-dice'>
                  <Dices />
                  <span>Dice</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            <SidebarMenuItem>
              <DrawerTrigger asChild>
                <SidebarMenuButton>
                  <SettingsIcon />
                  <span>Settings</span>
                </SidebarMenuButton>
              </DrawerTrigger>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <a
                  href={helpDocsUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                  data-testid='nav-help'>
                  <HelpCircle />
                  <span>Help</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {localStorage.getItem('dev.tools') === 'true' && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to='/dev-tools'>
                    <Wrench />
                    <span>Dev Tools</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
          <div
            className={`p-${open ? 2 : 0} pb-2 flex items-center gap-2`}
            data-testid='user-menu'>
            <Avatar className={open ? 'rounded-lg' : 'rounded-sm'}>
              <AvatarImage src={currentUser?.image ?? ''} alt={currentUser?.username} />
              <AvatarFallback>
                <User className='size-4 text-muted-foreground' />
              </AvatarFallback>
            </Avatar>
            {open && <p>{currentUser?.username}</p>}
          </div>
        </SidebarFooter>
      </Sidebar>

      <DrawerContent className='w-[100vw]'>
        <DialogDescription className='hidden'>Settings</DialogDescription>
        <Settings />
      </DrawerContent>
    </Drawer>
  );
}
