import { FileSpreadsheet, FolderOpen, HandFist, Settings, Sword, UserRoundPen } from 'lucide-react';

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
import { Link, useLocation } from 'react-router-dom';
import { Avatar, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

export function AppSidebar() {
  const { currentUser, signOut } = useUsers();
  const { activeRuleset } = useRulesets();
  const { open } = useSidebar();
  const location = useLocation();
  const isHomepage = location.pathname === '/';

  console.log(activeRuleset);

  const rulesetItems = [
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

  const items = [
    {
      title: 'Settings',
      url: 'settings',
      icon: Settings,
    },
    {
      title: 'Open',
      url: '/',
      icon: FolderOpen,
    },
  ];

  if (!isHomepage) {
    items.unshift(...rulesetItems);
  }

  return (
    <Sidebar collapsible='icon'>
      <SidebarContent>
        <SidebarGroup>
          <div className='flex items-center justify-left'>
            <SidebarGroupLabel>{activeRuleset?.title ?? 'Quest Bound'}</SidebarGroupLabel>
            {open && <SidebarTrigger />}
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {!open && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <SidebarTrigger />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {items.map((item) => (
                <SidebarMenuItem
                  key={item.title}
                  className={`${location.pathname.includes(item.title.toLowerCase()) ? 'text-primary' : ''}`}>
                  <SidebarMenuButton asChild>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <Popover>
          <PopoverTrigger asChild>
            <div className={`p-${open ? 2 : 0} pb-2 flex items-center gap-2`}>
              <Avatar className={open ? 'rounded-lg' : 'rounded-sm'}>
                <AvatarImage src={currentUser?.avatar ?? ''} alt={currentUser?.username} />
              </Avatar>
              {open && <p>{currentUser?.username}</p>}
            </div>
          </PopoverTrigger>
          <PopoverContent>
            <div className='w-40 flex justify-center'>
              <Button variant='link' onClick={signOut}>
                Sign out
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </SidebarFooter>
    </Sidebar>
  );
}
