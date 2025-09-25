import {
  FileSpreadsheet,
  FolderOpen,
  HandFist,
  Settings as SettingsIcon,
  Sword,
  UserRoundPen,
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
import { useRulesets, useUsers } from '@/lib/compass-api';
import { Settings } from '@/pages';
import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Avatar, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '../ui/drawer';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

export function AppSidebar() {
  const { currentUser, signOut } = useUsers();
  const { activeRuleset } = useRulesets();
  const { open, setOpen } = useSidebar();
  const location = useLocation();
  const isHomepage = location.pathname === '/';

  useEffect(() => {
    const storedState = localStorage.getItem('qb.sidebarCollapsed');
    if (storedState !== null) {
      setOpen(storedState === 'false');
    }
  }, []);

  const rulesetItems = isHomepage
    ? []
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
      ];

  return (
    <Drawer direction='bottom'>
      <Sidebar collapsible='icon'>
        <SidebarContent>
          <SidebarGroup>
            <div className='flex items-center justify-left'>
              <SidebarGroupLabel>{activeRuleset?.title ?? 'Quest Bound'}</SidebarGroupLabel>
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
                {rulesetItems.map((item) => (
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
                {!isHomepage && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link to='/'>
                        <FolderOpen />
                        <span>Open</span>
                      </Link>
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
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <Popover>
            <PopoverTrigger asChild>
              <div
                className={`p-${open ? 2 : 0} pb-2 flex items-center gap-2 cursor-pointer`}
                data-testid='user-menu'>
                <Avatar className={open ? 'rounded-lg' : 'rounded-sm'}>
                  <AvatarImage src={currentUser?.avatar ?? ''} alt={currentUser?.username} />
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
        <DrawerHeader>
          <DrawerTitle className='mb-4 text-lg font-medium'>Settings</DrawerTitle>
        </DrawerHeader>
        <Settings />
      </DrawerContent>
    </Drawer>
  );
}
