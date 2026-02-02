import {
  AppWindow,
  ArrowLeft,
  BookOpen,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  HandFist,
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
import { useActiveRuleset, useCharacter, useDocuments, useUsers } from '@/lib/compass-api';
import { DevTools, Settings } from '@/pages';
import { useEffect, useState } from 'react';
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
  const { open, setOpen } = useSidebar();
  const location = useLocation();
  const { documentId } = useParams<{ documentId: string }>();
  const isHomepage = location.pathname === '/rulesets' || location.pathname === '/characters';
  const isViewingDocument = !!documentId && location.pathname.includes('/documents/');
  const [drawerContent, setDrawerContent] = useState<'settings' | 'dev-tools'>('settings');

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

  return (
    <Drawer direction='bottom'>
      <Sidebar collapsible='icon'>
        <SidebarContent>
          <SidebarGroup>
            <div className='flex items-center justify-left'>
              <SidebarGroupLabel>
                {character?.name ?? activeRuleset?.title ?? 'Quest Bound'}
              </SidebarGroupLabel>
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

                {character && isViewingDocument && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link to={`/characters/${character.id}`} data-testid='nav-back-to-character'>
                        <ArrowLeft className='w-4 h-4' />
                        <span>Back to Character</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                {character && sortedDocuments.length > 0 && (
                  <>
                    {sortedDocuments.map((doc) => (
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
                                className='w-4 h-4 rounded-sm object-cover'
                              />
                            ) : (
                              <FileText className='w-4 h-4' />
                            )}
                            <span>{doc.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
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
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            {!isHomepage && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to='/rulesets'>
                    <FolderOpen />
                    <span>Open</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            <SidebarMenuItem>
              <DrawerTrigger asChild>
                <SidebarMenuButton onClick={() => setDrawerContent('settings')}>
                  <SettingsIcon />
                  <span>Settings</span>
                </SidebarMenuButton>
              </DrawerTrigger>
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
