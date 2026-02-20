import {
  Dices,
  FolderOpen,
  Handbag,
  HelpCircle,
  Settings as SettingsIcon,
  User,
  UserPlus,
  Wrench,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useCharacter, useUsers } from '@/lib/compass-api';
import { Settings } from '@/pages';
import {
  CharacterArchetypesPanelContext,
  CharacterInventoryPanelContext,
  DiceContext,
} from '@/stores';
import { useContext, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Button } from '../../ui/button';
import { DialogDescription } from '../../ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '../../ui/drawer';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { CampaignSidebar } from './campaign-sidebar';
import { CharacterSidebar } from './character-sidebar';
import { RulesetSidebar } from './ruleset-sidebar';
import { WorldSidebar } from './world-sidebar';

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
  if (path.includes('/worlds')) return 'worlds';
  return 'rulesets';
}

export function AppSidebar() {
  const { currentUser, signOut } = useUsers();
  const { character } = useCharacter();
  const { open, setOpen } = useSidebar();
  const location = useLocation();
  const characterInventoryPanel = useContext(CharacterInventoryPanelContext);
  const characterArchetypesPanel = useContext(CharacterArchetypesPanelContext);
  const { setDicePanelOpen } = useContext(DiceContext);

  const isHomepage =
    location.pathname === '/rulesets' ||
    location.pathname === '/characters' ||
    location.pathname === '/worlds' ||
    location.pathname === '/campaigns';
  const isWorldsRoute = location.pathname.startsWith('/worlds/');
  const isCampaignsRoute = location.pathname.startsWith('/campaigns');

  useEffect(() => {
    const storedState = localStorage.getItem('qb.sidebarCollapsed');
    if (storedState !== null) {
      setOpen(storedState === 'false');
    }
  }, [setOpen]);

  const helpDocsUrl = `https://docs.questbound.com/docs/${docsPageFromRoute(location.pathname)}`;

  const sidebarContent = character ? (
    <CharacterSidebar />
  ) : isWorldsRoute ? (
    <WorldSidebar />
  ) : isCampaignsRoute ? (
    <CampaignSidebar />
  ) : (
    <RulesetSidebar />
  );

  return (
    <Drawer direction='bottom'>
      <Sidebar collapsible='icon'>
        <SidebarContent>{sidebarContent}</SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            {!isHomepage && (
              <>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to='/rulesets' data-testid='nav-open'>
                      <FolderOpen />
                      <span>Open</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => setDicePanelOpen(true)} data-testid='nav-dice'>
                    <Dices />
                    <span>Dice</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {character && characterInventoryPanel && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => characterInventoryPanel.setOpen(true)}
                      data-testid='nav-character-inventory'>
                      <Handbag className='w-4 h-4' />
                      <span>Inventory</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {character && characterArchetypesPanel && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => characterArchetypesPanel.setOpen(true)}
                      data-testid='nav-character-archetypes'>
                      <UserPlus className='w-4 h-4' />
                      <span>Archetypes</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </>
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
          <Popover>
            <PopoverTrigger asChild>
              <div
                className={`p-${open ? 2 : 0} pb-2 flex items-center gap-2 cursor-pointer`}
                data-testid='user-menu'>
                <Avatar className={open ? 'rounded-lg' : 'rounded-sm'}>
                  <AvatarImage src={currentUser?.image ?? ''} alt={currentUser?.username} />
                  <AvatarFallback>
                    <User className='size-4 text-muted-foreground' />
                  </AvatarFallback>
                </Avatar>
                {open && <p>{currentUser?.username}</p>}
              </div>
            </PopoverTrigger>
            <PopoverContent>
              <div className='w-40 flex justify-center'>
                <Button variant='link' onClick={signOut} data-testid='sign-out'>
                  Sign out
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </SidebarFooter>
      </Sidebar>

      <DrawerContent className='w-[100vw]'>
        <DialogDescription className='hidden'>Settings</DialogDescription>
        <DrawerHeader>
          <DrawerTitle className='mb-4 text-lg font-medium'>Settings</DrawerTitle>
        </DrawerHeader>
        <Settings />
      </DrawerContent>
    </Drawer>
  );
}
