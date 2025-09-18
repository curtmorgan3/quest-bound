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
import { useUsers } from '@/lib/compass-api';
import { Link, useLocation } from 'react-router-dom';
import { Avatar, AvatarImage } from '../ui/avatar';
import { Text } from '../ui/text';

export function AppSidebar() {
  const { currentUser, signOut } = useUsers();
  const { open } = useSidebar();
  const location = useLocation();
  const isHomepage = location.pathname === '/';

  const rulesetItems = [
    {
      title: 'Attributes',
      url: 'attributes',
      icon: UserRoundPen,
    },
    {
      title: 'Actions',
      url: 'actions',
      icon: HandFist,
    },
    {
      title: 'Items',
      url: 'items',
      icon: Sword,
    },
    {
      title: 'Charts',
      url: 'charts',
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
            <SidebarGroupLabel>Quest Bound</SidebarGroupLabel>
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
                <SidebarMenuItem key={item.title}>
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
        <div className={`p-${open ? 2 : 0} pb-2 flex items-center gap-2`} onClick={signOut}>
          <Avatar className={open ? 'rounded-lg' : 'rounded-sm'}>
            <AvatarImage src={currentUser?.avatar ?? ''} alt={currentUser?.username} />
          </Avatar>
          {open && <Text variant='p'>{currentUser?.username}</Text>}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
