import {
  AppWindow,
  ArrowLeft,
  BookOpen,
  Dices,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  HandFist,
  HelpCircle,
  Newspaper,
  Settings as SettingsIcon,
  Sword,
  UserRoundPen,
  Users,
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
import {
  useActiveRuleset,
  useCharacter,
  useCharts,
  useDocuments,
  useUsers,
} from '@/lib/compass-api';
import { DevTools, Settings } from '@/pages';
import { DiceContext } from '@/stores';
import { useContext, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Avatar, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { DialogDescription } from '../ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '../ui/drawer';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

export function AppSidebar() {
  const { currentUser, signOut } = useUsers();
  const { activeRuleset } = useActiveRuleset();
  const { character } = useCharacter();
  const { documents } = useDocuments(character?.rulesetId);
  const { charts } = useCharts(character?.rulesetId);
  const { open, setOpen } = useSidebar();
  const { rulesetId, characterId } = useParams();
  const location = useLocation();
  const { documentId, chartId } = useParams<{ documentId?: string; chartId?: string }>();
  const isHomepage = location.pathname === '/rulesets' || location.pathname === '/characters';
  const isViewingDocument = !!documentId && location.pathname.includes('/documents/');
  const isViewingChart = !!chartId && location.pathname.includes('/chart/');
  const [drawerContent, setDrawerContent] = useState<'settings' | 'dev-tools'>('settings');
  const { setDicePanelOpen } = useContext(DiceContext);

  useEffect(() => {
    const storedState = localStorage.getItem('qb.sidebarCollapsed');
    if (storedState !== null) {
      setOpen(storedState === 'false');
    }
  }, []);

  const homepageItems = [
    {
      title: 'Rulesets',
      url: '/rulesets',
      icon: BookOpen,
    },
    {
      title: 'Characters',
      url: '/characters',
      icon: Users,
    },
  ];

  const rulesetItems = isHomepage
    ? homepageItems
    : [
        {
          title: 'Attributes',
          url: `/rulesets/${activeRuleset?.id}/attributes`,
          icon: UserRoundPen,
        },
        {
          title: 'Actions',
          url: `/rulesets/${activeRuleset?.id}/actions`,
          icon: HandFist,
        },
        {
          title: 'Items',
          url: `/rulesets/${activeRuleset?.id}/items`,
          icon: Sword,
        },
        {
          title: 'Charts',
          url: `/rulesets/${activeRuleset?.id}/charts`,
          icon: FileSpreadsheet,
        },
        {
          title: 'Documents',
          url: `/rulesets/${activeRuleset?.id}/documents`,
          icon: Newspaper,
        },
        {
          title: 'Windows',
          url: `/rulesets/${activeRuleset?.id}/windows`,
          icon: AppWindow,
        },
      ];

  const items = character ? [] : rulesetItems;

  const sortedDocuments = [...documents].sort((a, b) => a.title.localeCompare(b.title));
  const sortedCharts = [...charts].sort((a, b) => a.title.localeCompare(b.title));

  const docsPageFromRoute = (): string => {
    const path = location.pathname;
    if (path.includes('/rulesets') && !path.includes('/characters')) {
      if (path.includes('/attributes')) return 'attributes';
      if (path.includes('/actions')) return 'actions';
      if (path.includes('/items')) return 'items';
      if (path.includes('/documents')) return 'documents';
      if (path.includes('/charts')) return 'charts';
      return 'rulesets';
    }
    if (path.includes('/characters')) {
      if (path.includes('/documents') || path.includes('/chart/'))
        return path.includes('/chart/') ? 'charts' : 'documents';
      return 'characters';
    }
    return 'rulesets';
  };

  const helpDocsUrl = `https://v2.docs.questbound.com/docs/${docsPageFromRoute()}`;
  const title =
    (rulesetId ?? characterId)
      ? (character?.name ?? activeRuleset?.title ?? 'Quest Bound')
      : 'Quest Bound';

  return (
    <Drawer direction='bottom'>
      <Sidebar collapsible='icon'>
        <SidebarContent>
          <SidebarGroup>
            <div className='flex items-center justify-left'>
              <SidebarGroupLabel>{title}</SidebarGroupLabel>
              {open && (
                <SidebarTrigger
                  onClick={() => localStorage.setItem('qb.sidebarCollapsed', 'true')}
                />
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
                {items.map((item) => (
                  <SidebarMenuItem
                    key={item.title}
                    className={`${location.pathname.includes(item.title.toLowerCase()) ? 'text-primary' : ''}`}>
                    <SidebarMenuButton asChild>
                      <Link to={item.url} data-testid={`nav-${item.title.toLowerCase()}`}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}

                {character && (isViewingDocument || isViewingChart) && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link to={`/characters/${character.id}`} data-testid='nav-back-to-character'>
                        <ArrowLeft className='w-4 h-4' />
                        <span>Back to Character</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {character && (
            <>
              <SidebarGroup>
                <SidebarGroupLabel>Documents</SidebarGroupLabel>
                <SidebarGroupContent className='max-h-[min(200px,40vh)] min-h-0 overflow-y-auto overflow-x-hidden'>
                  <SidebarMenu>
                    {sortedDocuments.length === 0 ? (
                      <SidebarMenuItem>
                        <span className='px-2 py-1.5 text-xs text-muted-foreground'>
                          No documents
                        </span>
                      </SidebarMenuItem>
                    ) : (
                      sortedDocuments.map((doc) => (
                        <SidebarMenuItem
                          key={doc.id}
                          className={documentId === doc.id ? 'text-primary' : ''}>
                          <SidebarMenuButton asChild>
                            <Link
                              to={`/characters/${character.id}/documents/${doc.id}`}
                              data-testid={`nav-document-${doc.id}`}>
                              {doc.image ? (
                                <img
                                  src={doc.image}
                                  alt={doc.title}
                                  className='w-4 h-4 rounded-sm object-cover shrink-0'
                                />
                              ) : (
                                <FileText className='w-4 h-4 shrink-0' />
                              )}
                              <span className='truncate'>{doc.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
              <SidebarGroup>
                <SidebarGroupLabel>Charts</SidebarGroupLabel>
                <SidebarGroupContent className='max-h-[min(200px,40vh)] min-h-0 overflow-y-auto overflow-x-hidden'>
                  <SidebarMenu>
                    {sortedCharts.length === 0 ? (
                      <SidebarMenuItem>
                        <span className='px-2 py-1.5 text-xs text-muted-foreground'>No charts</span>
                      </SidebarMenuItem>
                    ) : (
                      sortedCharts.map((chart) => (
                        <SidebarMenuItem
                          key={chart.id}
                          className={chartId === chart.id ? 'text-primary' : ''}>
                          <SidebarMenuButton asChild>
                            <Link
                              to={`/characters/${character.id}/chart/${chart.id}`}
                              data-testid={`nav-chart-${chart.id}`}>
                              <FileSpreadsheet className='w-4 h-4 shrink-0' />
                              <span className='truncate'>{chart.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </>
          )}

          {/* {!isHomepage && (
            <SidebarMenuItem>
              <AssetManagerModal>
                <SidebarMenuButton>
                  <Image />
                  <span>Assets</span>
                </SidebarMenuButton>
              </AssetManagerModal>
            </SidebarMenuItem>
          )} */}
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            {!isHomepage && (
              <>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => setDicePanelOpen(true)}>
                    <Dices />
                    <span>Dice</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to='/rulesets'>
                      <FolderOpen />
                      <span>Open</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}
            <SidebarMenuItem>
              <DrawerTrigger asChild>
                <SidebarMenuButton onClick={() => setDrawerContent('settings')}>
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
            {localStorage.getItem('debug.tools') === 'true' && (
              <SidebarMenuItem>
                <DrawerTrigger asChild>
                  <SidebarMenuButton onClick={() => setDrawerContent('dev-tools')}>
                    <Wrench />
                    <span>Dev Tools</span>
                  </SidebarMenuButton>
                </DrawerTrigger>
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
        <DialogDescription className='hidden'>
          {drawerContent === 'settings' ? 'Settings' : 'Dev Tools'}
        </DialogDescription>
        <DrawerHeader>
          <DrawerTitle className='mb-4 text-lg font-medium'>
            {drawerContent === 'settings' ? 'Settings' : 'Dev Tools'}
          </DrawerTitle>
        </DrawerHeader>
        {drawerContent === 'settings' ? <Settings /> : <DevTools />}
      </DrawerContent>
    </Drawer>
  );
}
